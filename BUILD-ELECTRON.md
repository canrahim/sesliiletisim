# 🖥️ AsforceS Voice - Electron Desktop Build Rehberi

Bu rehber, AsforceS Voice'u **Windows**, **macOS** ve **Linux** için **Electron desktop uygulaması** olarak nasıl paketleyeceğinizi gösterir.

---

## 📋 Gereksinimler

### Tüm Platformlar
- **Node.js** 20+
- **pnpm** 8+

### Windows Build İçin
- **Windows 10/11**
- Visual Studio Build Tools (opsiyonel)

### macOS Build İçin
- **macOS 10.15+**
- Xcode Command Line Tools

### Linux Build İçin
- **Ubuntu 20.04+** veya eşdeğeri
- `rpm-build` paketi (RPM için)

---

## 🚀 Hızlı Başlangıç

### 1️⃣ Bağımlılıkları Yükle

```bash
cd apps/desktop
pnpm install
```

### 2️⃣ Web Uygulamasını Build Et

```bash
cd ../web
pnpm install
pnpm run build
cd ../desktop
```

### 3️⃣ Desktop Uygulamayı Paketle

**Windows:**
```bash
pnpm run package:win
```

**macOS:**
```bash
pnpm run package:mac
```

**Linux:**
```bash
pnpm run package:linux
```

---

## 📦 Çıktı Dosyaları

### Windows
```
apps/desktop/release/
├── AsforceS Voice Setup 2.0.0.exe    # Installer (NSIS)
└── AsforceS Voice 2.0.0.exe          # Portable exe
```

**Boyut:** ~150 MB  
**Kurulum Yeri:** `C:\Program Files\AsforceS Voice\`

### macOS
```
apps/desktop/release/
├── AsforceS Voice-2.0.0.dmg          # DMG installer
└── AsforceS Voice-2.0.0-mac.zip      # Portable app
```

**Boyut:** ~200 MB  
**Kurulum Yeri:** `/Applications/AsforceS Voice.app`

### Linux
```
apps/desktop/release/
├── AsforceS Voice-2.0.0.AppImage     # Universal (recommended)
├── asforces-voice_2.0.0_amd64.deb    # Debian/Ubuntu
└── asforces-voice-2.0.0.x86_64.rpm   # Fedora/RHEL
```

**Boyut:** ~180 MB  
**Kurulum:**
```bash
# AppImage (tavsiye)
chmod +x AsforceS\ Voice-2.0.0.AppImage
./AsforceS\ Voice-2.0.0.AppImage

# Debian/Ubuntu
sudo dpkg -i asforces-voice_2.0.0_amd64.deb

# Fedora/RHEL
sudo rpm -i asforces-voice-2.0.0.x86_64.rpm
```

---

## 🎨 İkonlar Hazırlama

### Windows Icon (.ico)
```bash
# 256x256 PNG'den .ico oluştur
# Online tool: https://icoconvert.com
# Veya ImageMagick:
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### macOS Icon (.icns)
```bash
# 1024x1024 PNG'den .icns oluştur
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

### Linux Icon (.png)
```bash
# 512x512 veya 1024x1024 PNG
cp icon-1024.png assets/icon.png
```

---

## 🔧 Gelişmiş Konfigürasyon

### Code Signing (Opsiyonel)

**Windows:**
```json
{
  "win": {
    "certificateFile": "cert.pfx",
    "certificatePassword": "your-password"
  }
}
```

**macOS:**
```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (XXXXXXXXXX)"
  }
}
```

### Auto Update Server

**package.json'a ekle:**
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "canrahim",
      "repo": "sesliiletisim"
    }
  }
}
```

---

## 📱 Platform Özel Özellikler

### Windows
- ✅ Sistem tray'e minimize
- ✅ Otomatik başlatma
- ✅ Bildirimler
- ✅ **Oyun algılama** (League, VALORANT, CS:GO, vb.)
- ✅ Global hotkey'ler

### macOS
- ✅ Menu bar icon
- ✅ Bildirim merkezi
- ✅ Touch Bar desteği (yakında)
- ✅ Picture-in-Picture

### Linux
- ✅ System tray
- ✅ Desktop bildirimler
- ✅ .desktop dosyası

---

## 🧪 Test

### Development Mode
```bash
cd apps/desktop
pnpm run dev
```

### Production Build Test
```bash
# Build yap
pnpm run package:win

# Installer'ı çalıştır
./release/AsforceS\ Voice\ Setup\ 2.0.0.exe

# Veya portable exe
./release/AsforceS\ Voice\ 2.0.0.exe
```

---

## 🐛 Sorun Giderme

### Build Hatası
```bash
# node_modules'ı temizle
rm -rf node_modules
pnpm install

# Cache'i temizle
rm -rf dist release
pnpm run build
```

### Electron Başlamıyor
```bash
# Logları kontrol et
# Windows: %APPDATA%\AsforceS Voice\logs\main.log
# macOS: ~/Library/Logs/AsforceS Voice/main.log
# Linux: ~/.config/AsforceS Voice/logs/main.log
```

### API Bağlanamıyor
```bash
# .env dosyası oluştur
echo "ASFORCES_API_URL=https://asforces.com" > .env
pnpm run dev
```

---

## 📊 Build Süreleri (Tahmini)

| Platform | Build Süresi | Boyut |
|----------|--------------|-------|
| Windows  | ~3 dakika    | 150 MB |
| macOS    | ~4 dakika    | 200 MB |
| Linux    | ~3 dakika    | 180 MB |

---

## 🎯 Sonraki Adımlar

Build tamamlandıktan sonra:

1. **Test Et:** Installer'ı çalıştır ve tüm özellikleri test et
2. **İkonları Ekle:** `apps/desktop/assets/` klasörüne ikon dosyalarını koy
3. **Sign Et:** (Opsiyonel) Kod imzalama sertifikası ekle
4. **Publish:** GitHub Releases'e yükle veya kendi sunucunda host et

---

## 📞 Destek

**Sorun mu var?**
- 📧 Email: support@asforces.com
- 🌐 Website: https://asforces.com
- 💬 Discord: (yakında)

**Geliştirici:** Can Rahim  
**Tarih:** 8 Kasım 2025  
**Versiyon:** 2.0.0

