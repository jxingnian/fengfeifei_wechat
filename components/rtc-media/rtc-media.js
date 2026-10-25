// All SDK-specific component trees stay here, outside the business call page.
Component({
  properties: { transport: String, mounted: Boolean, pushUrl: String, playUrl: String, muted: Boolean },
  methods: {
    onPushState(e) { this.forward('push-state', e) },
    onPlayState(e) { this.forward('play-state', e) },
    onPushError(e) { this.forward('push-error', e) },
    onPlayError(e) { this.forward('play-error', e) },
    forward(kind, e) { this.triggerEvent('transportevent', { kind, detail: e.detail }) }
  }
})
