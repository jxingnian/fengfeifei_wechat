// utils/device-store.js —— 已绑定设备的本地缓存（含 deviceToken）
// 后端接口文档确认前，设备凭证以本地存储为准，避免无法回连 WebSocket。
const KEY = 'ff_devices'

function readAll() {
  try {
    const list = wx.getStorageSync(KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function writeAll(list) {
  try {
    wx.setStorageSync(KEY, list)
  } catch (e) {}
  return list
}

function list() {
  return readAll()
}

function get(deviceId) {
  return readAll().find((item) => item.deviceId === deviceId) || null
}

function upsert(device) {
  const all = readAll()
  const index = all.findIndex((item) => item.deviceId === device.deviceId)
  if (index >= 0) all[index] = Object.assign({}, all[index], device)
  else all.unshift(device)
  return writeAll(all)
}

function remove(deviceId) {
  return writeAll(readAll().filter((item) => item.deviceId !== deviceId))
}

// 用服务端返回的状态（在线/最近上线）合并到本地列表
function mergeServerList(serverList) {
  if (!Array.isArray(serverList)) return readAll()
  const all = readAll()
  return writeAll(
    all.map((item) => {
      const hit = serverList.find((s) => s.deviceId === item.deviceId)
      return hit ? Object.assign({}, item, hit, { deviceToken: item.deviceToken }) : item
    })
  )
}

module.exports = { list, get, upsert, remove, mergeServerList }
