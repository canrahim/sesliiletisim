# AŞAMA 0 - Proje Doğrulama & Risk Analizi
**Tarih**: 03 Kasım 2025
**Proje**: AsforceS Voice v2 - Kurumsal Sesli İletişim Platformu

## 📌 PROJE ÖZETİ

### Hedefler
- ✅ **Tanıtım Portalı**: www.asforces.com - Markalı landing sayfası (TR/EN)
- ✅ **Gerçek Kullanıcı Sistemi**: E-posta doğrulama, 2FA, cihaz yönetimi
- ✅ **Sesli İletişim**: WebRTC tabanlı düşük gecikmeli ses (Opus codec)
- ✅ **Ek Özellikler**: Push-to-talk, metin sohbet, kamera, ekran paylaşımı
- ✅ **Platform Desteği**: Web + Electron masaüstü uygulaması
- ✅ **Kurumsal Özellikler**: RBAC, moderasyon, audit log

### Teknik Altyapı
- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind + Zustand
- **Backend**: NestJS + Prisma + PostgreSQL + Redis
- **RTC**: WebRTC + coturn (STUN/TURN)
- **Deployment**: Docker + Nginx + HTTPS + GitHub Actions

## 🎯 BAŞARI KRİTERLERİ

### Fonksiyonel Kriterler
1. **Portal Performansı**:
   - LCP < 2.5s
   - CLS < 0.1
   - FID < 100ms
   - SEO skoru > 90

2. **Kimlik Doğrulama**:
   - E-posta doğrulama başarı oranı > %95
   - Login süresi < 2s
   - Şifre sıfırlama akışı < 5 dakika

3. **Ses İletişimi**:
   - Ses gecikmesi < 150ms
   - Opus codec kalitesi
   - PTT tepki süresi < 50ms
   - NAT traversal başarı oranı > %90

4. **Kullanılabilirlik**:
   - Uptime > %99.5
   - Concurrent kullanıcı > 1000
   - Oda başına kullanıcı > 50

### Teknik Kriterler
1. **Güvenlik**:
   - Argon2id parola hashleme
   - HTTPS/TLS 1.3
   - CSP headers
   - Rate limiting
   - CAPTCHA koruması

2. **Performans**:
   - API response time < 200ms
   - WebSocket latency < 100ms
   - Docker container başlatma < 30s

## ⚠️ RİSK ANALİZİ

### Yüksek Öncelikli Riskler

| Risk | Etki | Olasılık | Azaltma Stratejisi |
|------|------|----------|-------------------|
| **NAT/CGNAT Traversal** | Yüksek | Yüksek | - coturn 443/TCP TLS önceliği<br>- Relay-only fallback<br>- IPv6 desteği |
| **E-posta Deliverability** | Yüksek | Orta | - SPF/DKIM/DMARC yapılandırması<br>- Güvenilir SMTP sağlayıcı<br>- Fallback SMS doğrulama |
| **WebRTC Tarayıcı Uyumluluğu** | Orta | Düşük | - Adapter.js kullanımı<br>- Graceful degradation<br>- Tarayıcı uyarıları |
| **TURN Sunucu Maliyeti** | Orta | Yüksek | - Bandwidth monitoring<br>- Kullanıcı kotası<br>- P2P öncelikli bağlantı |
| **Windows Ses İzinleri** | Düşük | Orta | - Açık izin rehberi<br>- Otomatik hata yakalama<br>- Fallback ses cihazları |

### Orta Öncelikli Riskler

| Risk | Etki | Olasılık | Azaltma Stratejisi |
|------|------|----------|-------------------|
| **DDoS Saldırıları** | Orta | Orta | - Cloudflare/CDN<br>- Rate limiting<br>- IP blacklisting |
| **Veri Güvenliği** | Yüksek | Düşük | - E2E şifreleme planı<br>- GDPR/KVKK uyumu<br>- Regular backup |
| **Ölçeklenebilirlik** | Orta | Orta | - Horizontal scaling<br>- Load balancer<br>- Mediasoup SFU hazırlığı |

## ✅ DEFINITION OF DONE

### Genel Kriterler
- [ ] Kod %100 TypeScript
- [ ] Test coverage > %80
- [ ] Tüm linter/formatter kuralları geçer
- [ ] Dokümantasyon güncel
- [ ] Git commit convention uyumlu
- [ ] CI/CD pipeline başarılı

### Aşama Başarı Kriterleri
- [ ] Her aşama için analiz dokümanı
- [ ] Her aşama için test senaryoları
- [ ] Her aşama için git commit & push
- [ ] Import/Dependency Guard kontrolü
- [ ] Güvenlik kontrolü yapıldı

## 📊 SUNUCU GEREKSİNİMLERİ

### Minimum Gereksinimler
- **İşlemci**: 4 vCPU (Ryzen/Intel)
- **RAM**: 8GB DDR4
- **Disk**: 50GB NVMe SSD
- **OS**: Ubuntu 24.04 LTS
- **Network**: 1Gbps, IPv4/IPv6

### Önerilen Gereksinimler
- **İşlemci**: 8+ vCPU (Ryzen 9 5950x gibi)
- **RAM**: 16GB+ DDR4
- **Disk**: 100GB+ NVMe
- **Bandwidth**: Unlimited veya 10TB+/ay

## 🚀 DEPLOYMENT STRATEJİSİ

### Aşamalı Yayın Planı
1. **Alpha (v0.1.0)**: Temel özellikler, sınırlı kullanıcı
2. **Beta (v0.5.0)**: Tüm özellikler, genişletilmiş test
3. **RC (v0.9.0)**: Production-ready, son düzeltmeler
4. **GA (v1.0.0)**: Genel kullanıma açık

### Sunucu Konfigürasyonu
- **Domain**: asforces.com
- **Subdomains**:
  - www.asforces.com (Portal)
  - app.asforces.com (Application)
  - api.asforces.com (API)
  - turn.asforces.com (TURN)

## 📝 NOTLAR

1. **Sunucu Hazır**: Ubuntu 24.04 kurulu sunucu mevcut (5.133.102.49)
2. **Monorepo Yaklaşımı**: Kod paylaşımı ve tutarlılık için pnpm workspaces
3. **Security-First**: Tüm hassas veriler için şifreleme ve güvenlik önlemleri
4. **Progressive Enhancement**: Temel özelliklerden başlayarak kademeli geliştirme
5. **User-Centric**: Gerçek kullanıcı senaryolarına odaklanma

---

**Sonraki Aşama**: AŞAMA 1 - Monorepo Dizin ve Sorumluluklar
