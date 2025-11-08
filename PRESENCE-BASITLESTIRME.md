# 🔧 PRESENCE SİSTEMİ BASİTLEŞTİRME

## 🚨 SORUN

API crash loop - PresenceService dependency injection hatası devam ediyor.

## 💡 ÇÖZÜM

**GEÇİCİ OLARAK:**  
Friends API'den `isOnline: false` dönecek, **SADECE BROADCAST İLE** güncellenecek!

### Üye Listesi GİBİ!

**Üye Listesi Nasıl Çalışıyor?**
```typescript
// İlk yüklemede API'den isOnline geliyor
loadServerMembers() → isOnline: true/false

// Sonra broadcast dinleniyor
presence-update → setServerMembers güncelle
```

**Arkadaş Listesi (YENİ YÖNTEM):**
```typescript
// İlk yüklemede false
loadFriends() → isOnline: false (hepsi offline başlıyor)

// Sonra BROADCAST dinleniyor  
presence-update → setFriends güncelle (DOĞRU DURUM!)
```

### Neden Çalışacak?

**Çünkü:**
1. Presence socket bağlanıyor
2. presenceSocket.on('connect') → loadFriends()
3. loadFriends() arkadaşları yükler (isOnline: false)
4. **İKİ TARAF DA BROADCAST GÖNDERİYOR!**
   - Kendi presence: "Ben online'ım" broadcast
   - Diğer taraf presence: "Ben online'ım" broadcast
5. Frontend broadcast'leri alır ve günceller
6. **DOĞRU DURUM!** ✅

---

## 📊 AKIŞ

```
PC 1 Açılıyor:
  → presence socket bağlanıyor
  → Backend BROADCAST: PC1 online
  
PC 2 Açılıyor:
  → presence socket bağlanıyor  
  → Backend BROADCAST: PC2 online
  → PC1 broadcast'i alıyor
  → setFriends güncelle
  → PC2 çevrimiçi görünüyor ✅
  
PC 2'de F5:
  → presenceSocket.on('connect')
  → loadFriends() (hepsi false başlar)
  → PC1 zaten online → BROADCAST var
  → PC2 broadcast'i alır
  → setFriends güncelle
  → PC1 çevrimiçi görünüyor ✅
```

---

## ✅ AVANTAJLARI

```
+ API'de PresenceService dependency yok
+ Basit ve sağlam
+ Broadcast'e güveniyor (zaten çalışıyor!)
+ Üye listesi ile AYNI mantık
```

---

**API build ediliyor... ⏳**

