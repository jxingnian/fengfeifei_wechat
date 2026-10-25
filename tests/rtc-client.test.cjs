const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')

global.wx = { getStorageSync: key => key === 'ff_token' ? 'test-session' : '' }
const RtcClient = require('../utils/rtc/client.js')
const NativeRtmp = require('../utils/rtc/transports/native-rtmp.js')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

test('leaving while call creation is pending ends the late call and never starts media', async () => {
  const pending = deferred(), ended = [], patches = []
  const client = new RtcClient({ render: patch => patches.push(patch) }, {
    api: { createRtcCall: () => pending.promise, endRtcCall: async id => ended.push(id) },
    createTransport: () => { throw Error('must not mount media after leaving') }
  })
  const start = client.start('device'); client.finish(); pending.resolve({ callId: 'late', client: {} }); await start
  assert.deepEqual(ended, ['late']); assert.equal(patches.at(-1).ended, true)
})

test('call client requires server and local media readiness, dispatches mute and closes once', async () => {
  let host, ready = false, stopped = 0, hungup = 0
  const patches = [], muted = []
  const client = new RtcClient({ render: patch => patches.push(patch) }, {
    api: { createRtcCall: async () => ({ callId: 'test', state: 'ringing', client: { transport: 'future-sdk' } }),
      heartbeatRtcCall: async () => ({ state: 'connected', media: { uplink: true, downlink: true } }), endRtcCall: async () => hungup++ },
    createTransport: (name, value) => {
      assert.equal(name, 'future-sdk'); host = value
      return { async start() {}, updateStatus() {}, ready: () => ready, setMuted: value => muted.push(value), close: () => stopped++ }
    }
  })
  await client.start('device'); clearTimeout(client.timer); await client.poll(); clearTimeout(client.timer)
  assert.equal(patches.at(-1).connected, false)
  ready = true; host.onMediaChanged(); assert.equal(patches.at(-1).connected, true)
  client.setMuted(true); assert.deepEqual(muted, [true])
  client.finish(); client.finish(); assert.equal(stopped, 1); assert.equal(hungup, 1)
})

test('native adapter waits for Egress and actual decoded video/audio, never requests phone camera', async () => {
  let pushStarts = 0, playStarts = 0, pushStops = 0, playStops = 0
  wx.createLivePusherContext = () => ({ start: () => pushStarts++, stop: () => pushStops++ })
  wx.createLivePlayerContext = () => ({ play: () => playStarts++, stop: () => playStops++ })
  const patches = [], failures = []
  const adapter = new NativeRtmp({ mediaHost: () => ({}), render: async patch => patches.push(patch), onMediaChanged() {}, onError: error => failures.push(error) })
  await adapter.start({ publish: { audio: true, video: false }, options: { pushUrl: 'rtmp://push/live/key', playUrl: 'https://app/calls/stream.flv?token=secret' } })
  assert.equal(pushStarts, 1); assert.equal(playStarts, 0)
  adapter.updateStatus({ media: { downlink: false } }); assert.equal(playStarts, 0)
  adapter.updateStatus({ media: { downlink: true } }); assert.equal(playStarts, 1)
  adapter.onEvent('push-state', { detail: { code: 1002 } })
  adapter.onEvent('play-state', { detail: { code: 2003 } }); assert.equal(adapter.ready(), false)
  adapter.onEvent('play-state', { detail: { code: 2026 } }); assert.equal(adapter.ready(), true)
  await adapter.setMuted(true); assert.equal(patches.at(-1).muted, true)
  await adapter.close(); adapter.close(); assert.equal(pushStops, 1); assert.equal(playStops, 1)
  assert.equal(patches.at(-1).pushUrl, ''); assert.equal(patches.at(-1).playUrl, '')
  assert.deepEqual(failures, [])
  const markup = readFileSync(path.join(__dirname, '../components/rtc-media/rtc-media.wxml'), 'utf8')
  assert.match(markup, /enable-camera="\{\{false\}\}"/)
  assert.doesNotMatch(markup, /<camera\b/)
})

test('native adapter does not start contexts if hangup wins component mount', async () => {
  const mounted = deferred(); let contexts = 0
  wx.createLivePusherContext = () => { contexts++; return {} }
  const adapter = new NativeRtmp({ render: () => mounted.promise })
  const start = adapter.start({ publish: { audio: true, video: false }, options: { pushUrl: 'rtmp://push/live/key', playUrl: 'https://app/calls/a.flv' } })
  adapter.close(); mounted.resolve(); await start; assert.equal(contexts, 0)
})

test('a closed client never creates a call and transport stop errors do not skip backend hangup', async () => {
  let created = 0, ended = 0
  const client = new RtcClient({ render() {} }, {
    api: { createRtcCall: async () => { created++; return {} }, endRtcCall: async () => ended++ }
  })
  client.callId = 'existing'; client.transport = { close() { throw Error('native context detached') } }
  client.finish(); await client.start('device')
  assert.equal(ended, 1); assert.equal(created, 0)
})
