const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const { formatTime, toast, copy } = require('../../utils/util.js')
Page({
  data: { deviceId: '', device: null, name: '', statusText: '', lastSeenText: '', busy: false },
  async onLoad(query) {
    const deviceId = query.deviceId || ''
    this.setData({ deviceId })
    try {
      const device = await api.getDevice(deviceId)
      store.upsert(device)
      this.setData({ device, name: device.name, statusText: device.online ? '在线' : '离线', lastSeenText: formatTime(device.lastSeenAt) })
    } catch (error) { toast(error.message || '设备不存在') }
  },
  onName(e) { this.setData({ name: e.detail.value }) },
  async onSaveName() {
    if (this.data.busy) return
    const name = this.data.name.trim()
    if (!name) return toast('请输入设备名称')
    this.setData({ busy: true })
    try {
      const device = await api.updateDevice(this.data.deviceId, { name })
      store.upsert(device)
      this.setData({ device })
      toast('已保存', 'success')
    } catch (error) { toast(error.message || '保存失败') }
    finally { this.setData({ busy: false }) }
  },
  onCopyId() { copy(this.data.deviceId) },
  onOpenChat() { wx.navigateTo({ url: '/pages/chat/chat?deviceId=' + encodeURIComponent(this.data.deviceId) }) },
  onOpenCall() { wx.navigateTo({ url: '/pages/call/call?deviceId=' + encodeURIComponent(this.data.deviceId) }) },
  onUnbind() {
    wx.showModal({
      title: '解除设备绑定', content: '仅解除此账号与设备的关联，不会删除设备或影响其他用户。',
      success: async result => {
        if (!result.confirm || this.data.busy) return
        this.setData({ busy: true })
        try {
          await api.unbindDevice(this.data.deviceId)
          store.remove(this.data.deviceId)
          getApp().setCurrentDevice(null)
          toast('已解除绑定', 'success')
          wx.navigateBack()
        } catch (error) { toast(error.message || '解绑失败') }
        finally { this.setData({ busy: false }) }
      }
    })
  }
})
