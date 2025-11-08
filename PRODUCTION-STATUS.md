# 🚀 AsforceS Voice V2 - Production Status

## ✅ Deployment Tamamlandı

**Tarih:** 4 Kasım 2025  
**Durum:** PRODUCTION READY ✅  
**Domain:** https://asforces.com  
**SSL:** Let's Encrypt (Valid until: Jan 30, 2026)

---

## 🌐 Production Endpoints

### HTTPS (Güvenli)
- **Ana Sayfa:** https://asforces.com/
- **API Base:** https://asforces.com/api/v1/
- **Auth:** https://asforces.com/api/v1/auth/
- **Servers:** https://asforces.com/api/v1/servers/
- **Channels:** https://asforces.com/api/v1/channels/
- **Messages:** https://asforces.com/api/v1/messages/
- **WebSocket:** wss://asforces.com/socket.io/

### HTTP
- Tüm HTTP istekleri otomatik olarak HTTPS'e yönlendirilir (301)

---

## 🏗️ Altyapı

### Container'lar
```
✅ asforces-nginx      → Reverse Proxy (80, 443)
✅ asforces-api        → NestJS API (3000)
✅ asforces-postgres   → PostgreSQL 16 (5432)
✅ asforces-redis      → Redis 7 (6379)
```

### Portlar
- **80:** HTTP (Auto-redirect to HTTPS)
- **443:** HTTPS (SSL/TLS)
- **3001:** Direct API Access (Development)
- **5432:** PostgreSQL (Internal)
- **6379:** Redis (Internal)

---

## 🔒 SSL/TLS Configuration

### Sertifika Bilgileri
- **Issuer:** Let's Encrypt (E7)
- **Valid From:** Nov 1, 2025
- **Valid Until:** Jan 30, 2026
- **Domains:** asforces.com, www.asforces.com
- **Location:** `/etc/nginx/ssl/live/asforces.com/`

### SSL Features
- ✅ TLS 1.2 & 1.3
- ✅ Modern cipher suites
- ✅ HSTS enabled (max-age: 63072000)
- ✅ OCSP stapling
- ✅ Perfect Forward Secrecy

---

## 🛡️ Security Features

### Nginx
- Rate limiting (general, api, auth)
- Connection limiting
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- WebSocket proxy support

### API
- JWT Authentication
- Password hashing (Argon2)
- CORS configured
- Input validation (class-validator)
- SQL injection protection (Prisma ORM)

---

## 📊 Database

### PostgreSQL
- **Database:** asforces
- **User:** asforces
- **Version:** 16-alpine
- **Volume:** postgres_data

### Redis
- **Host:** redis
- **Port:** 6379
- **Password:** Configured
- **Volume:** redis_data

---

## 🔧 Environment Variables

### Production Settings
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
API_PREFIX=api

CORS_ORIGIN=https://asforces.com,https://www.asforces.com
VITE_API_URL=https://asforces.com/api
VITE_WS_URL=wss://asforces.com
```

### Database
```env
POSTGRES_DB=asforces
POSTGRES_USER=asforces
POSTGRES_PASSWORD=***
```

### Redis
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=***
```

### JWT
```env
JWT_SECRET=***
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=***
JWT_REFRESH_EXPIRES_IN=30d
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/login` - Giriş
- `POST /api/v1/auth/logout` - Çıkış
- `POST /api/v1/auth/refresh` - Token yenileme
- `POST /api/v1/auth/forgot-password` - Şifre sıfırlama
- `POST /api/v1/auth/reset-password` - Şifre yenileme
- `GET /api/v1/auth/me` - Kullanıcı bilgileri

### Servers
- `POST /api/v1/servers` - Server oluştur
- `GET /api/v1/servers` - Server listesi
- `GET /api/v1/servers/:id` - Server detay
- `PATCH /api/v1/servers/:id` - Server güncelle
- `DELETE /api/v1/servers/:id` - Server sil
- `POST /api/v1/servers/:id/invite` - Davet kodu oluştur

### Channels
- `POST /api/v1/channels/server/:serverId` - Kanal oluştur
- `GET /api/v1/channels/server/:serverId` - Kanal listesi
- `GET /api/v1/channels/:id` - Kanal detay
- `PATCH /api/v1/channels/:id` - Kanal güncelle
- `DELETE /api/v1/channels/:id` - Kanal sil

### Messages
- `POST /api/v1/messages/channel/:channelId` - Mesaj gönder
- `GET /api/v1/messages/channel/:channelId` - Mesaj listesi
- `GET /api/v1/messages/:id` - Mesaj detay
- `PATCH /api/v1/messages/:id` - Mesaj düzenle
- `DELETE /api/v1/messages/:id` - Mesaj sil

### WebSocket Events
- `connection` - Bağlantı
- `join-channel` - Kanala katıl
- `leave-channel` - Kanaldan ayrıl
- `send-message` - Mesaj gönder
- `typing` - Yazıyor göstergesi

---

## 🧪 Test Komutları

### HTTPS Test
```bash
curl -I https://asforces.com/
# Expected: 200 OK with SSL

curl -I http://asforces.com/
# Expected: 301 Redirect to HTTPS
```

### API Test
```bash
# Register
curl -X POST https://asforces.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@1234",
    "displayName": "Test User"
  }'

# Login
curl -X POST https://asforces.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### SSL Certificate Check
```bash
echo | openssl s_client -connect asforces.com:443 -servername asforces.com 2>/dev/null | openssl x509 -noout -dates
```

---

## 🔄 Maintenance

### Container Yönetimi
```bash
# Servisleri başlat
cd /var/www/asforces
docker-compose up -d

# Servisleri durdur
docker-compose down

# Logları görüntüle
docker-compose logs -f

# Nginx reload
docker-compose exec nginx nginx -s reload

# API restart
docker-compose restart api
```

### SSL Renewal
```bash
# Manuel renewal (şu an gerekmez, Ocak 2026'ya kadar geçerli)
docker-compose run --rm certbot renew

# Nginx reload after renewal
docker-compose exec nginx nginx -s reload
```

### Database Backup
```bash
# Backup
docker-compose exec postgres pg_dump -U asforces asforces > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U asforces asforces < backup_20251104.sql
```

---

## 📈 Monitoring

### Container Status
```bash
docker-compose ps
```

### Logs
```bash
# Tüm loglar
docker-compose logs

# Sadece API
docker-compose logs api

# Canlı izleme
docker-compose logs -f api
```

### Resource Usage
```bash
docker stats
```

---

## 🚨 Troubleshooting

### API Çalışmıyor
```bash
# Container durumunu kontrol et
docker-compose ps

# Logları kontrol et
docker-compose logs api --tail=100

# Restart
docker-compose restart api
```

### Nginx Hataları
```bash
# Config test
docker-compose exec nginx nginx -t

# Reload
docker-compose exec nginx nginx -s reload

# Restart
docker-compose restart nginx
```

### Database Bağlantı Sorunu
```bash
# PostgreSQL durumu
docker-compose ps postgres

# Database'e bağlan
docker-compose exec postgres psql -U asforces -d asforces

# Connection test
docker-compose exec api node -e "require('./dist/main.js')"
```

---

## 📦 Deployment Checklist

- [x] TypeScript build başarılı
- [x] Docker images oluşturuldu
- [x] Container'lar çalışıyor
- [x] Database bağlantısı aktif
- [x] Redis bağlantısı aktif
- [x] Nginx reverse proxy yapılandırıldı
- [x] SSL sertifikası yüklendi
- [x] HTTPS aktif
- [x] HTTP → HTTPS redirect çalışıyor
- [x] Domain DNS yapılandırması tamamlandı
- [x] API endpoints test edildi
- [x] WebSocket desteği aktif
- [x] Security headers yapılandırıldı
- [x] Rate limiting aktif
- [x] CORS yapılandırıldı

---

## 🎯 Sonraki Adımlar

### Acil Öncelikler
- [ ] Email SMTP yapılandırması (şifre sıfırlama için)
- [ ] Production log management
- [ ] Monitoring/alerting sistemi
- [ ] Automated backup sistemi

### İsteğe Bağlı
- [ ] SSL auto-renewal cron job
- [ ] Coturn TURN server (WebRTC için)
- [ ] Frontend deployment (web & portal apps)
- [ ] CDN entegrasyonu
- [ ] Load balancing (gerekirse)

---

## 📞 Erişim Bilgileri

### Server
- **IP:** 5.133.102.49
- **OS:** Ubuntu
- **Docker:** Installed
- **Docker Compose:** v2.x

### Domain
- **Primary:** asforces.com
- **WWW:** www.asforces.com
- **DNS:** Configured

### Credentials
- Tüm credentials `.env` dosyasında
- Database: PostgreSQL (encrypted password)
- Redis: Password protected
- JWT: Secure keys configured

---

## ✅ Production Ready

**AsforceS Voice V2 sistemi production ortamında çalışıyor ve kullanıma hazır! 🎉**

**Son Güncelleme:** 4 Kasım 2025  
**Durum:** ✅ ACTIVE & SECURE

