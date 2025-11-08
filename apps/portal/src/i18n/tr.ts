export const tr = {
  common: {
    learnMore: 'Daha Fazla Bilgi',
    getStarted: 'Hemen Başla',
    signIn: 'Giriş Yap',
    signUp: 'Kayıt Ol',
    contact: 'İletişim',
    about: 'Hakkımızda',
    features: 'Özellikler',
    pricing: 'Fiyatlandırma',
    home: 'Anasayfa',
    free: 'Ücretsiz',
    perMonth: '/ay',
    comingSoon: 'Yakında',
  },
  
  hero: {
    title: 'Yeni Nesil Sesli İletişim',
    subtitle: 'AsforceS Voice ile takımınızla kristal netliğinde, düşük gecikmeli sesli iletişim kurun',
    cta: 'Ücretsiz Başlayın',
    watchDemo: 'Demo İzle',
  },
  
  features: {
    title: 'Güçlü Özellikler',
    subtitle: 'Her ihtiyacınız için tasarlanmış profesyonel araçlar',
    
    crystal: {
      title: 'Kristal Netliğinde Ses',
      description: 'Opus codec ve düşük gecikme teknolojisi ile stüdyo kalitesinde ses',
    },
    
    ptt: {
      title: 'Push-to-Talk',
      description: 'Özelleştirilebilir kısayollar ile profesyonel PTT desteği',
    },
    
    security: {
      title: 'Uçtan Uca Güvenlik',
      description: 'DTLS-SRTP ile şifrelenmiş güvenli iletişim',
    },
    
    multiplatform: {
      title: 'Çoklu Platform',
      description: 'Web, masaüstü ve mobil tüm platformlarda sorunsuz çalışır',
    },
    
    screen: {
      title: 'Ekran Paylaşımı',
      description: 'Yüksek kaliteli ekran ve kamera paylaşımı desteği',
    },
    
    channels: {
      title: 'Çoklu Kanallar',
      description: 'Organize olun - birden fazla ses ve metin kanalı',
    },
  },
  
  pricing: {
    title: 'Basit ve Şeffaf Fiyatlandırma',
    subtitle: 'İhtiyacınıza uygun planı seçin',
    
    free: {
      name: 'Ücretsiz',
      price: '₺0',
      description: 'Bireyler ve küçük takımlar için',
      features: [
        'En fazla 10 kullanıcı',
        '2 ses kanalı',
        'Temel özellikler',
        'Topluluk desteği',
      ],
    },
    
    pro: {
      name: 'Profesyonel',
      price: '₺99',
      description: 'Büyüyen takımlar için',
      features: [
        'En fazla 100 kullanıcı',
        'Sınırsız kanal',
        'Ekran paylaşımı',
        'Öncelikli destek',
        'Özel moderasyon araçları',
      ],
    },
    
    enterprise: {
      name: 'Kurumsal',
      price: 'Özel',
      description: 'Büyük organizasyonlar için',
      features: [
        'Sınırsız kullanıcı',
        'Özel sunucu',
        'SLA garantisi',
        '7/24 destek',
        'Özel entegrasyonlar',
        'Özel eğitim',
      ],
    },
  },
  
  about: {
    title: 'AsforceS Voice Hakkında',
    mission: {
      title: 'Misyonumuz',
      description: 'Takımların ve toplulukların iletişim kurma şeklini yeniden tanımlıyoruz. Düşük gecikmeli, yüksek kaliteli ses teknolojisi ile mesafeleri ortadan kaldırıyoruz.',
    },
    values: {
      title: 'Değerlerimiz',
      quality: 'Kalite',
      qualityDesc: 'Her detayda mükemmellik',
      privacy: 'Gizlilik',
      privacyDesc: 'Verileriniz sizindir',
      innovation: 'İnovasyon',
      innovationDesc: 'Sürekli gelişim',
    },
  },
  
  contact: {
    title: 'İletişime Geçin',
    subtitle: 'Sorularınız mı var? Ekibimiz size yardımcı olmak için burada.',
    form: {
      name: 'İsim',
      email: 'E-posta',
      subject: 'Konu',
      message: 'Mesaj',
      send: 'Gönder',
      namePlaceholder: 'Adınız Soyadınız',
      emailPlaceholder: 'ornek@email.com',
      subjectPlaceholder: 'Mesajınızın konusu',
      messagePlaceholder: 'Mesajınızı buraya yazın...',
    },
    info: {
      email: 'E-posta',
      phone: 'Telefon',
      address: 'Adres',
      liveSupport: 'Canlı Destek',
      liveSupportDesc: '7/24 anlık destek',
    },
  },
  
  footer: {
    tagline: 'Yeni nesil sesli iletişim platformu',
    product: 'Ürün',
    company: 'Şirket',
    support: 'Destek',
    legal: 'Yasal',
    allRightsReserved: 'Tüm hakları saklıdır.',
  },
};

export type TranslationKeys = typeof tr;
