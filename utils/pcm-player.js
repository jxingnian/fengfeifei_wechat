// utils/pcm-player.js —— PCM 音频播放（基于 WebAudio，需 WebView 渲染）
// 设备下行：PCM 24000Hz / 单声道 / 16bit 小端序
class PcmPlayer {
  constructor(options) {
    this.sampleRate = (options && options.sampleRate) || 24000
    this.ctx = null
    this.sources = []
    this.nextStartTime = 0
    this.playing = false
  }

  _context() {
    if (!this.ctx) {
      this.ctx = wx.createWebAudioContext()
    }
    if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume()
    return this.ctx
  }

  // 收到 audio_start 时调用
  start() {
    this.stop()
    const ctx = this._context()
    this.playing = true
    this.nextStartTime = ctx.currentTime + 0.05
  }

  /**
   * @param {ArrayBuffer} arrayBuffer 16bit 小端 PCM
   */
  feed(arrayBuffer) {
    if (!this.playing) this.start()
    const ctx = this._context()
    const int16 = new Int16Array(arrayBuffer)
    if (!int16.length) return

    const buffer = ctx.createBuffer(1, int16.length, this.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < int16.length; i++) {
      channel[i] = int16[i] / 32768
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    const now = ctx.currentTime
    if (this.nextStartTime < now) this.nextStartTime = now
    source.start(this.nextStartTime)
    this.nextStartTime += buffer.duration

    this.sources.push(source)
    source.onended = () => {
      const index = this.sources.indexOf(source)
      if (index >= 0) this.sources.splice(index, 1)
    }
  }

  // 收到 audio_stop 时立即静音并清空缓存
  stop() {
    this.sources.forEach((source) => {
      try {
        source.stop()
        source.disconnect()
      } catch (e) {}
    })
    this.sources = []
    this.playing = false
    if (this.ctx) this.nextStartTime = this.ctx.currentTime
  }

  destroy() {
    this.stop()
    if (this.ctx && this.ctx.close) {
      try {
        this.ctx.close()
      } catch (e) {}
    }
    this.ctx = null
  }
}

module.exports = PcmPlayer
