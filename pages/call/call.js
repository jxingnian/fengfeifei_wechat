const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const PcmRecorder = require('../../utils/pcm-recorder.js')
const PcmPlayer = require('../../utils/pcm-player.js')
const { getWsBaseUrl } = require('../../utils/config.js')
const { toast } = require('../../utils/util.js')

Page({
  data: { deviceId: '', title: '设备通话', initial: '设', statusText: '正在呼叫设备...', muted: false, connected: false },
  onLoad(query) {
    const deviceId = decodeURIComponent(query.deviceId || '')
    const device = store.get(deviceId) || getApp().getCurrentDevice(deviceId)
    if (!device) { toast('设备不存在，请重新绑定'); setTimeout(() => wx.navigateBack(), 800); return }
    const title = device.name || deviceId
    this.setData({ deviceId, title, initial: title.slice(0, 1) })
    this.player = new PcmPlayer({ sampleRate: 16000 })
    this.recorder = new PcmRecorder({ sampleRate: 16000, frameSize: 1, onData: (data) => { if (this.socket && this.data.connected && !this.data.muted) this.socket.send({ data }) }, onError: (message) => toast(message) })
    this.startCall()
  },
  async startCall() {
    try {
      const result = await api.createCall(this.data.deviceId)
      const data = result.data || result
      this.callId = data.callId
      this.socket = wx.connectSocket({ url: getWsBaseUrl() + data.url })
      this.socket.onOpen(() => this.setData({ statusText: '等待设备接听...' }))
      this.socket.onMessage((res) => {
        if (res.data instanceof ArrayBuffer) { if (this.data.connected) this.player.feed(res.data); return }
        let message; try { message = JSON.parse(res.data) } catch (_) { return }
        if (message.type === 'call_ringing') this.setData({ statusText: '设备响铃中...' })
        if (message.type === 'call_connected') this.onConnected()
        if (message.type === 'call_end') this.finish(message.reason === 'timeout' ? '设备未接听' : '通话已结束')
      })
      this.socket.onError(() => this.finish('通话连接失败'))
      this.socket.onClose(() => { if (this.data.connected) this.finish('通话连接断开') })
    } catch (error) { this.finish((error && error.message) || '呼叫失败') }
  },
  async onConnected() {
    if (this.data.connected) return
    this.setData({ connected: true, statusText: '通话中' })
    try { await this.recorder.start() } catch (error) { this.finish(error.message || '麦克风启动失败') }
  },
  onToggleMute() { this.setData({ muted: !this.data.muted }) },
  onHangup() { if (this.socket) this.socket.send({ data: JSON.stringify({ type: 'hangup' }) }); this.finish('通话已结束') },
  finish(message) {
    if (this.finished) return
    this.finished = true
    if (this.recorder) this.recorder.stop()
    if (this.player) this.player.destroy()
    if (this.socket) { try { this.socket.close({ code: 1000 }) } catch (_) {} }
    this.setData({ connected: false, statusText: message || '通话结束' })
    if (message && message !== '通话已结束') toast(message)
  },
  onUnload() { this.finish('通话已结束') }
})
