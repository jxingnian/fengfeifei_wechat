const { request } = require('./request.js')
const { getWsBaseUrl } = require('./config.js')
function getWxCode() {
  return new Promise((resolve, reject) => wx.login({
    timeout: 10000,
    success: res => res.code ? resolve(res.code) : reject(Error('获取微信登录凭证失败')),
    fail: () => reject(Error('微信登录失败'))
  }))
}
const devicePath = id => '/api/devices/' + encodeURIComponent(id)
module.exports = {
  getWxCode,
  login(account, password) {
    return request({ url: '/api/auth/login', method: 'POST', data: { username: account, password }, auth: false })
  },
  register({ account, password, name }) {
    return request({ url: '/api/auth/register', method: 'POST', data: { username: account, password, name }, auth: false })
  },
  wechatLogin(payload) { return request({ url: '/api/auth/wechat/login', method: 'POST', data: payload, auth: false }) },
  wechatBind(code) { return request({ url: '/api/auth/wechat/bind', method: 'POST', data: { code } }) },
  getProfile() { return request({ url: '/api/auth/me' }) },
  logout() { return request({ url: '/api/auth/logout', method: 'POST' }) },
  getDevices() { return request({ url: '/api/devices' }) },
  getDevice(id) { return request({ url: devicePath(id) }) },
  claimDevice(deviceId, code) { return request({ url: '/api/devices/claim', method: 'POST', data: { deviceId, code } }) },
  updateDevice(id, patch) { return request({ url: devicePath(id), method: 'PATCH', data: patch }) },
  unbindDevice(id) { return request({ url: devicePath(id) + '/binding', method: 'DELETE' }) },
  sendText(id, text) { return request({ url: devicePath(id) + '/chat', method: 'POST', data: { text } }) },
  createCallToken(id) { return request({ url: devicePath(id) + '/call-token', method: 'POST' }) },
  createDeviceSession(id) {
    return request({ url: devicePath(id) + '/sessions', method: 'POST' }).then(result => ({
      ...result, url: result.url && /^wss?:\/\//.test(result.url) ? result.url : getWsBaseUrl() + (result.url || '')
    }))
  }
}
