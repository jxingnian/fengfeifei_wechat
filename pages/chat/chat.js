// pages/chat/chat.js
const api = require('../../utils/api.js')
const store = require('../../utils/device-store.js')
const DeviceSocket = require('../../utils/device-ws.js')
const PcmPlayer = require('../../utils/pcm-player.js')
const PcmRecorder = require('../../utils/pcm-recorder.js')
const { toast } = require('../../utils/util.js')

const STATUS = {
  connecting: { text: '连接中', cls: '' },
  connected: { text: '已连接', cls: 'ff-dot--online' },
  closed: { text: '已断开', cls: '' },
  error: { text: '异常', cls: '' }
}

function extractText(msg) {
  const data = msg && msg.data
  if (typeof data === 'string') return data
  if (!data) return ''
  const keys = ['content', 'text', 'delta', 'answer', 'message', 'output']
  for (let i = 0; i < keys.length; i++) {
    const value = data[keys[i]]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

Page({
  data: {
    deviceId: '',
    title: '对话',
    statusText: '连接中',
    statusClass: '',
    messages: [],
    text: '',
    recording: false,
    aiSpeaking: false,
    toView: ''
  },

  onLoad(query) {
    const deviceId = decodeURIComponent(query.deviceId || '')
    const device = store.get(deviceId) || getApp().getCurrentDevice(deviceId)
    if (!device) {
      toast('设备不存在，请重新绑定')
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.device = device
    this.seq = 0
    this.setData({
      deviceId,
      title: device.name || deviceId
    })
    this.initPlayer()
    this.initRecorder()
    this.connect()
  },

  onUnload() {
    if (this.socket) this.socket.close()
    if (this.player) this.player.destroy()
    if (this.recorder) this.recorder.stop()
  },

  onHide() {
    if (this.recorder) this.recorder.stop()
    if (this.player) this.player.stop()
  },

  setStatus(key) {
    const map = STATUS[key] || STATUS.closed
    this.setData({ statusText: map.text, statusClass: map.cls })
  },

  initPlayer() {
    this.player = new PcmPlayer({ sampleRate: 24000 })
  },

  initRecorder() {
    this.recorder = new PcmRecorder({
      sampleRate: 24000,
      frameSize: 1,
      onData: (buffer) => {
        if (this.socket && this.socket.ready) this.socket.sendAudio(buffer)
      },
      onError: (message) => {
        this.setData({ recording: false })
        toast(message)
      }
    })
  },

  connect() {
    this.socket = new DeviceSocket({
      url: api.getDeviceWsUrl(this.device.deviceId, this.device.deviceToken),
      on: {
        open: () => this.setStatus('connecting'),
        ready: (msg) => {
          this.setStatus('connected')
          const rate = msg && msg.output && msg.output.sampleRate
          if (rate && this.player) this.player.sampleRate = rate
        },
        close: () => this.setStatus('closed'),
        error: (msg) => {
          this.setStatus('error')
          this.pushMessage('system', msg && msg.message ? '连接异常：' + msg.message : '连接异常')
        },
        audioStart: () => {
          this.setData({ aiSpeaking: true })
          this.player.start()
        },
        audio: (buffer) => {
          this.player.feed(buffer)
        },
        audioEnd: () => {
          // 等缓存片段播完，不做强制停止
        },
        audioStop: (msg) => {
          this.setData({ aiSpeaking: false })
          this.player.stop()
          const reason = msg && msg.reason
          if (reason) this.pushMessage('system', '已中断：' + reason)
        },
        transcript: (msg) => {
          if (msg && msg.text) this.pushMessage('me', msg.text)
        },
        aiEvent: (msg) => {
          const text = extractText(msg)
          if (text) this.appendAiText(text)
        }
      }
    })
    this.socket.connect()
  },

  pushMessage(role, text) {
    const list = this.data.messages.concat([
      { id: 'm' + Date.now() + '_' + this.seq++, role, text }
    ])
    this.setData({
      messages: list,
      toView: 'msg-' + (list.length - 1)
    })
  },

  appendAiText(text) {
    const list = this.data.messages.slice()
    const last = list[list.length - 1]
    if (last && last.role === 'ai') {
      last.text += text
    } else {
      list.push({ id: 'm' + Date.now() + '_' + this.seq++, role: 'ai', text })
    }
    this.setData({
      messages: list,
      toView: 'msg-' + (list.length - 1)
    })
  },

  onText(e) {
    this.setData({ text: e.detail.value })
  },

  onSendText() {
    const text = (this.data.text || '').trim()
    if (!text) return
    this.pushMessage('me', text)
    this.setData({ text: '' })
    api.sendText(this.data.deviceId, text).catch(() => {})
  },

  onTalkStart() {
    if (this.data.recording) return
    if (!this.socket || !this.socket.ready) {
      toast('设备未连接，请稍候')
      return
    }
    this.player.stop()
    this.setData({ recording: true })
    this.socket.startTurn()
    this.recorder.start().catch(() => {
      this.setData({ recording: false })
    })
  },

  onTalkEnd() {
    if (!this.data.recording) return
    this.setData({ recording: false })
    this.recorder.stop()
    if (this.socket) this.socket.endTurn()
  },

  onTalkCancel() {
    if (!this.data.recording) return
    this.setData({ recording: false })
    this.recorder.stop()
    if (this.socket) this.socket.cancel()
  }
})
