import React, { useState, useEffect } from 'react';
import { X, User, Mic, Volume2, Image as ImageIcon, Save, Mail, AtSign, Keyboard, Gamepad2, MicOff, Headphones } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { axiosInstance } from '../../api/axios';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onAvatarClick?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, showToast, onAvatarClick }) => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'audio' | 'ptt'>('profile');
  
  // Profile fields
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Audio devices
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  
  // PTT settings
  const [pushToTalk, setPushToTalk] = useState(() => localStorage.getItem('pushToTalk') === 'true');
  const [pttKey, setPttKey] = useState(() => localStorage.getItem('pttKey') || 'Space');
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [inputVolume, setInputVolume] = useState(() => Number(localStorage.getItem('inputVolume') || 100));
  const [outputVolume, setOutputVolume] = useState(() => Number(localStorage.getItem('outputVolume') || 100));
  const [muteHotkey, setMuteHotkey] = useState(() => localStorage.getItem('muteHotkey') || 'Ctrl+M');
  const [deafenHotkey, setDeafenHotkey] = useState(() => localStorage.getItem('deafenHotkey') || 'Ctrl+D');
  
  useEffect(() => {
    if (isOpen && activeTab === 'audio') {
      loadAudioDevices();
    }
  }, [isOpen, activeTab]);
  
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };
  
  const saveProfile = async () => {
    try {
      const response = await axiosInstance.patch('/users/me', {
        displayName: displayName.trim() || username,
      });
      
      // Update user in store
      if (response.data) {
        setUser({ ...user!, displayName: response.data.displayName });
      }
      
      showToast('success', '✅ Profil güncellendi!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      showToast('error', error.response?.data?.message || 'Profil güncellenemedi');
    }
  };
  
  const saveAudioSettings = () => {
    // Save to localStorage
    if (selectedMicrophone) {
      localStorage.setItem('selectedMicrophone', selectedMicrophone);
    }
    if (selectedSpeaker) {
      localStorage.setItem('selectedSpeaker', selectedSpeaker);
    }
    showToast('success', '✅ Ses ayarları kaydedildi!');
  };
  
  const savePTTSettings = () => {
    localStorage.setItem('pushToTalk', String(pushToTalk));
    localStorage.setItem('pttKey', pttKey);
    localStorage.setItem('inputVolume', String(inputVolume));
    localStorage.setItem('outputVolume', String(outputVolume));
    localStorage.setItem('muteHotkey', muteHotkey);
    localStorage.setItem('deafenHotkey', deafenHotkey);
    showToast('success', '✅ Konuşma ayarları kaydedildi!');
  };
  
  const startKeyRecording = () => {
    setIsRecordingKey(true);
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Modifier tuşlarını yoksay
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }
      
      // Tuş kombinasyonunu oluştur
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key === ' ' ? 'Space' : e.key);
      
      setPttKey(parts.join('+'));
      setIsRecordingKey(false);
      window.removeEventListener('keydown', handleKeyPress, true);
    };
    
    window.addEventListener('keydown', handleKeyPress, true);
    
    // 10 saniye timeout
    setTimeout(() => {
      if (isRecordingKey) {
        setIsRecordingKey(false);
        window.removeEventListener('keydown', handleKeyPress, true);
      }
    }, 10000);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ayarlar</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-4 font-semibold transition-all ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profil
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-6 py-4 font-semibold transition-all ${
              activeTab === 'audio'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Ses Cihazları
          </button>
          <button
            onClick={() => setActiveTab('ptt')}
            className={`px-6 py-4 font-semibold transition-all ${
              activeTab === 'ptt'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Keyboard className="w-4 h-4 inline mr-2" />
            Bas-Konuş
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* User Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-center gap-6">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl ring-4 ring-blue-200 overflow-hidden">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar.startsWith('http') ? user.avatar : `${typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' ? 'https://asforces.com' : 'http://localhost:3000'}${user.avatar}`}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-neutral-900 mb-1">{user?.username}</h3>
                    <p className="text-blue-700 font-medium mb-3">@{user?.username}</p>
                    <button 
                      onClick={onAvatarClick}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Avatar Değiştir (GIF ✨)
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Username (Read only) */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-blue-600" />
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-5 py-3.5 bg-neutral-100 border-2 border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed font-medium"
                  placeholder="kullaniciadi"
                />
                <p className="text-xs text-neutral-500 mt-2">Kullanıcı adı değiştirilemez</p>
              </div>
              
              {/* Display Name */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Görünür Ad
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white border-2 border-neutral-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium"
                  placeholder="Görünür Adınız"
                />
                <p className="text-xs text-neutral-600 mt-2">Diğer kullanıcılar bu adı görecek</p>
              </div>
              
              {/* Email (Read only) */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-5 py-3.5 bg-neutral-100 border-2 border-neutral-200 rounded-xl text-neutral-500 cursor-not-allowed font-medium"
                  placeholder="email@example.com"
                />
                <p className="text-xs text-neutral-500 mt-2">E-posta değiştirilemez</p>
              </div>
              
              <button
                onClick={saveProfile}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <Save className="w-5 h-5" />
                Profili Kaydet
              </button>
            </div>
          ) : activeTab === 'audio' ? (
            <div className="space-y-6">
              {/* Microphone Selection */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                  Mikrofon
                </label>
                <select
                  value={selectedMicrophone}
                  onChange={(e) => setSelectedMicrophone(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Varsayılan Mikrofon</option>
                  {audioDevices.filter(d => d.kind === 'audioinput').map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Mikrofon ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Speaker Selection */}
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  Hoparlör
                </label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border-2 border-neutral-200 rounded-xl focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Varsayılan Hoparlör</option>
                  {audioDevices.filter(d => d.kind === 'audiooutput').map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Hoparlör ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Test Audio */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-neutral-800 mb-3">Mikrofon Testi</h3>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
                    🎤 Test Et
                  </button>
                  <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 w-0 transition-all"></div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={saveAudioSettings}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <Save className="w-5 h-5" />
                Ses Ayarlarını Kaydet
              </button>
            </div>
          ) : activeTab === 'ptt' ? (
            <div className="space-y-6">
              {/* Push-to-Talk Kartı */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-blue-600" />
                  Bas-Konuş (Push-to-Talk)
                </h3>
                
                <div className="space-y-4">
                  {/* PTT Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushToTalk}
                      onChange={(e) => setPushToTalk(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-neutral-900 font-semibold">Push-to-Talk Modu</span>
                      <p className="text-xs text-neutral-600">Atanan tuşa basılı tutarak konuşun</p>
                    </div>
                  </label>
                  
                  {/* PTT Tuş Atama */}
                  {pushToTalk && (
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">
                        Bas-Konuş Tuşu
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 px-4 py-3 bg-white border-2 border-neutral-300 rounded-xl font-mono text-neutral-900 font-semibold flex items-center justify-center">
                          {isRecordingKey ? (
                            <span className="text-blue-600 animate-pulse">Bir tuşa basın...</span>
                          ) : (
                            pttKey
                          )}
                        </div>
                        <button
                          onClick={isRecordingKey ? () => setIsRecordingKey(false) : startKeyRecording}
                          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                            isRecordingKey
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isRecordingKey ? 'İptal' : 'Değiştir'}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-600 mt-2">💡 Space, F1-F12, veya kombinasyonlar (Ctrl+T, Alt+V, vb.)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ses Seviyeleri Kartı */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-green-600" />
                  Ses Seviyeleri
                </h3>
                
                <div className="space-y-4">
                  {/* Mikrofon Seviyesi */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-green-600" />
                        Mikrofon Giriş
                      </span>
                      <span className="text-blue-600">{inputVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={inputVolume}
                      onChange={(e) => setInputVolume(Number(e.target.value))}
                      className="w-full h-3 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:shadow-lg"
                    />
                    <p className="text-xs text-neutral-600 mt-1">Mikrofon giriş seviyesi (0-200%)</p>
                  </div>
                  
                  {/* Hoparlör Seviyesi */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-green-600" />
                        Hoparlör Çıkış
                      </span>
                      <span className="text-blue-600">{outputVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={outputVolume}
                      onChange={(e) => setOutputVolume(Number(e.target.value))}
                      className="w-full h-3 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-green-500 [&::-webkit-slider-thumb]:to-green-600 [&::-webkit-slider-thumb]:shadow-lg"
                    />
                    <p className="text-xs text-neutral-600 mt-1">Hoparlör çıkış seviyesi (0-200%)</p>
                  </div>
                </div>
              </div>

              {/* Kısayol Tuşları Kartı */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-purple-600" />
                  Kısayol Tuşları
                </h3>
                
                <div className="space-y-4">
                  {/* Mute Hotkey */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                      <MicOff className="w-4 h-4 text-red-600" />
                      Mikrofon Aç/Kapat
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={muteHotkey}
                        onChange={(e) => setMuteHotkey(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border-2 border-neutral-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-mono"
                        placeholder="Ctrl+M"
                      />
                      <button
                        onClick={() => setMuteHotkey('Ctrl+M')}
                        className="px-4 py-3 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-sm font-semibold transition-all"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                  
                  {/* Deafen Hotkey */}
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-red-600" />
                      Kulaklığı Kapat
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={deafenHotkey}
                        onChange={(e) => setDeafenHotkey(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border-2 border-neutral-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all font-mono"
                        placeholder="Ctrl+D"
                      />
                      <button
                        onClick={() => setDeafenHotkey('Ctrl+D')}
                        className="px-4 py-3 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-sm font-semibold transition-all"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bilgi Kartı */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-neutral-800 mb-2 flex items-center gap-2">
                  💡 Kullanım İpuçları
                </h4>
                <ul className="text-sm text-neutral-700 space-y-1">
                  <li>• <strong>Push-to-Talk:</strong> Oyunlarda mikrofon kontrolü için ideal</li>
                  <li>• <strong>Ses Seviyeleri:</strong> %100'ün üzeri ses yükseltme için</li>
                  <li>• <strong>Kısayollar:</strong> Oyun içinde hızlıca ses kontrol edin</li>
                </ul>
              </div>
              
              <button
                onClick={savePTTSettings}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
              >
                <Save className="w-5 h-5" />
                Konuşma Ayarlarını Kaydet
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};


