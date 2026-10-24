// utils/device-ws.js —— 设备实时语音通道（ws://host/ws/device）
// 上行：{"type":"audio_start"} / 二进制 PCM / {"type":"audio_end"} / {"type":"cancel"} / {"type":"ping"}
// 下行：ready / audio_start / 二进制音频 / audio_end / audio_stop / transcript / ai_event / pong / error
const JSON_START = 'audio_start'
const JSON_END = 'audio_end'
const JSON_CANCEL = 'cancel'
const JSON_PING = 'ping'

const MAX_RETRY = 5

class DeviceSocket {
  constructor(options) {
    this.options = options || {}
    this.url = this.options.url
    this.socket = null
    this.closedByUser = false
    this.retry = 0
    this.pingTimer = null
    this.ready = false
    this.on = this.options.on || {}
  }

  _emit(name, payload) {
    const fn = this.on[name]
    if (typeof fn === 'function') fn(payload)
  }

  connect() {
    this.closedByUser = false
    this._create()
  }

  _create() {
    const socket = wx.connectSocket({
      url: this.url,
      fail: (err) => {
        this._emit('error', { message: (err && err.errMsg) || '连接失败' })
        this._scheduleRetry()
      }
    })
    this.socket = socket

    socket.onOpen(() => {
      this.retry = 0
      this._startPing()
      this._emit('open')
    })

    socket.onMessage((res) => {
      if (res && res.data instanceof ArrayBuffer) {
        this._emit('audio', res.data)
        return
      }
      let msg = res && res.data
      if (typeof msg === 'string') {
        try {
          msg = JSON.parse(msg)
        } catch (e) {
          return
        }
      }
      if (!msg || !msg.type) return
      switch (msg.type) {
        case 'ready':
          this.ready = true
          this._emit('ready', msg)
          break
        case 'audio_start':
          this._emit('audioStart', msg)
          break
        case 'audio_end':
          this._emit('audioEnd', msg)
          break
        case 'audio_stop':
          this._emit('audioStop', msg)
          break
        case 'transcript':
          this._emit('transcript', msg)
          break
        case 'ai_event':
          this._emit('aiEvent', msg)
          break
        case 'error':
          this._emit('error', msg)
          break
        case 'pong':
          break
        default:
          this._emit('message', msg)
      }
    })

    socket.onError((err) => {
      this._emit('error', { message: (err && err.errMsg) || '连接异常' })
    })

    socket.onClose(() => {
      this.ready = false
      this._stopPing()
      this._emit('close')
      if (!this.closedByUser) this._scheduleRetry()
    })
  }

  _scheduleRetry() {
    if (this.closedByUser) return
    if (this.retry >= MAX_RETRY) {
      this._emit('error', { message: '重连次数过多，请稍后重试' })
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this.retry), 15000)
    this.retry += 1
    setTimeout(() => {
      if (!this.closedByUser) this._create()
    }, delay)
  }

  _startPing() {
    this._stopPing()
    this.pingTimer = setInterval(() => this.sendJson({ type: JSON_PING }), 20000)
  }

  _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  send(data) {
    if (!this.socket) return false
    this.socket.send({ data })
    return true
  }

  sendJson(obj) {
    return this.send(JSON.stringify(obj))
  }

  // 上行二进制 PCM（<=256KB）
  sendAudio(buffer) {
    return this.send(buffer)
  }

  startTurn() {
    return this.sendJson({ type: JSON_START })
  }

  endTurn() {
    return this.sendJson({ type: JSON_END })
  }

  cancel() {
    return this.sendJson({ type: JSON_CANCEL })
  }

  close() {
    this.closedByUser = true
    this._stopPing()
    if (this.socket) {
      this.socket.close({ code: 1000 })
      this.socket = null
    }
  }
}

module.exports = DeviceSocket
