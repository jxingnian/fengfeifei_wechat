// pages/device/device.js
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { formatTime, toast, copy } = require('../../utils/util.js')

Page({
  data: {
    deviceId: '',
    device: null,
    name: '',
    volume: 60,
    statusText: '未知',
    lastSeenText: '',
    personas: [],
    personaNames: [],
    personaIndex: 0,
    config: null
  },

  onLoad(query) {
    const deviceId = decodeURIComponent(query.deviceId || '')
    const device = store.get(deviceId) || getApp().getCurrentDevice(deviceId)
    if (!device) {
      this.setData({ deviceId, device: null })
      return
    }
    this.setData({
      deviceId,
      device,
      name: device.name || deviceId,
      volume: typeof device.volume === 'number' ? device.volume : 60,
      lastSeenText: formatTime(device.lastSeenAt),
      statusText: device.online ? '在线' : (typeof device.online === 'boolean' ? '离线' : '未知')
    })
    this.loadDetail(deviceId)
    this.loadPersonas()
    this.loadConfig(deviceId, device.deviceToken)
  },

  loadDetail(deviceId) {
    api
      .getDevice(deviceId)
      .then((res) => {
        const d = (res && res.device) || res
        if (!d || !d.deviceId) return
        store.upsert({ deviceId, name: d.name || this.data.name })
        this.setData({
          name: d.name || this.data.name,
          volume: typeof d.volume === 'number' ? d.volume : this.data.volume,
          statusText: d.online ? '在线' : '离线',
          lastSeenText: formatTime(d.lastSeenAt || d.lastSeen)
        })
      })
      .catch(() => {})
  },

  loadPersonas() {
    api
      .getPersonas()
      .then((res) => {
        const arr = Array.isArray(res) ? res : res && res.personas
        if (!Array.isArray(arr) || !arr.length) return
        const names = arr.map((p) => p.name || String(p.id))
        let index = 0
        const current = this.data.device && this.data.device.personaId
        if (current) {
          const hit = arr.findIndex((p) => String(p.id) === String(current))
          if (hit >= 0) index = hit
        }
        this.setData({ personas: arr, personaNames: names, personaIndex: index })
      })
      .catch(() => {})
  },

  loadConfig(deviceId, deviceToken) {
    if (!deviceToken) return
    api
      .getDeviceConfig(deviceId, deviceToken)
      .then((res) => {
        const c = (res && res.config) || res
        if (c && (c.voiceProvider || c.provider)) {
          this.setData({ config: Object.assign({}, c, { voiceProvider: c.voiceProvider || c.provider }) })
        }
      })
      .catch(() => {})
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  onSaveName() {
    const name = (this.data.name || '').trim()
    if (!name) {
      toast('请输入设备名称')
      return
    }
    store.upsert({ deviceId: this.data.deviceId, name })
    api.updateDevice(this.data.deviceId, { name }).catch(() => {})
    toast('已保存', 'success')
  },

  // bindchange 在拖动结束时触发，避免频繁下发
  onVolumeChange(e) {
    const volume = e.detail.value
    this.setData({ volume })
    api
      .updateDevice(this.data.deviceId, { volume })
      .then(() => store.upsert({ deviceId: this.data.deviceId, volume }))
      .catch(() => toast('音量下发失败'))
  },

  onPersonaChange(e) {
    const index = Number(e.detail.value)
    const persona = this.data.personas[index]
    if (!persona) return
    this.setData({ personaIndex: index })
    store.upsert({ deviceId: this.data.deviceId, personaId: persona.id })
    api
      .updateDevice(this.data.deviceId, { personaId: persona.id })
      .then(() => toast('角色已切换', 'success'))
      .catch(() => toast('角色切换失败'))
  },

  onCopyId() {
    copy(this.data.deviceId)
  },

  onOpenChat() {
    getApp().setCurrentDevice(store.get(this.data.deviceId))
    wx.navigateTo({ url: '/pages/chat/chat?deviceId=' + encodeURIComponent(this.data.deviceId) })
  },

  onOpenCall() {
    getApp().setCurrentDevice(store.get(this.data.deviceId))
    wx.navigateTo({ url: '/pages/call/call?deviceId=' + encodeURIComponent(this.data.deviceId) })
  },

  onUnbind() {
    wx.showModal({
      title: '解绑设备',
      content: '解绑后本机将无法连接该设备，需重新扫码绑定',
      success: (res) => {
        if (!res.confirm) return
        store.remove(this.data.deviceId)
        api.unbindDevice(this.data.deviceId).catch(() => {})
        toast('已解绑', 'success')
        setTimeout(() => wx.navigateBack(), 600)
      }
    })
  }
})
