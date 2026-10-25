const store = require('../../utils/device-store.js')
const RtcClient = require('../../utils/rtc/client.js')
const { toast } = require('../../utils/util.js')

Page({
  data: { deviceId: '', title: '设备通话', initial: '设', statusText: '正在准备通话…', muted: false,
    connected: false, ended: false, rtcTransport: '', mediaMounted: false, pushUrl: '', playUrl: '' },
  async onLoad(query) {
    const deviceId = decodeURIComponent(query.deviceId || '')
    const device = store.get(deviceId) || getApp().getCurrentDevice(deviceId)
    if (!device) { this.setData({ ended: true, statusText: '设备不存在，请重新绑定' }); toast('设备不存在，请重新绑定'); return }
    const title = device.name || deviceId
    this.setData({ deviceId, title, initial: title.slice(0, 1) })
    this.client = new RtcClient({ mediaHost: () => this.selectComponent('#rtc-media'), render: patch => new Promise(resolve => {
      if (this.unloaded) { resolve(); return }
      this.setData(patch, resolve)
    }) })
    try {
      // No camera permission is requested. Video always comes from the device.
      await new Promise((resolve, reject) => wx.authorize({ scope: 'scope.record', success: resolve, fail: reject }))
      if (!this.hidden && !this.unloaded) await this.client.start(deviceId)
    } catch (_) { if (!this.unloaded) this.client.finish('请允许使用麦克风后重新呼叫') }
  },
  onShow() { this.hidden = false },
  onTransportEvent(e) { this.client && this.client.onEvent(e.detail.kind, { detail: e.detail.detail }) },
  onToggleMute() { if (this.client && !this.data.ended) this.client.setMuted(!this.data.muted) },
  onHangup() { if (this.client) this.client.finish() },
  onHide() { this.hidden = true; if (this.client) this.client.finish('通话已结束') },
  onUnload() { this.unloaded = true; if (this.client) this.client.finish() }
})
