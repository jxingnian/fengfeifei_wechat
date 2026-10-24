// utils/api.js —— 接口定义
// 说明：以下路径为按后端现有文档（设备凭证、/api/device/config、/ws/device、LiveKit 令牌）
// 推导的占位实现。接口文档确认后只需修改本文件，页面层无需改动。
const { request } = require('./request.js')
const { getWsBaseUrl } = require('./config.js')

const api = {
  // ---------- 账号 / 客户 ----------
  // 登录：POST /api/auth/login { account, password } -> { token, user }
  login(account, password) {
    return request({
      url: '/api/auth/login',
      method: 'POST',
      data: { account, password },
      auth: false
    })
  },

  // 当前登录用户：GET /api/auth/me
  getProfile() {
    return request({ url: '/api/auth/me' })
  },

  // ---------- 设备 ----------
  // 设备列表：GET /api/devices -> [{ deviceId, name, online, lastSeenAt, volume, personaId }]
  getDevices() {
    return request({ url: '/api/devices' })
  },

  // 绑定设备：POST /api/devices { deviceId, deviceToken, name }
  bindDevice(deviceId, deviceToken, name) {
    return request({
      url: '/api/devices',
      method: 'POST',
      data: { deviceId, deviceToken, name }
    })
  },

  // 设备详情/状态：GET /api/devices/:deviceId
  getDevice(deviceId) {
    return request({ url: '/api/devices/' + encodeURIComponent(deviceId) })
  },

  // 修改设备：PATCH /api/devices/:deviceId { name?, volume?, personaId? }
  updateDevice(deviceId, patch) {
    return request({
      url: '/api/devices/' + encodeURIComponent(deviceId),
      method: 'PATCH',
      data: patch
    })
  },

  // 解绑：DELETE /api/devices/:deviceId
  unbindDevice(deviceId) {
    return request({
      url: '/api/devices/' + encodeURIComponent(deviceId),
      method: 'DELETE'
    })
  },

  // 设备侧配置（文档已确认）：GET /api/device/config + X-Device-Id / X-Device-Token
  getDeviceConfig(deviceId, deviceToken) {
    return request({
      url: '/api/device/config',
      auth: false,
      deviceAuth: { deviceId, deviceToken }
    })
  },

  // 角色/音色列表：GET /api/personas -> [{ id, name }]
  getPersonas() {
    return request({ url: '/api/personas' })
  },

  // 文本下发（如后端支持）：POST /api/devices/:deviceId/message { text }
  sendText(deviceId, text) {
    return request({
      url: '/api/devices/' + encodeURIComponent(deviceId) + '/message',
      method: 'POST',
      data: { text }
    })
  },

  // ---------- 音视频通话 ----------
  // 通话令牌：POST /api/devices/:deviceId/call-token -> { room, token, pushUrl, playUrl }
  createCallToken(deviceId) {
    return request({
      url: '/api/devices/' + encodeURIComponent(deviceId) + '/call-token',
      method: 'POST'
    })
  },

  // 设备实时语音 WebSocket（文档已确认）
  getDeviceWsUrl(deviceId, deviceToken) {
    return (
      getWsBaseUrl() +
      '/ws/device?deviceId=' +
      encodeURIComponent(deviceId) +
      '&token=' +
      encodeURIComponent(deviceToken || '')
    )
  }
}

module.exports = api
