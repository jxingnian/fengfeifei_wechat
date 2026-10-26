const { request } = require('./request.js')
const { MINI_APP_RECORD_ID, getWsBaseUrl } = require('./config.js')
function getWxCode() {
  return new Promise((resolve, reject) => wx.login({
    timeout: 10000,
    success: res => res.code ? resolve(res.code) : reject(Error('获取微信登录凭证失败')),
    fail: () => reject(Error('微信登录失败'))
  }))
}
const devicePath = id => '/api/devices/' + encodeURIComponent(id)
const miniDevicePath = id => '/api/mini/devices/' + encodeURIComponent(id)
function authRequest(action, data) {
  if (!MINI_APP_RECORD_ID || MINI_APP_RECORD_ID === '填入后台小程序应用ID') {
    return Promise.reject(new Error('请先配置后台小程序应用 ID'))
  }
  return request({ url: '/api/mini/auth/' + action, method: 'POST', auth: false,
    data: Object.assign({}, data, { appId: MINI_APP_RECORD_ID }) })
}
module.exports = {
  getWxCode,
  login(account, password) {
    return authRequest('login', { username: account, password })
  },
  register({ account, password, name }) {
    return authRequest('register', { username: account, password, nickname: name })
  },
  wechatLogin(code) { return authRequest('wechat-login', { code }) },
  getProfile() { return request({ url: '/api/mini/me' }) },
  logout() { return request({ url: '/api/mini/auth/logout', method: 'POST' }) },
  getDevices() { return request({ url: '/api/mini/devices' }) },
  getDevice(id) { return request({ url: miniDevicePath(id) }) },
  // 小程序只提交设备本地显示的临时授权码，后台根据当前登录用户完成设备创建和绑定。
  claimDevice(code) { return request({ url: '/api/mini/devices/claim', method: 'POST', data: { code } }) },
  updateDevice(id, patch) { return request({ url: miniDevicePath(id), method: 'PATCH', data: patch }) },
  unbindDevice(id) { return request({ url: miniDevicePath(id) + '/bind', method: 'DELETE' }) },
  sendText(id, text) { return request({ url: miniDevicePath(id) + '/chat', method: 'POST', data: { text } }) },
  createCallToken(id) { return request({ url: miniDevicePath(id) + '/call-token', method: 'POST' }) },
  createCall(id) { return request({ url: miniDevicePath(id) + '/calls', method: 'POST' }) },
  createRtcCall(id, options = {}) { return request({ url: miniDevicePath(id) + '/rtc-calls', method: 'POST', data: options, timeout: 25000 }) },
  heartbeatRtcCall(id) { return request({ url: '/api/mini/calls/' + encodeURIComponent(id) + '/heartbeat', method: 'POST' }) },
  endRtcCall(id) { return request({ url: '/api/mini/calls/' + encodeURIComponent(id) + '/end', method: 'POST' }) },
  createDeviceSession(id) {
    return request({ url: devicePath(id) + '/sessions', method: 'POST' }).then(result => ({
      ...result, url: result.url && /^wss?:\/\//.test(result.url) ? result.url : getWsBaseUrl() + (result.url || '')
    }))
  }
}
