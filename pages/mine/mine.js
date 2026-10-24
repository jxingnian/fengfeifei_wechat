// pages/mine/mine.js
const { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } = require('../../utils/config.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')

Page({
  data: {
    isLogin: false,
    user: {},
    baseUrl: '',
    deviceCount: 0
  },

  onShow() {
    const app = getApp()
    this.setData({
      isLogin: app.isLogin(),
      user: app.globalData.user || {},
      baseUrl: getBaseUrl(),
      deviceCount: store.list().length
    })
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onBaseUrl(e) {
    this.setData({ baseUrl: setBaseUrl(e.detail.value) })
  },

  onResetBaseUrl() {
    this.setData({ baseUrl: setBaseUrl(DEFAULT_BASE_URL) })
    toast('已恢复默认地址')
  },

  onClearDevices() {
    wx.showModal({
      title: '清除本地设备',
      content: '将删除本机保存的设备凭证，需重新扫码绑定',
      success: (res) => {
        if (!res.confirm) return
        store.list().forEach((item) => store.remove(item.deviceId))
        this.setData({ deviceCount: 0 })
        toast('已清除', 'success')
      }
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录才能管理设备',
      success: (res) => {
        if (!res.confirm) return
        getApp().logout()
        this.setData({ isLogin: false, user: {} })
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
  }
})
