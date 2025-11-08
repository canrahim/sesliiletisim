# 🚀 ASFORCES.COM DEPLOYMENT KILAVUZU

**Sunucu:** 5.133.102.49  
**Domain:** asforces.com  
**User:** root  

---

## 📋 ADIM 1: İLK KURULUM (Sadece İlk Sefer)

PowerShell'de çalıştırın:

```powershell
# İlk kurulum - Docker, Nginx, Firewall
.\scripts\deploy-production.ps1 -FirstTime
```

Bu komut:
- ✅ Docker ve Docker Compose yükler
- ✅ Certbot yükler
- ✅ Firewall yapılandırır
- ✅ Deployment klasörü oluşturur

---

## 📋 ADIM 2: NORMAL DEPLOYMENT

```powershell
# Normal deployment
.\scripts\deploy-production.ps1
```

Bu komut:
- ✅ Projeyi build eder
- ✅ Dosyaları sunucuya transfer eder
- ✅ Nginx yapılandırır
- ✅ SSL sertifikası alır (DNS hazırsa)
- ✅ Docker container'ları başlatır
- ✅ Database migration çalıştırır

---

## 📋 ADIM 3: DNS AYARLARI

Sunucunuzu domain'e bağlamak için DNS kayıtlarını ekleyin:

```
A Record:
- Host: @ (veya boş)
- Value: 5.133.102.49
- TTL: 3600

A Record:
- Host: www
- Value: 5.133.102.49
- TTL: 3600

A Record (opsiyonel TURN server):
- Host: turn
- Value: 5.133.102.49
- TTL: 3600
```

---

## 📋 ADIM 4: SSL SERTİFİKASI (Manual)

Eğer script otomatik alamazsa:

```bash
# SSH ile bağlan
ssh root@5.133.102.49

# Certbot çalıştır
certbot certonly --standalone -d asforces.com -d www.asforces.com --non-interactive --agree-tos --email admin@asforces.com

# Nginx'i yeniden başlat
cd /var/www/asforces
docker-compose restart nginx
```

---

## 🔧 YAPILANDIRMA

### Email Ayarları

`.env.production` dosyasını düzenleyin:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@asforces.com
EMAIL_PASSWORD=your-app-password
```

### CAPTCHA Ayarları (Opsiyonel)

Cloudflare Turnstile:

```bash
CAPTCHA_ENABLED=true
TURNSTILE_SECRET_KEY=your-secret-key
VITE_TURNSTILE_SITE_KEY=your-site-key
```

---

## 📊 KONTROL KOMUTLARI

### Docker Container Durumu

```bash
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose ps"
```

### Logları Görüntüle

```bash
# Tüm servisler
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs -f"

# Sadece API
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs -f api"

# Sadece Web
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs -f web"
```

### Servisleri Yeniden Başlat

```bash
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose restart"
```

### Servisleri Durdur

```bash
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose down"
```

### Servisleri Başlat

```bash
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose up -d"
```

---

## 🔒 GÜVENLİK

### Şifreleri Değiştirin

`.env.production` dosyasındaki tüm şifreleri güvenli olanlarla değiştirin:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `TURN_PASSWORD`
- `TURN_STATIC_AUTH_SECRET`

### Firewall Kontrol

```bash
ssh root@5.133.102.49 "ufw status"
```

Açık portlar:
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 3478 (TURN TCP/UDP)
- 5349 (TURNS TCP)
- 49152-65535 (TURN media UDP)

---

## 🧪 TEST

### Health Check

```bash
curl https://asforces.com/health
# Beklenen: {"status":"ok"}
```

### API Test

```bash
curl https://asforces.com/api/health
```

### WebSocket Test

Browser console:
```javascript
const ws = new WebSocket('wss://asforces.com/socket.io/?EIO=4&transport=websocket');
ws.onopen = () => console.log('Connected!');
```

---

## 🔄 GÜNCELLEME

Kod değişikliği yaptıktan sonra:

```powershell
# Build + Deploy
.\scripts\deploy-production.ps1

# Veya build'i atla (config değişikliği için)
.\scripts\deploy-production.ps1 -SkipBuild
```

---

## 🆘 SORUN GİDERME

### Container başlamıyor

```bash
# Logları kontrol et
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs"

# Container'ı yeniden build et
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose up -d --build"
```

### Database bağlanamıyor

```bash
# PostgreSQL logları
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs postgres"

# Container'a bağlan
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose exec postgres psql -U asforces -d asforces"
```

### Nginx 502 Error

```bash
# API container çalışıyor mu?
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose ps api"

# API logları
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs api"

# Nginx logları
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose logs nginx"
```

### SSL Certificate hatası

```bash
# Manual renewal
ssh root@5.133.102.49 "certbot renew --force-renewal"

# Container'ı yeniden başlat
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose restart nginx"
```

---

## 📈 İZLEME

### Disk Kullanımı

```bash
ssh root@5.133.102.49 "df -h"
```

### Memory Kullanımı

```bash
ssh root@5.133.102.49 "free -h"
```

### Container Resource Kullanımı

```bash
ssh root@5.133.102.49 "docker stats"
```

### Docker Temizliği

```bash
# Kullanılmayan image'ları sil
ssh root@5.133.102.49 "docker system prune -a -f"
```

---

## ✅ DEPLOYMENT CHECKLIST

### Deployment Öncesi
- [ ] `.env.production` dosyası hazır
- [ ] DNS kayıtları asforces.com → 5.133.102.49
- [ ] Email SMTP ayarları yapıldı
- [ ] Güvenli şifreler oluşturuldu
- [ ] PuTTY (plink, pscp) yüklü

### Deployment Sırası
- [ ] İlk kurulum yapıldı (`-FirstTime`)
- [ ] DNS propagation tamamlandı (15-60 dk)
- [ ] SSL sertifikası alındı
- [ ] Docker container'lar çalışıyor
- [ ] Database migration tamamlandı
- [ ] Health check başarılı

### Deployment Sonrası
- [ ] https://asforces.com açılıyor
- [ ] Kayıt/Giriş çalışıyor
- [ ] WebSocket bağlantısı çalışıyor
- [ ] Email gönderimi test edildi
- [ ] TURN server test edildi
- [ ] Backup stratejisi oluşturuldu

---

## 🔐 BACKUP

### Manuel Backup

```bash
# Database backup
ssh root@5.133.102.49 "cd /var/www/asforces && docker-compose exec -T postgres pg_dump -U asforces asforces > backup-$(date +%Y%m%d).sql"

# Tüm data volumes
ssh root@5.133.102.49 "cd /var/www/asforces && tar -czf backup-volumes-$(date +%Y%m%d).tar.gz -C /var/lib/docker/volumes ."
```

### Otomatik Backup (Cron)

```bash
# Crontab düzenle
ssh root@5.133.102.49 "crontab -e"

# Her gün saat 02:00'de backup
0 2 * * * cd /var/www/asforces && docker-compose exec -T postgres pg_dump -U asforces asforces > /backups/db-$(date +\%Y\%m\%d).sql
```

---

**✅ Deployment hazır! Sorularınız için dökümantasyonu inceleyin.**

