const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')
function parsePayload(text) {
  const raw = String(text || '').trim()
  try {
    const value = JSON.parse(raw)
    if (typeof value.deviceId === 'string' && /^\d{6}$/.test(value.code))
      return { deviceId: value.deviceId, code: value.code }
  } catch (_) {}
  const id = raw.match(/[?&]deviceId=([^&]+)/), code = raw.match(/[?&]code=(\d{6})(?:&|$)/)
  if (!id || !code) return null
  try { return { deviceId: decodeURIComponent(id[1]), code: code[1] } } catch (_) { return null }
}
Page({
  data: { deviceId: '', code: '', submitting: false },
  onLoad() { if (!getApp().isLogin()) wx.redirectTo({ url: '/pages/login/login' }) },
  onScan() {
    wx.scanCode({ success: res => {
      const data = parsePayload(res.result)
      if (!data) return toast('二维码需包含设备 ID 和用户绑定码')
      this.setData(data)
    } })
  },
  onDeviceId(e) { this.setData({ deviceId: e.detail.value }) },
  onCode(e) { this.setData({ code: e.detail.value }) },
  async onSubmit() {
    if (this.data.submitting) return
    const deviceId = this.data.deviceId.trim(), code = this.data.code.trim()
    if (!deviceId || !/^\d{6}$/.test(code)) return toast('请输入设备 ID 和 6 位用户绑定码')
    this.setData({ submitting: true })
    wx.showLoading({ title: '绑定中', mask: true })
    try {
      const result = await api.claimDevice(deviceId, code)
      store.upsert(result.device)
      toast('绑定成功', 'success')
      wx.navigateBack()
    } catch (error) { toast(error.message || '绑定失败') }
    finally { wx.hideLoading(); this.setData({ submitting: false }) }
  }
})
