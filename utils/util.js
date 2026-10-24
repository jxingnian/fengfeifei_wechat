// utils/util.js
function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function formatTime(value) {
  if (!value) return ''
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value).replace(/-/g, '/'))
  if (isNaN(date.getTime())) return String(value)
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  )
}

function maskId(id, head, tail) {
  const text = String(id || '')
  const h = head || 6
  const t = tail || 4
  if (text.length <= h + t) return text
  return text.slice(0, h) + '****' + text.slice(-t)
}

function toast(title, icon) {
  wx.showToast({ title: String(title || '').slice(0, 30), icon: icon || 'none', duration: 2000 })
}

function copy(text) {
  wx.setClipboardData({ data: String(text || '') })
}

module.exports = { formatTime, maskId, toast, copy }
