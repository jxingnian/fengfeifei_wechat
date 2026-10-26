const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')

Page({
  data: { code: '', submitting: false },

  onLoad() {
    if (!getApp().isLogin()) wx.redirectTo({ url: '/pages/login/login' })
  },

  // 设备连接后台后会在本地状态页显示 6 位授权码，小程序只需要录入这个码。
  onCode(e) { this.setData({ code: e.detail.value.replace(/\D/g, '').slice(0, 6) }) },

  async onSubmit() {
    if (this.data.submitting) return
    const code = this.data.code.trim()
    if (!/^\d{6}$/.test(code)) return toast('请输入设备显示的 6 位授权码')
    this.setData({ submitting: true })
    wx.showLoading({ title: '绑定中', mask: true })
    try {
      const result = await api.claimDevice(code)
      store.upsert(result.device)
      toast('绑定成功', 'success')
      wx.navigateBack()
    } catch (error) {
      toast(error.message || '绑定失败')
    } finally {
      wx.hideLoading()
      this.setData({ submitting: false })
    }
  }
})
