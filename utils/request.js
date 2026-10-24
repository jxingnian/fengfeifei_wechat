// utils/request.js —— 统一 HTTP 请求封装
const { getBaseUrl } = require('./config.js')
const { getToken } = require('./auth.js')

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url
  return getBaseUrl() + (url.charAt(0) === '/' ? url : '/' + url)
}

function pickMessage(res, fallback) {
  const data = res && res.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  return data.message || data.error || data.msg || fallback
}

/**
 * @param {Object} options
 *  url 必填；method 默认 GET；auth 默认 true（带 Bearer token）
 * @returns {Promise<any>} 服务端返回的 data
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    auth = true,
    timeout = 20000,
    deviceAuth = null // { deviceId, deviceToken } 设备侧接口
  } = options

  const finalHeader = Object.assign({ 'Content-Type': 'application/json' }, header)
  if (auth) {
    const token = getToken()
    if (token) finalHeader.Authorization = 'Bearer ' + token
  }
  if (deviceAuth && deviceAuth.deviceId) {
    finalHeader['X-Device-Id'] = deviceAuth.deviceId
    finalHeader['X-Device-Token'] = deviceAuth.deviceToken || ''
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(url),
      method,
      data: data || {},
      header: finalHeader,
      timeout,
      success(res) {
        const status = res.statusCode
        if (status >= 200 && status < 300) {
          resolve(res.data)
          return
        }
        if (status === 401) {
          const app = getApp()
          if (app && app.onUnauthorized) app.onUnauthorized()
          reject(new Error(pickMessage(res, '登录已失效')))
          return
        }
        reject(new Error(pickMessage(res, '请求失败（' + status + '）')))
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络异常，请检查服务地址'))
      }
    })
  })
}

module.exports = { request, buildUrl }
