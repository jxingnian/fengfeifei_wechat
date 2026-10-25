const api = require('../api.js')
const { createTransport } = require('./transports/index.js')
const { getToken } = require('../auth.js')
const { getBaseUrl } = require('../config.js')

// Owns signaling/lifetime; page and transports never implement heartbeat or hangup.
class RtcClient {
  constructor(host, dependencies = {}) {
    this.host = host; this.api = dependencies.api || api
    this.createTransport = dependencies.createTransport || createTransport
    this.closed = false; this.generation = 0
    this.origin = getBaseUrl(); this.token = getToken()
  }
  sameSession() { return this.origin === getBaseUrl() && this.token === getToken() }
  async start(deviceId, options = {}) {
    if (this.closed) return
    if (!this.sameSession()) { this.finish('登录账号或服务地址已变化'); return }
    const generation = ++this.generation
    try {
      const result = await this.api.createRtcCall(deviceId, options)
      if (this.closed || generation !== this.generation) {
        if (this.sameSession()) void this.api.endRtcCall(result.callId).catch(() => {})
        return
      }
      this.callId = result.callId
      if (!this.callId || !result.client) throw Error('后台返回的通话信息无效')
      this.snapshot = result
      this.transport = this.createTransport(result.client.transport, {
        mediaHost: this.host.mediaHost, render: patch => this.host.render(patch),
        onError: error => this.finish(error.message), onMediaChanged: () => this.updateState()
      })
      await this.transport.start(result.client)
      if (this.closed || generation !== this.generation) return
      this.timer = setTimeout(() => this.poll(), 0)
      this.deadline = setTimeout(() => this.finish('音视频连接超时，请重新呼叫'), 65000)
      this.updateState()
    } catch (error) { if (!this.closed && generation === this.generation) this.finish(error.message || '呼叫失败') }
  }
  async poll() {
    if (this.closed || !this.callId) return
    if (!this.sameSession()) { this.finish('登录账号或服务地址已变化'); return }
    try {
      const status = await this.api.heartbeatRtcCall(this.callId)
      if (this.closed) return
      this.snapshot = status
      if (status.state === 'ended') {
        const reasons = { timeout: '设备未接听', setup_timeout: '音视频连接超时', media_timeout: '音视频连接超时',
          access_revoked: '设备授权已失效', rejected: '设备拒绝通话', device_disconnected: '设备已离线' }
        this.finish(reasons[status.reason] || '通话已结束'); return
      }
      this.transport.updateStatus(status); this.updateState()
      if (this.closed) return
      this.timer = setTimeout(() => this.poll(), 4000)
    } catch (error) { if (!this.closed) this.finish(error.message || '通话连接中断') }
  }
  updateState() {
    if (this.closed) return
    const state = this.snapshot?.state
    const connected = state === 'connected' && this.transport && this.transport.ready()
    if (connected) clearTimeout(this.deadline)
    this.host.render({ connected: !!connected, statusText: connected ? '通话中' : state === 'ringing' ? '等待设备接听…' : '正在连接音视频…' })
  }
  onEvent(kind, event) { if (!this.closed && this.transport) this.transport.onEvent(kind, event) }
  setMuted(muted) { if (!this.closed && this.transport) return this.transport.setMuted(muted) }
  finish(message = '通话已结束') {
    if (this.closed) return
    this.closed = true; ++this.generation; clearTimeout(this.timer); clearTimeout(this.deadline)
    try { if (this.transport) this.transport.close() } catch (_) {}
    const callId = this.callId; this.callId = null
    if (callId && this.sameSession()) void this.api.endRtcCall(callId).catch(() => {})
    this.host.render({ connected: false, ended: true, statusText: message })
  }
}
module.exports = RtcClient
