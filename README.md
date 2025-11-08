# AsforceS Voice v2 - Sesli İletişim Platformu

> Yeni nesil, düşük gecikmeli, kurumsal sesli iletişim platformu

## 🚀 Proje Durumu

**Aşama:** 9/24 (Portal İskeleti) - ✅ TAMAMLANDI

### ✅ Tamamlanan Aşamalar (0-9)

- **Aşama 0-7:** Tüm analiz ve planlama dokümanları
- **Aşama 8:** Monorepo iskeleti
- **Aşama 9:** Portal (Landing Page) uygulaması

### 🔄 Devam Eden Çalışmalar

- **Aşama 10:** Kimlik doğrulama servisi (API Backend)
- **Aşama 11-24:** WebRTC, gerçek zamanlı iletişim özellikleri

---

## 📂 Proje Yapısı

```
AsforcesSesReact/
├── apps/
│   └── portal/                 ✅ Landing page (www.asforces.com)
│       ├── src/
│       │   ├── components/     ✅ Header, Footer, Layout
│       │   ├── pages/          ✅ Home, Features, Pricing, About, Contact
│       │   ├── i18n/           ✅ TR/EN dil desteği
│       │   ├── hooks/          📝 Custom hooks (yakında)
│       │   └── styles/         ✅ Tailwind CSS
│       └── package.json
│
├── packages/
│   ├── types/                  ✅ TypeScript tip tanımlamaları
│   ├── constants/              ✅ Sabit değerler
│   ├── utils/                  ✅ Yardımcı fonksiyonlar
│   │   ├── validation.ts       ✅ Form validasyonları
│   │   ├── format.ts           ✅ Tarih, sayı formatlama
│   │   ├── string.ts           ✅ String işlemleri
│   │   ├── browser.ts          ✅ localStorage, clipboard
│   │   ├── async.ts            ✅ Promise, debounce, throttle
│   │   ├── array.ts            ✅ Dizi işlemleri
│   │   └── object.ts           ✅ Nesne işlemleri
│   └── config/                 ✅ ESLint, TypeScript paylaşımlı yapılandırma
│
├── docs/                       ✅ Analiz dokümanları (Aşama 0-7)
├── scripts/                    📝 Deploy scriptleri (yakında)
└── tests/                      📝 E2E testler (yakında)
```

---

## 🛠️ Teknolojiler

### Frontend
- **React 18** - UI framework
- **TypeScript 5.3** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 3.4** - Styling
- **Framer Motion** - Animasyonlar
- **React Router 6** - Yönlendirme
- **Headless UI** - Accessible bileşenler

### Backend (Yakında)
- **NestJS 10** - API framework
- **Prisma 5** - ORM
- **PostgreSQL 16** - Veritabanı
- **Redis 7** - Cache & Sessions
- **Socket.io** - WebSocket

### DevOps
- **pnpm** - Paket yöneticisi
- **Turbo** - Monorepo build system
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 20+
- pnpm 8+
- Git

### Adımlar

```bash
# 1. Bağımlılıkları yükle
pnpm install

# 2. Development server başlat
pnpm dev

# 3. Portal'ı çalıştır (sadece)
cd apps/portal
pnpm dev
```

### Build

```bash
# Tüm projeyi build et
pnpm build

# Sadece Portal'ı build et
pnpm build --filter=@asforces/portal
```

---

## 📋 Kullanılabilir Scriptler

```bash
# Development
pnpm dev              # Tüm uygulamaları başlat
pnpm dev:portal       # Sadece portal

# Build
pnpm build            # Production build
pnpm build:portal     # Sadece portal build

# Lint & Type Check
pnpm lint             # ESLint kontrolü
pnpm type-check       # TypeScript kontrolü
pnpm format           # Prettier formatla

# Test
pnpm test             # Testleri çalıştır (yakında)
pnpm test:e2e         # E2E testler (yakında)

# Clean
pnpm clean            # node_modules ve build dosyalarını sil
```

---

## 🌍 Çoklu Dil Desteği

Portal TR/EN dil desteği ile gelir:

```typescript
import { useI18n } from '@/i18n';

function Component() {
  const { t, locale, setLocale } = useI18n();
  
  return (
    <div>
      <h1>{t.hero.title}</h1>
      <button onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}>
        {locale === 'tr' ? 'English' : 'Türkçe'}
      </button>
    </div>
  );
}
```

---

## 📦 Paketler

### `@asforces/types`
TypeScript tip tanımlamaları:
- User, Server, Channel, Message tipleri
- API request/response DTOları
- WebRTC tipler

### `@asforces/constants`
Sabit değerler:
- API endpoints
- WebRTC yapılandırması
- Varsayılan değerler

### `@asforces/utils`
Yardımcı fonksiyonlar:
- **Validation:** Email, password, phone validasyonu
- **Format:** Tarih, sayı, dosya boyutu formatlama
- **String:** Truncate, slugify, capitalize
- **Browser:** localStorage, clipboard, notifications
- **Async:** Debounce, throttle, retry, timeout
- **Array:** Unique, chunk, shuffle, groupBy
- **Object:** Deep clone, deep merge, pick, omit

### `@asforces/config`
Paylaşımlı yapılandırma:
- ESLint rules
- TypeScript config
- Prettier config

---

## 🎨 Tasarım Sistemi

### Renkler
```css
/* Primary - Indigo */
--color-primary-50: #eef2ff;
--color-primary-600: #4f46e5;
--color-primary-700: #4338ca;

/* Accent - Purple */
--color-accent-500: #a855f7;
--color-accent-600: #9333ea;
```

### Bileşenler
- Responsive design (mobile-first)
- Dark mode hazır (yakında)
- Accessibility (WCAG 2.1 AA)
- Framer Motion animasyonlar

---

## 🔐 Güvenlik

- ✅ Input validation
- ✅ XSS koruması
- ✅ CSRF token (yakında)
- ✅ Rate limiting (yakında)
- ✅ HTTPS only
- ✅ Content Security Policy

---

## 📊 Performans Hedefleri

- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1
- **Lighthouse Score:** > 95

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Commit Kuralları
```
feat: Yeni özellik
fix: Bug düzeltme
docs: Dokümantasyon
style: Kod formatı
refactor: Kod düzenleme
test: Test ekleme
chore: Build/config değişiklikleri
```

---

## 📝 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## 🔗 Linkler

- **Website:** https://www.asforces.com
- **App:** https://app.asforces.com
- **API Docs:** https://api.asforces.com/docs
- **GitHub:** https://github.com/canrahim/asforcereactses

---

## 📞 İletişim

- **Email:** info@asforces.com
- **Destek:** destek@asforces.com

---

## 🗺️ Roadmap

### Q1 2025
- [x] ~~Monorepo yapısı~~
- [x] ~~Portal (Landing Page)~~
- [ ] Kimlik doğrulama API
- [ ] Web uygulaması iskeleti

### Q2 2025
- [ ] WebRTC ses iletişimi
- [ ] Push-to-Talk özelliği
- [ ] Metin sohbet
- [ ] Kamera & Ekran paylaşımı

### Q3 2025
- [ ] Electron masaüstü uygulaması
- [ ] Mobil uygulama (React Native)
- [ ] Admin paneli
- [ ] Ödeme sistemi

### Q4 2025
- [ ] SFU server (mediasoup)
- [ ] Ölçeklendirme optimizasyonları
- [ ] Enterprise özellikler
- [ ] Public Beta Release

---

**Geliştirici:** [Can Rahim](https://github.com/canrahim)  
**Versiyon:** 0.1.0-alpha  
**Son Güncelleme:** Kasım 2025
