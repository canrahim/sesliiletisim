# 🔧 Presence Broadcast Sorunu - Çözüm

## 🐛 SORUN:

**Tespit Edilen:**
- ✅ Reload edince arkadaşlar çevrimiçi görünüyor
- ❌ Real-time güncelleme yok
- ❌ Diğer PC'den giriş yapınca hemen görünmüyor
- ❌ Broadcast çalışmıyor

**Neden:**
- Backend: `server.emit('presence-update')` çalışmıyor
- Veya broadcast gönderiliyor ama frontend almıyor

---

## 🔧 YAPILAN DÜZELTMELER

### 1. Backend (presence.gateway.ts)

**Bağlantı (handleConnection):**
```typescript
// Önceki
this.server.emit('presence-update', {
  userId,
  status: 'online',
  isOnline: true,
});

// Yeni (Loglu)
const activity = await this.presenceService.getUserActivity(userId);

this.server.emit('presence-update', {
  userId,
  status: 'online',
  isOnline: true,
  activity: activity
});

this.logger.log(`📢 BROADCAST: User ${userId} is ONLINE (sent to all)`);
console.log(`📢 Active connections: ${this.server.sockets.sockets.size}`);
```

**Ayrılma (handleDisconnect):**
```typescript
// Önceki
this.logger.debug(`User ${userId} now offline`);

// Yeni
this.logger.log(`📢 BROADCAST: User ${userId} is OFFLINE (sent to all)`);
```

**Artık console'da göreceksiniz:**
```
[Nest] LOG [PresenceGateway] 📢 BROADCAST: User XXX is ONLINE (sent to all)
📢 Active connections: 5
```

---

### 2. Frontend (FriendsSidebar.tsx)

**Initial Load:**
```typescript
// presenceSocket.on('connect')
const friendIds = friends.map(f => f.id);
presenceSocket.emit('get-presence', { userIds: friendIds }, (response) => {
  // Tüm arkadaşların presence'ını güncelle
});

// loadFriends() sonrası
presenceSocket.emit('get-presence', { userIds: friendIds })
```

**Console'da göreceksiniz:**
```
✅ Connected to presence gateway (friends sidebar)
🔄 Arkadaşların presence durumları güncellendi
```

---

### 3. Frontend (DirectMessagesView.tsx)

**Aynı düzeltme:**
```typescript
✅ presenceSocket.on('connect') → get-presence
✅ loadFriends() sonrası → get-presence
✅ Tasarım güncellendi (yeşil pulse)
```

---

## 🧪 TEST SENARYOSU

### Test 1: Çift PC Testi

**PC 1:**
```
1. https://app.asforces.com giriş yap
2. Console aç (F12)
3. Presence connected mesajını bekle
```

**PC 2:**
```
1. https://app.asforces.com giriş yap
2. Console'da görmeli:
   📢 BROADCAST: User XXX is ONLINE
```

**PC 1'de:**
```
Otomatik güncellenmeli:
👤 PC2 Kullanıcısı
   🟢 Çevrimiçi  ← HEMEN GÖRÜNMELI!
```

### Test 2: Çıkış Testi

**PC 2:**
```
1. Çıkış yap veya sayfayı kapat
```

**PC 1'de:**
```
👤 PC2 Kullanıcısı
   ⚫ Çevrimdışı  ← HEMEN GÜNCELLENMELİ!
```

---

## 📦 Deployment Durumu

```
✅ presence.gateway.ts yüklendi (7.9 KB)
⏳ API container rebuild ediliyor...
⏳ Presence broadcast logları eklenecek
```

**API Build tamamlanınca:**
```bash
docker-compose up -d api
docker logs -f asforces-api
```

**Göreceksiniz:**
```
📢 BROADCAST: User XXX is ONLINE (sent to all)
📢 Active connections: X
```

---

## 🔍 Debug İçin

**F12 Console'da:**
```javascript
// Presence socket durumu
window.presenceSocket = presenceSocketRef.current;

// Manuel test
presenceSocket.emit('get-presence', {
  userIds: ['USER_ID_BURAYA']
}, (response) => {
  console.log('Presence response:', response);
});
```

**Backend console:**
```bash
docker logs -f asforces-api | grep BROADCAST
```

---

**API build bitince test edin!** ⏳

