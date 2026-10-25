const NativeRtmpTransport = require('./native-rtmp.js')

// Register another transport here (for example Agora), not in the call page.
const factories = { 'native-rtmp': host => new NativeRtmpTransport(host) }
function createTransport(name, host) {
  const factory = factories[name]
  if (!factory) throw Error('当前版本尚不支持此通话方式，请升级小程序')
  return factory(host)
}
module.exports = { createTransport }
