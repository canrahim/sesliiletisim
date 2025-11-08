import { useState, useEffect } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { useAuthStore } from './store/auth.store';
import { AuthModal } from './components/auth/AuthModal';
import { ModernMainApp } from './components/app/ModernMainApp';
import { axiosInstance } from './api/axios';
import './test-emoji'; // Force include emoji packages in build

function App() {
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(!isAuthenticated);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  // Check for invite code in URL and handle routing
  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentRoute(window.location.pathname);
    };

    // Initial check
    const path = window.location.pathname;
    const inviteMatch = path.match(/\/invite\/([a-zA-Z0-9_-]+)/);
    if (inviteMatch) {
      setInviteCode(inviteMatch[1]);
    }

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Auto-join server when authenticated with invite code
  useEffect(() => {
    if (isAuthenticated && inviteCode) {
      handleInviteJoin(inviteCode);
    }
  }, [isAuthenticated, inviteCode]);

  const handleInviteJoin = async (code: string) => {
    try {
      const response = await axiosInstance.post(`/servers/join/${code}`);
      alert(`✅ "${response.data.name}" sunucusuna katıldınız!`);
      setInviteCode(null);
      window.history.pushState({}, '', '/');
      // Reload page to show new server
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Sunucuya katılma başarısız');
      setInviteCode(null);
      window.history.pushState({}, '', '/');
    }
  };

  // Modal'ı auth durumuna göre otomatik aç/kapat
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
    }
  }, [isAuthenticated]);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    // Login olmadan modal kapatılırsa yine açık kalsın
    if (!isAuthenticated) {
      return;
    }
    setAuthModalOpen(false);
  };

  return (
    <LanguageProvider>
      <AuthModal
        isOpen={authModalOpen && !isAuthenticated}
        onClose={closeAuthModal}
        initialMode={authMode}
      />

      {isAuthenticated ? (
        <ModernMainApp />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
          <div className="text-center text-white space-y-6">
            <h1 className="text-5xl font-bold">AsforceS Voice</h1>
            <p className="text-xl text-white/80">Yüksek kaliteli sesli sohbet platformu</p>
            <div className="space-x-4">
              <button
                onClick={() => openAuthModal('login')}
                className="px-8 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors"
              >
                Kayıt Ol
              </button>
            </div>
          </div>
        </div>
      )}
    </LanguageProvider>
  );
}

export default App;
