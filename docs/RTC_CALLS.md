# 小程序设备音视频通话

当前实现方案 A：`live-pusher` 关闭摄像头，仅发手机麦克风；`live-player` 播放设备画面与声音。
通话期间无需手机摄像头权限，离开页面/切后台挂断。

后台配置、媒体架构、接口、微信类目权限和真实设备验收统一见
[方案 A 接入说明](../../xn_ai_server/docs/MINI_RTC.md)。
账户与设备绑定见 [后台小程序文档](../../xn_ai_server/docs/mini-program.md)。

代码分工：

- `pages/call/call.js`：授权麦克风、页面生命周期、通话操作。
- `utils/rtc/client.js`：通用信令、心跳、异步取消与账号变化保护。
- `utils/rtc/transports/index.js`：按后台返回的 transport 选择实现。
- `utils/rtc/transports/native-rtmp.js`：原生组件上下文、推拉流就绪事件、播放重试和释放。
- `components/rtc-media/`：厂商专属组件树；后续声网 UI/SDK 接入放在这里和对应 transport。

未来可通过 `RtcClient.start(deviceId, {provider, transport})` 显式选择已注册服务。
只修改 provider 名称无法完成声网接入，必须同时实现后台与设备适配器。

宿主环境测试（Node 22）：`node --test tests/*.test.cjs`。
该测试不运行微信原生媒体组件，仍需 iOS/Android 真机完成双向声音、设备画面、静音、断网及回收验收。
