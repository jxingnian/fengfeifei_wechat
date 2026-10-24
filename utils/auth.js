// utils/auth.js —— 登录态本地存储
const TOKEN_KEY = 'ff_token'
const USER_KEY = 'ff_user'

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setToken(token) {
  try {
    if (token) wx.setStorageSync(TOKEN_KEY, token)
    else wx.removeStorageSync(TOKEN_KEY)
  } catch (e) {}
}

function getUser() {
  try {
    return wx.getStorageSync(USER_KEY) || null
  } catch (e) {
    return null
  }
}

function setUser(user) {
  try {
    if (user) wx.setStorageSync(USER_KEY, user)
    else wx.removeStorageSync(USER_KEY)
  } catch (e) {}
}

function clearAuth() {
  try {
    wx.removeStorageSync(TOKEN_KEY)
    wx.removeStorageSync(USER_KEY)
  } catch (e) {}
}

module.exports = { getToken, setToken, getUser, setUser, clearAuth }
