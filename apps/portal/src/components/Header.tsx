import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../i18n';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();

  const navigation = [
    { name: t.common.features, href: '/features' },
    { name: t.common.pricing, href: '/pricing' },
    { name: t.common.about, href: '/about' },
    { name: t.common.contact, href: '/contact' },
  ];

  const toggleLanguage = () => {
    setLocale(locale === 'tr' ? 'en' : 'tr');
  };

  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AsforceS Voice
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons + Language Switcher */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              title={locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
            >
              <LanguageIcon className="w-5 h-5" />
              <span className="text-sm font-medium uppercase">{locale}</span>
            </button>

            <Link
              to="https://app.asforces.com/login"
              className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
            >
              {t.common.signIn}
            </Link>
            <Link
              to="https://app.asforces.com/register"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t.common.getStarted}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-4 pb-4 border-t border-gray-200"
            >
              <div className="flex flex-col space-y-4 pt-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  {/* Mobile Language Switcher */}
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LanguageIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç'}
                    </span>
                  </button>

                  <Link
                    to="https://app.asforces.com/login"
                    className="px-4 py-2 text-center text-gray-700 hover:text-indigo-600 font-semibold transition-colors"
                  >
                    {t.common.signIn}
                  </Link>
                  <Link
                    to="https://app.asforces.com/register"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 text-center transition-colors"
                  >
                    {t.common.getStarted}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}

export default Header;
