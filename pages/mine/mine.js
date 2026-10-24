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
        const user = Object.assign({}, this.data.user, data.user || {}, {
          openid: data.openid || (data.user && data.user.openid) || true
        })
        getApp().globalData.user = user
        this.setData({ user, wechatBound: true })
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
