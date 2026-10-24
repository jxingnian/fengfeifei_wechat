// pages/login/login.js
const api = require('../../utils/api.js')
const { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } = require('../../utils/config.js')
const { toast } = require('../../utils/util.js')

function pickAuth(res, fallbackName) {
  const data = (res && res.data) || res || {}
  const token = data.token || data.accessToken || (data.session && data.session.token) || ''
  const user = data.user || data.profile || null
  return {
    token,
    user: user || { account: fallbackName || '', name: fallbackName || '' }
  }
}

Page({
  data: {
    mode: 'login', // login | register
    account: '',
    password: '',
    confirmPassword: '',
    name: '',
    showPassword: false,
    baseUrl: '',
    loading: false,
    wxLoading: false
  },

  onLoad(query) {
    const app = getApp()
    const user = app.globalData.user || {}
    this.setData({
      mode: query && query.mode === 'register' ? 'register' : 'login',
      account: user.account || '',
      baseUrl: getBaseUrl()
    })
  },

  onSwitch(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode, confirmPassword: '', name: '' })
  },

  onAccount(e) {
    this.setData({ account: e.detail.value })
  },

  onPassword(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmPassword(e) {
    this.setData({ confirmPassword: e.detail.value })
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  onBaseUrl(e) {
    this.setData({ baseUrl: setBaseUrl(e.detail.value) })
  },

  onResetBaseUrl() {
    this.setData({ baseUrl: setBaseUrl(DEFAULT_BASE_URL) })
  },

  validate(mode) {
    const account = (this.data.account || '').trim()
    const password = this.data.password || ''
    if (!account) {
      toast('请输入账号')
      return null
    }
    if (account.length < 3 || account.length > 32) {
      toast('账号长度需为 3-32 位')
      return null
    }
    if (!password) {
      toast('请输入密码')
      return null
    }
    if (password.length < 8) {
      toast('密码至少 8 位')
      return null
    }
    if (mode === 'register') {
      if (password !== this.data.confirmPassword) {
        toast('两次输入的密码不一致')
        return null
      }
      return { account, password, name: (this.data.name || '').trim() }
    }
    return { account, password }
  },

  onSubmit() {
    if (this.data.loading) return
    const mode = this.data.mode
    const payload = this.validate(mode)
    if (!payload) return

    this.setData({ loading: true })
    wx.showLoading({ title: mode === 'register' ? '注册中' : '登录中', mask: true })

    const task = mode === 'register' ? api.register(payload) : api.login(payload.account, payload.password)

    task
      .then((res) => {
        const auth = pickAuth(res, payload.account)
        // 注册接口可能不返回令牌，此时切到登录流程
        if (mode === 'register' && !auth.token) {
          wx.hideLoading()
          this.setData({ mode: 'login', loading: false, confirmPassword: '' })
          toast('注册成功，请登录', 'success')
          return
        }
        if (!auth.token) throw new Error('服务端未返回登录令牌')
        this.finishLogin(auth)
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ loading: false })
        toast((err && err.message) || (mode === 'register' ? '注册失败' : '登录失败'))
      })
  },

  // 微信一键登录：wx.login 取 code，交由后端换取 openid 并签发令牌
  onWechatLogin() {
    if (this.data.wxLoading || this.data.loading) return
    this.setData({ wxLoading: true })
    wx.showLoading({ title: '微信登录中', mask: true })

    api
      .getWxCode()
      .then((code) => api.wechatLogin({ code }))
      .then((res) => {
        const auth = pickAuth(res, '')
        if (!auth.token) throw new Error('服务端未返回登录令牌')
        this.finishLogin(auth)
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ wxLoading: false })
        toast((err && err.message) || '微信登录失败')
      })
  },

  finishLogin(auth) {
    wx.hideLoading()
    this.setData({ loading: false, wxLoading: false })
    getApp().saveAuth(auth.token, auth.user)
    toast('登录成功', 'success')
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) wx.navigateBack()
      else wx.reLaunch({ url: '/pages/index/index' })
    }, 600)
  }
})
