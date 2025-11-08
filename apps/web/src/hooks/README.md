# Custom Hooks Dokümantasyonu

Bu klasör, uygulamanın tüm özel React hook'larını içerir.

## 📁 Hook'lar

### `useVoiceChannel.ts`
Sesli kanal işlemlerini yönetir.

**Kullanım:**
```typescript
const { joinChannel, leaveChannel, isConnected } = useVoiceChannel({
  user,
  selectedServer,
  onSuccess: (channelId) => console.log('Joined:', channelId),
  onError: (error) => console.error(error),
});
```

### `useAudioMonitoring.ts`
Mikrofon ses algılama ve monitoring.

**Kullanım:**
```typescript
const { startAudioMonitoring, stopAudioMonitoring } = useAudioMonitoring();

await startAudioMonitoring(user);
```

### `usePTT.ts`
Push-to-Talk (Bas-Konuş) modu yönetimi.

**Kullanım:**
```typescript
const { isPushToTalkMode, pushToTalkActive, togglePTTMode } = usePTT(connectedVoiceChannelId);
```

### `useWebRTC.ts`
WebRTC peer connection yönetimi.

**Kullanım:**
```typescript
const { createPeerConnection, closePeerConnection } = useWebRTC(username);

const pc = createPeerConnection(peerId, peerUsername);
```

## 🎯 Faydaları

- ✅ **Yeniden kullanılabilir** kod
- ✅ **Test edilebilir** logic
- ✅ **Bakımı kolay** yapı
- ✅ **Type-safe** TypeScript

