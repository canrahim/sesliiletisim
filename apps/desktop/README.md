# 🖥️ AsforceS Voice - Desktop Application

Electron tabanlı profesyonel sesli iletişim uygulaması.

---

## 📦 Kurulum

```bash
cd apps/desktop
pnpm install
```

---

## 🚀 Geliştirme

```bash
# Development mode (Vite dev server ile)
pnpm run dev

# Sadece Electron'u başlat
pnpm run dev:electron

# Production build test
pnpm start
```

---

## 📦 Paketleme (Build)

### Windows
```bash
pnpm run package:win
```
**Çıktı:** `release/AsforceS Voice Setup X.X.X.exe`

### macOS
```bash
pnpm run package:mac
```
**Çıktı:** `release/AsforceS Voice-X.X.X.dmg`

### Linux
```bash
pnpm run package:linux
```
**Çıktı:** 
- `release/AsforceS Voice-X.X.X.AppImage`
- `release/asforces-voice_X.X.X_amd64.deb`
- `release/asforces-voice-X.X.X.x86_64.rpm`

---

## 🎯 Özellikler

### ✅ Temel Özellikler
- 🌐 **Web uygulaması entegrasyonu** (Electron + React)
- 🔄 **Otomatik güncellemeler** (electron-updater)
- 📌 **System tray** desteği
- 💾 **Kullanıcı ayarlarını kaydetme**
- 🪟 **Pencere boyutu/konum hatırlama**
- 🔗 **Deep linking** desteği

### 🎮 Desktop Özel Özellikler
- 🎮 **Otomatik oyun algılama** (Windows)
  - League of Legends
  - VALORANT
  - CS:GO
  - GTA V
  - Fortnite
  - Rocket League
  - Minecraft
- 📊 **Sistem bilgileri**
- 🔔 **Desktop bildirimler**
- ⌨️ **Global hotkey** desteği
- 🖱️ **Tray menüsü**

---

## 📁 Klasör Yapısı

```
apps/desktop/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script (güvenli bridge)
│   └── types.d.ts       # TypeScript definitions
├── assets/
│   ├── icon.ico         # Windows icon
│   ├── icon.icns        # macOS icon
│   ├── icon.png         # Linux icon
│   └── tray-icon.png    # System tray icon
├── dist/                # Compiled TypeScript
├── release/             # Built installers
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Konfigürasyon

### electron-builder Config (package.json)

```json
{
  "build": {
    "appId": "com.asforces.voice",
    "productName": "AsforceS Voice",
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "category": "public.app-category.social-networking"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Network;InstantMessaging"
    }
  }
}
```

---

## 🌐 API Bağlantısı

Uygulama varsayılan olarak **https://app.asforces.com** adresine bağlanır.

Farklı bir API kullanmak için:

```bash
# Environment variable
ASFORCES_API_URL=https://custom-api.com pnpm run dev

# Veya .env dosyası
echo "ASFORCES_API_URL=https://custom-api.com" > .env
```

---

## 🎮 Oyun Algılama

Windows'ta otomatik çalışır. Algılanan oyunlar:
- **League of Legends**
- **VALORANT**
- **CS:GO**
- **GTA V**
- **Fortnite**
- **Rocket League**
- **Minecraft**

Yeni oyun eklemek için `src/main.ts` içindeki `games` array'ine ekle.

---

## 🔄 Auto Update

Production build'de otomatik güncelleme aktif.

**Update sunucusu:** GitHub Releases

Yeni versiyon yayınlamak için:
1. `package.json` içinde version'u artır
2. GitHub'da yeni release oluştur
3. Build dosyalarını release'e yükle
4. Uygulama otomatik güncellemeyi tespit eder

---

## 📝 Notlar

- **Development:** Electron, Vite dev server'a (port 3002) bağlanır
- **Production:** Electron, build edilmiş web uygulamasını yükler
- **Tray:** Uygulama kapatıldığında tray'de çalışmaya devam eder
- **Single instance:** Sadece 1 instance çalışabilir

---

## 🐛 Debug

```bash
# Electron loglarını göster
tail -f ~/Library/Logs/AsforceS\ Voice/main.log  # macOS
tail -f ~/.config/AsforceS\ Voice/logs/main.log  # Linux
type %APPDATA%\AsforceS Voice\logs\main.log      # Windows
```

---

## 📄 Lisans

PROPRIETARY - © 2025 AsforceS

**Geliştirici:** Can Rahim  
**Website:** https://asforces.com  
**Destek:** support@asforces.com

