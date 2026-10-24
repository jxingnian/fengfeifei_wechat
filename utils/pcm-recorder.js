// utils/pcm-recorder.js —— PCM 录音（24000Hz / 单声道 / 16bit，与设备协议一致）
const manager = wx.getRecorderManager()

class PcmRecorder {
  constructor(options) {
    const opts = options || {}
    this.sampleRate = opts.sampleRate || 24000
    this.frameSize = opts.frameSize || 1 // 单位 KB，约 21ms 一包
    this.onData = opts.onData || function () {}
    this.onError = opts.onError || function () {}
    this.recording = false
    this._bound = false
  }

  _bind() {
    if (this._bound) return
    this._bound = true
    manager.onStart(() => {
      this.recording = true
    })
    manager.onFrameRecorded((res) => {
      if (res && res.frameBuffer) this.onData(res.frameBuffer, res.isLastFrame)
    })
    manager.onStop(() => {
      this.recording = false
    })
    manager.onError((err) => {
      this.recording = false
      this.onError((err && err.errMsg) || '录音失败')
    })
  }

  start() {
    this._bind()
    const self = this
    return new Promise((resolve, reject) => {
      const doStart = () => {
        try {
          manager.start({
            format: 'PCM',
            sampleRate: self.sampleRate,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            frameSize: self.frameSize
          })
          self.recording = true
          resolve()
        } catch (e) {
          reject(e)
        }
      }

      wx.authorize({
        scope: 'scope.record',
        success: doStart,
        fail() {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中开启麦克风权限后重试',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) wx.openSetting()
            }
          })
          reject(new Error('未授权录音'))
        }
      })
    })
  }

  stop() {
    if (!this.recording) return
    try {
      manager.stop()
    } catch (e) {}
    this.recording = false
  }
}

module.exports = PcmRecorder
