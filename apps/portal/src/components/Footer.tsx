import { Link } from 'react-router-dom';

function Footer() {
  const footerLinks = {
    product: [
      { name: 'Özellikler', href: '/features' },
      { name: 'Fiyatlandırma', href: '/pricing' },
      { name: 'Yol Haritası', href: '/roadmap' },
      { name: 'Değişiklikler', href: '/changelog' },
    ],
    resources: [
      { name: 'Dokümantasyon', href: 'https://docs.asforces.com' },
      { name: 'API', href: 'https://api.asforces.com' },
      { name: 'Blog', href: '/blog' },
      { name: 'Destek', href: '/support' },
    ],
    company: [
      { name: 'Hakkımızda', href: '/about' },
      { name: 'Kariyer', href: '/careers' },
      { name: 'İletişim', href: '/contact' },
      { name: 'Basın', href: '/press' },
    ],
    legal: [
      { name: 'Kullanım Koşulları', href: '/terms' },
      { name: 'Gizlilik', href: '/privacy' },
      { name: 'KVKK', href: '/kvkk' },
      { name: 'Çerezler', href: '/cookies' },
    ],
  };

  const socialLinks = [
    { name: 'Twitter', href: 'https://twitter.com/asforces' },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/asforces' },
    { name: 'GitHub', href: 'https://github.com/asforces' },
    { name: 'YouTube', href: 'https://youtube.com/@asforces' },
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container-max section-padding py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-xl font-bold gradient-text">AsforceS</span>
            </Link>
            <p className="mt-4 text-gray-600 text-sm">
              Kurumsal sesli iletişim platformu. Discord'a profesyonel alternatif.
            </p>
            <div className="flex space-x-4 mt-6">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <span className="sr-only">{link.name}</span>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-primary-100">
                    <span className="text-xs font-semibold">{link.name[0]}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ürün</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Kaynaklar</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Şirket</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Yasal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-primary-600 text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2025 AsforceS. Tüm hakları saklıdır.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <button className="text-gray-600 hover:text-primary-600 text-sm transition-colors">
              🇹🇷 Türkçe
            </button>
            <button className="text-gray-400 hover:text-primary-600 text-sm transition-colors">
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
