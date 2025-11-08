import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MicrophoneIcon, 
  ShieldCheckIcon, 
  BoltIcon,
  UserGroupIcon,
  GlobeAltIcon,
  CpuChipIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

function HomePage() {
  const features = [
    {
      icon: MicrophoneIcon,
      title: 'Push-to-Talk',
      description: 'Tek tuşla konuşma özelliği ile kristal netliğinde iletişim.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Kurumsal Güvenlik',
      description: 'End-to-end şifreleme ve KVKK/GDPR uyumlu altyapı.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: BoltIcon,
      title: 'Ultra Düşük Gecikme',
      description: '<150ms gecikme ile gerçek zamanlı iletişim.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Sınırsız Ölçeklenme',
      description: '5 kişiden 5000 kişiye kadar sorunsuz büyüme.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: GlobeAltIcon,
      title: 'Global Altyapı',
      description: 'Dünya genelinde dağıtılmış sunucu ağı.',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: CpuChipIcon,
      title: 'Akıllı Ses İşleme',
      description: 'AI destekli gürültü engelleme ve echo iptal.',
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Aktif Kullanıcı' },
    { value: '99.9%', label: 'Uptime' },
    { value: '<150ms', label: 'Gecikme' },
    { value: '7/24', label: 'Destek' },
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="gradient-bg py-20 lg:py-32">
        <div className="container-max section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 rounded-full text-primary-600 text-sm font-medium mb-6">
              <SparklesIcon className="w-4 h-4" />
              <span>Yeni nesil sesli iletişim platformu</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 text-gray-900">
              Ekibiniz için{' '}
              <span className="gradient-text">Güvenli Sesli İletişim</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Discord'a profesyonel alternatif. Kristal netliğinde ses, kurumsal güvenlik, 
              kolay kullanım. Push-to-talk teknolojisi ile kesintisiz iletişim.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="https://app.asforces.com/register" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2 hover-glow">
                Ücretsiz Başla
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <Link to="/demo" className="btn-secondary text-lg px-8 py-4">
                Demo İste
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-gray-600 text-sm mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="container-max section-padding">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Güçlü <span className="gradient-text">Özellikler</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Profesyonel iletişim için ihtiyacınız olan her şey
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group card hover:scale-105 transition-transform duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-primary-600 to-accent-600 text-white">
        <div className="container-max section-padding text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Hemen Başlayın
            </h2>
            <p className="text-xl mb-10 text-white/90">
              14 gün ücretsiz deneme. Kredi kartı gerektirmez. 
              5 dakikada kurulum.
            </p>
            <Link 
              to="https://app.asforces.com/register" 
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center gap-2 hover:bg-gray-100 transition-colors"
            >
              Ücretsiz Hesap Oluştur
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
