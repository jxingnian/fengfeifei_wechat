// utils/config.js —— 服务地址配置
const BASE_URL_KEY = 'ff_base_url'

// 测试服务器，可在「我的 - 服务地址」中修改
const DEFAULT_BASE_URL = 'http://111.228.3.219:8080'

function normalize(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function getBaseUrl() {
  let url = ''
  try {
    url = wx.getStorageSync(BASE_URL_KEY) || ''
  } catch (e) {}
  return normalize(url) || DEFAULT_BASE_URL
}

function setBaseUrl(url) {
  const value = normalize(url)
  if ((value || DEFAULT_BASE_URL) !== getBaseUrl()) {
    const app = getApp()
    if (app && app.logout) app.logout()
  }
  try {
    if (value) wx.setStorageSync(BASE_URL_KEY, value)
    else wx.removeStorageSync(BASE_URL_KEY)
  } catch (e) {}
  return value || DEFAULT_BASE_URL
}

// http(s) -> ws(s)
function getWsBaseUrl() {
  const base = getBaseUrl()
  if (base.indexOf('https://') === 0) return 'wss://' + base.slice(8)
  if (base.indexOf('http://') === 0) return 'ws://' + base.slice(7)
  return base
}

module.exports = { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl, getWsBaseUrl }
