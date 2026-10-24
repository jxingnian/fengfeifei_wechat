// pages/index/index.js
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { formatTime, maskId, toast } = require('../../utils/util.js')

Page({
  data: {
    isLogin: false,
    devices: [],
    loading: false
  },

  onShow() {
    const app = getApp()
    this.setData({ isLogin: app.isLogin() })
    if (app.isLogin()) this.loadDevices()
    else this.setData({ devices: [], loading: false })
  },

  onPullDownRefresh() {
    if (!getApp().isLogin()) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadDevices(true)
  },

  loadDevices(silent) {
    const app = getApp()
    this.setData({ loading: !silent })
    let list = store.list().map((item) => ({
      deviceId: item.deviceId,
      name: item.name || item.deviceId,
      deviceToken: item.deviceToken,
      online: !!item.online,
      onlineKnown: typeof item.online === 'boolean',
      lastSeenText: formatTime(item.lastSeenAt),
      maskId: maskId(item.deviceId)
    }))
    this.setData({ devices: list })
    app.globalData.devices = list

    api
      .getDevices()
      .then((res) => {
        const arr = Array.isArray(res) ? res : res && res.devices
        if (!Array.isArray(arr)) return
        list = store.mergeServerList(arr).map((item) => ({
          deviceId: item.deviceId,
          name: item.name || item.deviceId,
          deviceToken: item.deviceToken,
          online: !!item.online,
          onlineKnown: typeof item.online === 'boolean',
          lastSeenText: formatTime(item.lastSeenAt),
          maskId: maskId(item.deviceId)
        }))
        this.setData({ devices: list })
        app.globalData.devices = list
      })
      .catch(() => {
        // 接口未就绪时保持本地列表
      })
      .then(() => {
        this.setData({ loading: false })
        wx.stopPullDownRefresh()
      })
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onRegister() {
    wx.navigateTo({ url: '/pages/login/login?mode=register' })
  },

  onAdd() {
    if (!getApp().isLogin()) {
      this.onLogin()
      return
    }
    wx.navigateTo({ url: '/pages/bind/bind' })
  },

  onMine() {
    wx.navigateTo({ url: '/pages/mine/mine' })
  },

  onOpenChat(e) {
    const id = e.currentTarget.dataset.id
    const device = store.get(id)
    if (!device) {
      toast('设备信息缺失，请重新绑定')
      return
    }
    getApp().setCurrentDevice(device)
    wx.navigateTo({ url: '/pages/chat/chat?deviceId=' + encodeURIComponent(id) })
  },

  onOpenDevice(e) {
    const id = e.currentTarget.dataset.id
    getApp().setCurrentDevice(store.get(id))
    wx.navigateTo({ url: '/pages/device/device?deviceId=' + encodeURIComponent(id) })
  },

  onOpenCall(e) {
    const id = e.currentTarget.dataset.id
    getApp().setCurrentDevice(store.get(id))
    wx.navigateTo({ url: '/pages/call/call?deviceId=' + encodeURIComponent(id) })
  }
})
