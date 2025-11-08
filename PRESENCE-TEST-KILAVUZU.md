# 🧪 Presence Test Kılavuzu

## ⏳ Durum: API Rebuild Ediliyor

**API build bitince (1-2 dakika):**
```bash
docker-compose up -d api
```

---

## 🧪 TEST ADIMLARI

### 1. Backend Loglarını İzleyin

```bash
# Sunucuda
docker logs -f asforces-api | grep BROADCAST
```

**Görmelisiniz:**
```
📢 BROADCAST: User ac2b7a63... is ONLINE (sent to all)
📢 Active connections: 2
📢 BROADCAST: User 1b51af84... is ONLINE (sent to all)  
📢 Active connections: 3
```

---

### 2. İki PC ile Test

**PC 1:**
```
1. https://app.asforces.com
2. Giriş yap (Kullanıcı 1)
3. F12 → Console
4. Arkadaş listesi/DM aç
5. Console'da:
   ✅ Connected to presence gateway
   🔄 Arkadaşların presence durumları güncellendi
```

**PC 2 (veya başka tarayıcı):**
```
1. https://app.asforces.com  
2. Giriş yap (Kullanıcı 2)
3. F12 → Console
```

**Backend'de görmeli:**
```
📢 BROADCAST: User [PC2] is ONLINE (sent to all)
📢 Active connections: 4
```

**PC 1'de HEMEN görmeli:**
```
Arkadaş Listesi:
👤 Kullanıcı 2
   🟢 Çevrimiçi  ← RELOAD YAPMADAN!
```

---

### 3. Çıkış Testi

**PC 2:**
```
Çıkış yap veya sekmeyi kapat
```

**Backend'de:**
```
📢 BROADCAST: User [PC2] is OFFLINE (sent to all)
📢 Active connections: 2
```

**PC 1'de HEMEN güncellenmeli:**
```
👤 Kullanıcı 2
   ⚫ Çevrimdışı  ← RELOAD YAPMADAN!
```

---

## 🔍 Sorun Giderme

### Problem: BROADCAST logları görünmüyor

**Çözüm 1: API'yi manuel restart**
```bash
docker restart asforces-api
docker logs -f asforces-api
```

**Çözüm 2: Kod kontrol**
```bash
docker exec asforces-api cat /app/dist/presence/presence.gateway.js | grep BROADCAST
```

### Problem: Frontend almıyor

**F12 Console'da:**
```javascript
// presenceSocket listener'ı kontrol et
presenceSocket.on('presence-update', (data) => {
  console.log('📥 Presence update alındı:', data);
});
```

### Problem: get-presence çalışıyor ama broadcast yok

**Backend'de:**
```
✅ get-presence handler çalışıyor
❌ server.emit() çalışmıyor
```

**Kontrol:**
```bash
# Socket.io namespace'i doğru mu?
docker logs asforces-api | grep "namespace: /presence"
```

---

## ✅ Çalışması Gereken

### Backend:
```
✅ handleConnection → Broadcast ONLINE
✅ handleDisconnect → Broadcast OFFLINE  
✅ activity-update → Broadcast activity
✅ Log mesajları
```

### Frontend:
```
✅ presenceSocket.on('connect') → get-presence çağır
✅ presenceSocket.on('presence-update') → state güncelle
✅ loadFriends() → get-presence çağır
```

### Akış:
```
PC 2 Giriş
  ↓
Backend: handleConnection
  ↓
server.emit('presence-update', { userId, isOnline: true })
  ↓
PC 1: presenceSocket.on('presence-update')
  ↓
setFriends → isOnline: true
  ↓
UI: 🟢 Çevrimiçi
```

---

**API build bitince (1-2 dakika) test edin!**

Detaylar: `PRESENCE-BROADCAST-FIX.md`

