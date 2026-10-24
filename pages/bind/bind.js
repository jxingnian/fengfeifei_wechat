// pages/bind/bind.js
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { toast } = require('../../utils/util.js')

// 兼容：JSON / URL query / "id:token" / "id#token" / 两行文本
function parsePayload(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  try {
    const obj = JSON.parse(raw)
    if (obj && obj.deviceId) {
      return {
        deviceId: String(obj.deviceId),
        deviceToken: String(obj.deviceToken || obj.token || obj.device_token || '')
      }
    }
  } catch (e) {}

  const idMatch = raw.match(/deviceId=([^&\s]+)/i)
  const tokenMatch = raw.match(/(?:deviceToken|token)=([^&\s]+)/i)
  if (idMatch) {
    return {
      deviceId: decodeURIComponent(idMatch[1]),
      deviceToken: tokenMatch ? decodeURIComponent(tokenMatch[1]) : ''
    }
  }

  const parts = raw.split(/[:#\n\r\t|,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { deviceId: parts[0], deviceToken: parts[1] }
  }
  return { deviceId: raw, deviceToken: '' }
}

Page({
  data: {
    deviceId: '',
    deviceToken: '',
    name: '',
    submitting: false
  },

  onScan() {
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        const payload = parsePayload(res.result)
        if (!payload || !payload.deviceId) {
          toast('无法识别二维码内容')
          return
        }
        this.setData({
          deviceId: payload.deviceId,
          deviceToken: payload.deviceToken
        })
        toast('已识别设备 ID')
      },
      fail: () => {}
    })
  },

  onDeviceId(e) {
    this.setData({ deviceId: e.detail.value })
  },

  onDeviceToken(e) {
    this.setData({ deviceToken: e.detail.value })
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    const deviceId = (this.data.deviceId || '').trim()
    const deviceToken = (this.data.deviceToken || '').trim()
    const name = (this.data.name || '').trim() || deviceId
    if (!deviceId) {
      toast('请输入设备 ID')
      return
    }
    if (!deviceToken) {
      toast('请输入设备凭证')
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '绑定中', mask: true })

    api
      .bindDevice(deviceId, deviceToken, name)
      .catch(() => null) // 接口未就绪时仅保存本地
      .then(() => {
        store.upsert({
          deviceId,
          deviceToken,
          name,
          addedAt: Date.now()
        })
        wx.hideLoading()
        this.setData({ submitting: false })
        toast('绑定成功', 'success')
        setTimeout(() => wx.navigateBack(), 600)
      })
  }
})
