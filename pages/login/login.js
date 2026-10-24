// pages/login/login.js
const api = require('../../utils/api.js')
const { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } = require('../../utils/config.js')
const { toast } = require('../../utils/util.js')

function pickAuth(res, account) {
  const data = (res && res.data) || res || {}
  const token = data.token || data.accessToken || (data.session && data.session.token) || ''
  const user = data.user || data.profile || null
  return {
    token,
    user: user || { account: account, name: account }
  }
}

Page({
  data: {
    account: '',
    password: '',
    showPassword: false,
    baseUrl: '',
    loading: false
  },

  onLoad() {
    const app = getApp()
    const user = app.globalData.user || {}
    this.setData({
      account: user.account || '',
      baseUrl: getBaseUrl()
    })
  },

  onAccount(e) {
    this.setData({ account: e.detail.value })
  },

  onPassword(e) {
    this.setData({ password: e.detail.value })
  },

  onBaseUrl(e) {
    this.setData({ baseUrl: setBaseUrl(e.detail.value) })
  },

  onResetBaseUrl() {
    this.setData({ baseUrl: setBaseUrl(DEFAULT_BASE_URL) })
  },

  onSubmit() {
    if (this.data.loading) return
    const account = (this.data.account || '').trim()
    const password = this.data.password || ''
    if (!account) {
      toast('请输入账号')
      return
    }
    if (!password) {
      toast('请输入密码')
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '登录中', mask: true })
    api
      .login(account, password)
      .then((res) => {
        const auth = pickAuth(res, account)
        if (!auth.token) {
          throw new Error('服务端未返回登录令牌')
        }
        const app = getApp()
        app.saveAuth(auth.token, auth.user)
        wx.hideLoading()
        toast('登录成功', 'success')
        this.setData({ loading: false })
        setTimeout(() => {
          const pages = getCurrentPages()
          if (pages.length > 1) wx.navigateBack()
          else wx.reLaunch({ url: '/pages/index/index' })
        }, 600)
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ loading: false })
        toast((err && err.message) || '登录失败')
      })
  }
})
