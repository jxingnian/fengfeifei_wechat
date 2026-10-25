// Only this adapter knows about WeChat live-pusher/live-player and stream URLs.
class NativeRtmpTransport {
  constructor(host) {
    this.host = host
    this.closed = false
    this.pushReady = false
    this.playReady = false
    this.audioReady = false
    this.playerStarted = false
    this.retries = 0
  }
  async start(connection) {
    const options = connection.options || {}
    if (!/^rtmp:\/\//.test(options.pushUrl || '') || !/^https?:\/\//.test(options.playUrl || '')) throw Error('音视频地址无效，请检查后台配置')
    if (connection.publish.video || !connection.publish.audio) throw Error('不支持的设备通话媒体配置')
    await this.host.render({ rtcTransport: 'native-rtmp', mediaMounted: true, pushUrl: options.pushUrl, playUrl: options.playUrl })
    if (this.closed) return
    const component = this.host.mediaHost()
    if (!component) throw Error('通话组件尚未就绪')
    this.pusher = wx.createLivePusherContext('call-pusher', component)
    this.player = wx.createLivePlayerContext('call-player', component)
    this.pusher.start({ fail: () => this.fail('麦克风推流启动失败，请检查权限和小程序类目') })
  }
  updateStatus(status) {
    if (this.closed || !status.media?.downlink || this.playerStarted) return
    this.playerStarted = true
    this.player.play({ fail: () => this.retryPlayer() })
  }
  ready() { return this.pushReady && this.playReady && this.audioReady }
  setMuted(muted) { return this.host.render({ muted }) }
  onEvent(kind, event) {
    if (this.closed) return
    const code = Number((event.detail || {}).code)
    if (kind === 'push-state') {
      if (code === 1002) { this.pushReady = true; this.host.onMediaChanged() }
      if (code === 1102) { this.pushReady = false; this.host.onMediaChanged() }
      if (code < 0 || code === 5000 || code === 5001) this.fail('麦克风推流中断，请重新呼叫')
    }
    if (kind === 'play-state') {
      if (code === 2003) { this.playReady = true; this.retries = 0; this.host.onMediaChanged() }
      if (code === 2026) { this.audioReady = true; this.host.onMediaChanged() }
      if (code === -2301 || code === -2302) this.retryPlayer()
      else if (code < 0 || code === 6000) this.fail('设备画面播放中断，请重新呼叫')
    }
    if (kind === 'push-error') this.fail('麦克风不可用，请检查录音授权和小程序推流权限')
    if (kind === 'play-error') this.retryPlayer()
  }
  retryPlayer() {
    if (this.closed || !this.playerStarted || this.retryTimer) return
    this.playReady = false; this.audioReady = false; this.host.onMediaChanged()
    if (++this.retries > 3) { this.fail('设备音视频播放失败，请检查网络后重新呼叫'); return }
    this.retryTimer = setTimeout(() => { this.retryTimer = null; if (!this.closed) this.player.play({ fail: () => this.retryPlayer() }) }, 1000)
  }
  fail(message) { if (!this.closed) this.host.onError(Error(message)) }
  close() {
    if (this.closed) return
    this.closed = true; clearTimeout(this.retryTimer)
    try { if (this.pusher) this.pusher.stop({}) } catch (_) {}
    try { if (this.player) this.player.stop({}) } catch (_) {}
    return this.host.render({ mediaMounted: false, pushUrl: '', playUrl: '', rtcTransport: '' })
  }
}
module.exports = NativeRtmpTransport
