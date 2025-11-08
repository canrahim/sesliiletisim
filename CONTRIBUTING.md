# Katkıda Bulunma Rehberi

AsforceS Voice projesine katkıda bulunmak istediğiniz için teşekkür ederiz! 🎉

## 📋 İçindekiler

- [Davranış Kuralları](#davranış-kuralları)
- [Nasıl Katkıda Bulunabilirim?](#nasıl-katkıda-bulunabilirim)
- [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
- [Commit Kuralları](#commit-kuralları)
- [Pull Request Süreci](#pull-request-süreci)
- [Kod Standartları](#kod-standartları)

## Davranış Kuralları

Bu projeye katılan herkes [Davranış Kurallarımıza](CODE_OF_CONDUCT.md) uymayı kabul eder.

## Nasıl Katkıda Bulunabilirim?

### 🐛 Bug Raporlama

1. [Issues](https://github.com/canrahim/asforcesvoice/issues) sayfasında benzer bir bug olup olmadığını kontrol edin
2. Yoksa yeni bir issue açın
3. Bug'ı detaylı açıklayın:
   - Adımları
   - Beklenen davranış
   - Gerçekleşen davranış
   - Ekran görüntüleri (varsa)
   - Ortam bilgileri (OS, browser, versiyon)

### ✨ Özellik Önerisi

1. [Issues](https://github.com/canrahim/asforcesvoice/issues) sayfasında benzer bir öneri olup olmadığını kontrol edin
2. Yoksa yeni bir issue açın ve "enhancement" etiketi ekleyin
3. Özelliği detaylı açıklayın:
   - Kullanım senaryosu
   - Beklenen davranış
   - Alternatif çözümler
   - Mockup'lar (varsa)

### 💻 Kod Katkısı

1. Issue'yu kendinize atayın veya yeni bir issue oluşturun
2. Fork yapın
3. Feature branch oluşturun
4. Kodunuzu yazın
5. Testler ekleyin
6. Pull Request açın

## Geliştirme Ortamı Kurulumu

### Gereksinimler

- Node.js 20+
- pnpm 8+
- Git

### Kurulum

```bash
# 1. Repository'yi fork edin ve clone yapın
git clone https://github.com/YOUR_USERNAME/asforcesvoice.git
cd asforcesvoice

# 2. Upstream remote ekleyin
git remote add upstream https://github.com/canrahim/asforcesvoice.git

# 3. Bağımlılıkları yükleyin
pnpm install

# 4. Development server'ı başlatın
pnpm dev

# 5. Yeni branch oluşturun
git checkout -b feature/my-feature
```

## Commit Kuralları

Bu proje [Conventional Commits](https://www.conventionalcommits.org/) standardını kullanır.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipler

- **feat**: Yeni özellik
- **fix**: Bug düzeltme
- **docs**: Dokümantasyon
- **style**: Kod formatı (kod mantığını etkilemeyen)
- **refactor**: Refactoring
- **perf**: Performans iyileştirmesi
- **test**: Test ekleme/düzeltme
- **chore**: Build, CI, bağımlılık güncellemeleri
- **ci**: CI yapılandırması
- **revert**: Commit geri alma

### Scope (Opsiyonel)

- **portal**: Landing page
- **api**: Backend API
- **web**: Web uygulaması
- **electron**: Masaüstü uygulaması
- **types**: Type tanımlamaları
- **utils**: Utility fonksiyonlar
- **config**: Yapılandırma

### Örnekler

```bash
feat(portal): add language switcher to header

fix(api): resolve authentication token expiration issue

docs: update README with new installation steps

style: format code with prettier

refactor(web): extract voice channel logic to hook

perf(api): optimize database queries

test(utils): add unit tests for validation functions

chore: upgrade dependencies to latest versions

ci: add docker build to GitHub Actions
```

### Breaking Changes

Breaking change yapıyorsanız footer'a ekleyin:

```bash
feat(api): change authentication endpoint

BREAKING CHANGE: /auth/login endpoint moved to /auth/v2/login
```

## Pull Request Süreci

### 1. Branch Oluşturma

```bash
# Feature branch
git checkout -b feature/add-dark-mode

# Bug fix branch
git checkout -b fix/login-error

# Docs branch
git checkout -b docs/api-documentation
```

### 2. Kod Yazma

- Kod standartlarına uyun
- Testler ekleyin
- Dokümantasyon güncelleyin

### 3. Commit

```bash
# Stage changes
git add .

# Commit (conventional format)
git commit -m "feat(portal): add dark mode toggle"
```

### 4. Push

```bash
git push origin feature/add-dark-mode
```

### 5. Pull Request Açma

1. GitHub'da repository'nize gidin
2. "Pull Request" butonuna tıklayın
3. Base: `main`, Compare: `feature/add-dark-mode`
4. Başlık ve açıklama yazın:

```markdown
## Açıklama
Dark mode toggle özelliği eklendi

## Değişiklikler
- Theme context oluşturuldu
- Toggle butonu Header'a eklendi
- localStorage'da tema tercihi saklanıyor

## Test
- [ ] Manuel test yapıldı
- [ ] Unit testler eklendi
- [ ] Responsiveness kontrol edildi

## Ekran Görüntüleri
(Varsa ekleyin)

## İlgili Issue
Closes #123
```

### 6. Review Süreci

- Otomatik kontrollerden (CI/CD) geçtiğinden emin olun
- Reviewer feedback'lerini işleyin
- Değişiklikleri push edin
- Merge onayı bekleyin

## Kod Standartları

### TypeScript

```typescript
// ✅ İyi
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Kötü
function getUser(id: any): any {
  // ...
}
```

### React Components

```typescript
// ✅ İyi
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );
}

// ❌ Kötü
export function Button(props: any) {
  return <button {...props} />;
}
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile`, `VoiceChannel`)
- **Functions**: camelCase (`getUserById`, `handleClick`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Files**: kebab-case (`user-profile.tsx`, `voice-channel.ts`)

### Comments

```typescript
// ✅ İyi - Kompleks mantığı açıklayan comment
// Calculate retry delay with exponential backoff
const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

// ❌ Kötü - Açık kodu açıklayan gereksiz comment
// Increment counter
counter++;
```

### Imports

```typescript
// ✅ İyi - Organize edilmiş imports
import React, { useState, useEffect } from 'react';

import { getUserById } from '@/api/users';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

import type { User } from '@asforces/types';

// ❌ Kötü - Karmaşık imports
import { Button } from '@/components/Button';
import type { User } from '@asforces/types';
import React, { useState, useEffect } from 'react';
import { getUserById } from '@/api/users';
```

## Test Yazma

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { formatFileSize } from '@asforces/utils';

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('should handle zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Dokümantasyon

- Yeni özellikler için README güncelleyin
- Kompleks fonksiyonlar için JSDoc ekleyin
- API değişiklikleri için CHANGELOG güncelleyin

## Sorularınız mı var?

- [Discord](https://discord.gg/asforces) topluluğumuza katılın
- [Discussions](https://github.com/canrahim/asforcesvoice/discussions) sayfasında soru sorun
- Email: dev@asforces.com

Katkılarınız için teşekkürler! 🙏
