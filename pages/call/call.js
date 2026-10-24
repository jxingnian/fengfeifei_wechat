// pages/call/call.js
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')

Page({
  data: {
    deviceId: '',
    title: '视频通话',
    initial: '设',
    statusText: '正在获取通话地址…',
    pushUrl: '',
    playUrl: '',
    room: '',
    muted: false,
    cameraOff: false,
    front: true
  },

  onLoad(query) {
    const deviceId = decodeURIComponent(query.deviceId || '')
    const device = store.get(deviceId) || getApp().getCurrentDevice(deviceId)
    if (!device) {
      toast('设备不存在，请重新绑定')
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const name = device.name || deviceId
    this.setData({
      deviceId,
      title: name,
      initial: name.slice(0, 1)
    })
    this.requestCall()
  },

  onUnload() {
    const app = getApp()
    if (app) app.setCurrentDevice(null)
  },

  requestCall() {
    this.setData({ statusText: '正在获取通话地址…' })
    wx.showLoading({ title: '呼叫中', mask: true })
    api
      .createCallToken(this.data.deviceId)
      .then((res) => {
        wx.hideLoading()
        const data = (res && res.data) || res || {}
        const pushUrl = data.pushUrl || data.pushurl || ''
        const playUrl = data.playUrl || data.playurl || data.url || ''
        this.setData({
          pushUrl,
          playUrl,
          room: data.room || '',
          statusText: pushUrl ? '通话中' : '服务端未返回通话地址'
        })
        if (!pushUrl) toast('未获取到推拉流地址')
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ statusText: '获取通话地址失败' })
        toast((err && err.message) || '获取通话地址失败')
      })
  },

  onRetry() {
    this.requestCall()
  },

  onToggleMute() {
    this.setData({ muted: !this.data.muted })
  },

  onSwitchCamera() {
    this.setData({ front: !this.data.front })
  },

  onHangup() {
    this.setData({ pushUrl: '', playUrl: '' })
    wx.navigateBack()
  },

  onPushState(e) {
    const code = e.detail && e.detail.code
    if (code === -1307) toast('推流连接失败')
  },

  onPushError() {
    toast('推流异常')
  },

  onPlayState(e) {
    const code = e.detail && e.detail.code
    if (code === 2004) this.setData({ statusText: '通话中' })
    if (code === -2301) toast('拉流连接失败')
  },

  onPlayError() {
    toast('拉流异常')
  }
})
