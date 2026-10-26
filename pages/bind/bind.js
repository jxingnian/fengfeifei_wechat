const api = require('../../utils/api.js')
const { toast } = require('../../utils/util.js')

Page({
  data: { pairingCodes: [], loading: false },

  onLoad() {
    // 配对码属于登录后客户数据，未登录时不允许访问后台配对码列表。
    if (!getApp().isLogin()) wx.redirectTo({ url: '/pages/login/login' })
  },

  onShow() {
    this.loadPairingCodes()
  },

  async loadPairingCodes() {
    if (this.data.loading) return
    this.setData({ loading: true })
    try {
      // 该接口只读后台已创建的配对码，小程序不创建配对码，也不向后台提交配对码。
      const pairingCodes = await api.getPairingCodes()
      this.setData({ pairingCodes: pairingCodes || [] })
    } catch (error) {
      toast(error.message || '配对码加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  onRefresh() {
    this.loadPairingCodes()
  },
})
