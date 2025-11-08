# 🏗️ Modüler Mimari Dokümantasyonu

## AsforceS Voice - Profesyonel React Mimarisi

Bu proje, **Context API**, **Custom Hooks** ve **Modüler Component** yapısı kullanılarak profesyonel şekilde yapılandırılmıştır.

---

## 📂 Klasör Yapısı

```
apps/web/src/
├── context/              # Global state yönetimi
│   ├── AppContext.tsx         → Genel uygulama state
│   ├── VoiceContext.tsx       → Sesli kanal state
│   ├── ScreenShareContext.tsx → Ekran paylaşımı state
│   ├── PresenceContext.tsx    → Çevrimiçi/çevrimdışı state
│   └── index.ts               → Barrel export
│
├── hooks/                # Custom React hooks
│   ├── useVoiceChannel.ts     → Sesli kanal işlemleri
│   ├── useAudioMonitoring.ts  → Mikrofon & ses algılama
│   ├── usePTT.ts              → Bas-konuş modu
│   ├── useWebRTC.ts           → WebRTC peer yönetimi
│   └── README.md              → Hook dokümantasyonu
│
├── components/app/main/  # Modüler ana component'ler
│   ├── ServerTopBar.tsx       → Üst sunucu barı
│   ├── ChannelSidebar.tsx     → Sol kanal paneli
│   ├── VoiceControlPanel.tsx  → Sesli kanal kontrolleri
│   └── MessagePanel.tsx       → Mesaj paneli (yakında)
│
├── types/                # TypeScript tanımları
│   └── index.ts               → Tüm type definitions
│
└── utils/                # Yardımcı fonksiyonlar
    ├── constants.ts           → Sabitler (API_BASE, ICE_SERVERS, vb.)
    └── helpers.ts             → Helper functions
```

---

## 🎯 Mimari Prensipler

### 1️⃣ **Separation of Concerns**
Her dosya tek bir sorumluluğa sahip:
- Context → State yönetimi
- Hooks → Business logic
- Components → UI rendering
- Utils → Helper functions

### 2️⃣ **Type Safety**
Tüm types `types/index.ts` dosyasında tanımlı:
```typescript
import { VoiceUser, RemoteUser, ScreenQuality } from '../types';
```

### 3️⃣ **Reusability**
Hook'lar farklı component'lerde kullanılabilir:
```typescript
const { joinChannel } = useVoiceChannel({ user, selectedServer });
```

### 4️⃣ **Testability**
Her modül bağımsız test edilebilir.

---

## 🔌 Context Kullanımı

### VoiceContext
```typescript
import { useVoice } from '../context';

const { voiceUsers, isMuted, setIsMuted } = useVoice();
```

### ScreenShareContext
```typescript
import { useScreenShare } from '../context';

const { isScreenSharing, startScreenShare } = useScreenShare();
```

### PresenceContext
```typescript
import { usePresence } from '../context';

const { friends, loadFriends } = usePresence();
```

---

## 🛠️ Hook Kullanımı

### useVoiceChannel
```typescript
import { useVoiceChannel } from '../hooks/useVoiceChannel';

const { joinChannel, leaveChannel, isConnected } = useVoiceChannel({
  user,
  selectedServer,
  onSuccess: (id) => console.log('Joined:', id),
  onError: (err) => console.error(err),
});

// Kanala katıl
await joinChannel(channelId);

// Kanaldan ayrıl
leaveChannel();
```

### useAudioMonitoring
```typescript
import { useAudioMonitoring } from '../hooks/useAudioMonitoring';

const { startAudioMonitoring, stopAudioMonitoring } = useAudioMonitoring();

// Mikrofonu başlat
const success = await startAudioMonitoring(user);

// Mikrofonu durdur
stopAudioMonitoring();
```

---

## 🧩 Component Kullanımı

### ServerTopBar
```typescript
import { ServerTopBar } from './main/ServerTopBar';

<ServerTopBar
  servers={servers}
  selectedServer={selectedServer}
  user={user}
  onServerSelect={setSelectedServer}
  onLogout={logout}
  // ... diğer props
/>
```

### VoiceControlPanel
```typescript
import { VoiceControlPanel } from './main/VoiceControlPanel';

{connectedVoiceChannelId && (
  <VoiceControlPanel
    channels={channels}
    voiceUsers={voiceUsers}
    onLeaveChannel={leaveChannel}
    showToast={showToast}
  />
)}
```

---

## 📊 State Flow

```
User Action → Component
    ↓
Component calls Hook
    ↓
Hook updates Context
    ↓
Context triggers re-render
    ↓
UI updates automatically
```

---

## ✅ Avantajlar

1. **Kod Tekrarı Yok** - Hook'lar her yerde kullanılabilir
2. **Kolay Bakım** - Her dosya küçük ve odaklı
3. **Type Safety** - TypeScript ile tam tip güvenliği
4. **Test Edilebilir** - Her modül bağımsız test edilebilir
5. **Okunabilir** - Kod akışı net ve anlaşılır
6. **Scalable** - Yeni özellik eklemek kolay

---

## 🚀 Gelecek Geliştirmeler

- [ ] `useMessages.ts` - Mesajlaşma hook'u
- [ ] `useServers.ts` - Sunucu işlemleri hook'u
- [ ] `useChannels.ts` - Kanal işlemleri hook'u
- [ ] `MessagePanel.tsx` - Modüler mesaj paneli
- [ ] `RightSidebar.tsx` - Sağ üye paneli
- [ ] Unit testler (Jest + React Testing Library)

---

## 📝 Not

Bu mimari, **Discord** ve **Slack** gibi profesyonel uygulamaların kullandığı modern React best practices'i takip eder.

**Geliştirici:** Can Rahim  
**Tarih:** 8 Kasım 2025  
**Versiyon:** 2.0 (Modüler)

