// Display cache, partitioned by backend + platform user. No hardware credentials.
const { getUser } = require('./auth.js')
const { getBaseUrl } = require('./config.js')
function key() {
  const user = getUser()
  return user && user.id ? 'ff_devices_v2:' + getBaseUrl() + ':' + user.id : ''
}
function clean(device) {
  return {
    id: device.deviceId || device.id, deviceId: device.deviceId || device.id,
    name: device.name, tenantId: device.tenantId, tenantName: device.tenantName,
    online: device.online, lastSeenAt: device.lastSeenAt, authRevoked: device.authRevoked
  }
}
function list() {
  try { const data = key() && wx.getStorageSync(key()); return Array.isArray(data) ? data.map(clean) : [] } catch (_) { return [] }
}
function write(items) {
  const result = items.map(clean)
  if (key()) wx.setStorageSync(key(), result)
  return result
}
function clear() { if (key()) wx.removeStorageSync(key()) }
function get(id) { return list().find(item => item.deviceId === id) || null }
function upsert(device) {
  const id = device.deviceId || device.id, items = list(), index = items.findIndex(item => item.deviceId === id)
  if (index < 0) items.push(clean(device))
  else items[index] = Object.assign({}, items[index], device)
  return write(items)
}
function remove(id) { return write(list().filter(item => item.deviceId !== id)) }
function mergeServerList(items) { return write(Array.isArray(items) ? items : []) }
module.exports = { list, get, upsert, remove, clear, mergeServerList }
