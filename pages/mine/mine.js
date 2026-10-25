// pages/mine/mine.js
const { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } = require('../../utils/config.js')
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')

Page({
  data: {
    isLogin: false,
    user: {},
    wechatBound: false,
    baseUrl: '',
    deviceCount: 0
  },

  onShow() {
    const app = getApp()
    const user = app.globalData.user || {}
    this.setData({
      isLogin: app.isLogin(),
      user,
      wechatBound: !!(user.openid || user.wechatOpenid || user.wxBound),
      baseUrl: getBaseUrl(),
      deviceCount: store.list().length
    })
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onRegister() {
    wx.navigateTo({ url: '/pages/login/login?mode=register' })
  },

  onBindWechat() {
    wx.showLoading({ title: '绑定中', mask: true })
    api
      .getWxCode()
      .then((code) => api.wechatBind(code))
      .then((res) => {
        wx.hideLoading()
        const data = (res && res.data) || res || {}
        const user = data.user
        getApp().saveAuth(getApp().globalData.token, user)
        this.setData({ user, wechatBound: !!user.wxBound })
        toast('已绑定微信', 'success')
      })
      .catch((err) => {
        wx.hideLoading()
        toast((err && err.message) || '绑定失败')
      })
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
      content: '仅清除本机缓存，下次刷新会重新获取已绑定设备，不会解除绑定。',
      success: (res) => {
        if (!res.confirm) return
        store.clear()
        this.setData({ deviceCount: 0 })
        toast('已清除', 'success')
      }
    })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新登录才能管理设备',
      success: async (res) => {
        if (!res.confirm) return
        try { await api.logout() } catch (_) {}
        getApp().logout()
        this.setData({ isLogin: false, user: {} })
        wx.reLaunch({ url: '/pages/index/index' })
      }
    })
  }
})
