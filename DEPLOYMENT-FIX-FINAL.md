# 🔧 DEPLOYMENT SORUN ÇÖZÜM RAPORU

## 🚨 TESPİT EDİLEN SORUNLAR

### 1. Nginx Config Karmaşası
- app-asforces.conf ve asforces.conf duplicate upstream
- Nginx crash loop (duplicate api_backend)

**Çözüm:**
- app-asforces.conf silindi
- asforces.conf'a app.asforces.com block eklendi

### 2. Web Container Eski Build
- Container içinde eski JS: index-hkTgmzLH.js  
- Host'ta yeni JS: index-Db2ocgtV.js

**Neden:**
- Web container Dockerfile multi-stage build
- Build sırasında eski source code kullanılmış

**Çözüm:**
- Web container tamamen rebuild ediliyor ⏳

### 3. Docker Volume vs Copy Sorunu
- Web container'a manuel kopyalama başarısız (permission & path)
- En iyi çözüm: Build ile embed etmek

---

## ⏳ ŞU ANDA YAPILIYOR

```bash
# Arka planda çalışıyor:
docker stop asforces-web
docker rm asforces-web
docker-compose up --build -d web
```

**Bekleme Süresi:** 2-3 dakika (pnpm install + build)

---

## 📋 BUILD ADIMLARI

**Dockerfile:**
1. node:20-alpine (builder)
2. pnpm install
3. Packages build
4. Web app build → `/app/apps/web/dist`
5. nginx:alpine
6. COPY dist → `/usr/share/nginx/html` ✅

---

## ✅ BUILD BİTİNCE

### Kontrol 1: Container  
```bash
docker ps | grep asforces-web
# Beklenen: Up X seconds
```

### Kontrol 2: Dosyalar
```bash
docker exec asforces-web ls /usr/share/nginx/html/assets/*.js
# Beklenen: index-Db2ocgtV.js
```

### Kontrol 3: HTML
```bash
docker exec asforces-web cat /usr/share/nginx/html/index.html | grep index
# Beklenen: index-Db2ocgtV.js
```

### Kontrol 4: Site
```
https://app.asforces.com
CTRL+F5 (hard refresh)
F12 → Network → index-Db2ocgtV.js
```

---

## 🎯 YENİ BİLEŞENLER

✅ FriendsSidebar.tsx - Sıfırdan modern tasarım
✅ DirectMessagesView.tsx - 2-column layout
✅ Presence: API'den (Socket get-presence kaldırıldı)
✅ Online status: Real-time broadcast

---

## 🔍 SORUN GİDERME

### Problem: Build uzun sürüyor
```bash
# Build loglarını izle:
docker logs -f asforces-web
```

### Problem: Hala eski dosya
```bash
# Container'ı kontrol et:
docker exec asforces-web ls /usr/share/nginx/html/
```

### Problem: Site hata veriyor
```bash
# Nginx loglarını kontrol et:
docker logs asforces-nginx
```

---

**Build bekleniyor... 2-3 dakika** ⏳

