# Changelog

Tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standardını takip eder,
ve bu proje [Semantic Versioning](https://semver.org/spec/v2.0.0.html) kullanır.

## [Unreleased]

### Added
- Portal (Landing Page) uygulaması oluşturuldu
- TR/EN çoklu dil desteği eklendi
- Responsive tasarım ve animasyonlar
- SEO optimizasyonları için meta tags
- Utility fonksiyonlar paketi (@asforces/utils)
  - Validation utilities
  - Format utilities
  - String utilities
  - Browser utilities
  - Async utilities
  - Array utilities
  - Object utilities
- Shared config paketi (@asforces/config)
  - ESLint yapılandırması
  - TypeScript yapılandırması
- Types paketi (@asforces/types)
- Constants paketi (@asforces/constants)

### Changed
- Monorepo yapısı pnpm workspaces ile organize edildi
- Turbo build sistemi entegre edildi

### Fixed
- Path alias'ları vite ve tsconfig'de düzenlendi

## [0.0.1] - 2025-01-XX

### Added
- İlk proje yapısı
- Monorepo iskeleti
- Geliştirme ortamı yapılandırması
- Git hooks (husky)
- Commit linting (commitlint)
- Code formatting (prettier)

[Unreleased]: https://github.com/canrahim/asforcesvoice/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/canrahim/asforcesvoice/releases/tag/v0.0.1
