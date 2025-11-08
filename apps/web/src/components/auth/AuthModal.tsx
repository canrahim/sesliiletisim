import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/endpoints/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { language, setLanguage, t } = useLanguage();
  const { setAuth } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        // Login
        const response = await authApi.login({
          identifier: email,
          password,
        });
        
        const { user, accessToken, refreshToken } = response.data;
        setAuth(user, accessToken, refreshToken);
        
        // Success - modal will close automatically due to isAuthenticated change
        onClose();
      } else {
        // Register
        const response = await authApi.register({
          email,
          username,
          password,
          displayName: displayName || undefined,
        });
        
        // After register, auto login
        const loginResponse = await authApi.login({
          identifier: email,
          password,
        });
        
        const { user, accessToken, refreshToken } = loginResponse.data;
        setAuth(user, accessToken, refreshToken);
        
        // Success - modal will close automatically
        onClose();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
        (mode === 'login' ? t('loginFailed') : t('registerFailed'));
      setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'tr' : 'en');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="absolute top-4 right-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              {language === 'en' ? '🇹🇷 TR' : '🇬🇧 EN'}
            </button>
            
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'login' ? t('welcomeBack') : t('welcome')}
            </h2>
            <p className="text-white/90">AsforceS Voice</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
              />
            </div>

            {/* Username (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('usernamePlaceholder')}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                />
              </div>
            )}

            {/* Display Name (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('displayName')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('displayNamePlaceholder')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? t('loading') : (mode === 'login' ? t('login') : t('register'))}
            </button>

            {/* Toggle Mode */}
            <div className="text-center text-sm pt-2">
              <span className="text-gray-600">
                {mode === 'login' ? t('noAccount') : t('hasAccount')}
              </span>
              {' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                {mode === 'login' ? t('register') : t('login')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

