// app.js
const { getToken, setToken, clearAuth, getUser, setUser } = require('./utils/auth.js')

App({
  globalData: {
    token: '',
    user: null,
    devices: [],
    // 设备页 <-> 对话页之间传递当前设备
    currentDevice: null
  },

  onLaunch() {
    wx.removeStorageSync('ff_devices')
    this.globalData.token = getToken() || ''
    this.globalData.user = getUser() || null
  },

  isLogin() {
    return !!this.globalData.token
  },

  saveAuth(token, user) {
    if (!user || !user.id) throw Error('服务端返回的小程序用户无效')
    this.globalData.token = token || ''
    this.globalData.user = user || null
    setToken(this.globalData.token)
    setUser(this.globalData.user)
  },

  logout() {
    require('./utils/device-store.js').clear()
    clearAuth()
    this.globalData.token = ''
    this.globalData.user = null
    this.globalData.devices = []
    this.globalData.currentDevice = null
  },

  // 请求层在收到 401 时回调
  onUnauthorized() {
    if (!this.globalData.token) return
    this.logout()
    const pages = getCurrentPages()
    const current = pages && pages[pages.length - 1]
    if (current && current.route !== 'pages/login/login') {
      wx.showToast({ icon: 'none', title: '登录已失效，请重新登录' })
      wx.navigateTo({ url: '/pages/login/login' })
    }
  },

  setCurrentDevice(device) {
    this.globalData.currentDevice = device || null
  },

  getCurrentDevice(deviceId) {
    if (deviceId) {
      const hit = (this.globalData.devices || []).find((d) => d.deviceId === deviceId)
      if (hit) return hit
    }
    return this.globalData.currentDevice
  }
})
