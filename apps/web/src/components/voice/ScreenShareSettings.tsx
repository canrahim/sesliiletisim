import React from 'react';
import { Monitor, Volume2, Zap, X } from 'lucide-react';

interface ScreenShareSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (quality: string, systemAudio: boolean) => void;
  currentQuality: string;
  currentSystemAudio: boolean;
}

export const ScreenShareSettings: React.FC<ScreenShareSettingsProps> = ({
  isOpen,
  onClose,
  onStart,
  currentQuality,
  currentSystemAudio,
}) => {
  const [selectedQuality, setSelectedQuality] = React.useState(currentQuality);
  const [systemAudio, setSystemAudio] = React.useState(currentSystemAudio);

  if (!isOpen) return null;

  const qualityOptions = [
    { value: '720p30', label: '720p (30 FPS)', description: 'Dengeli - Az bant genişliği', bitrate: '1.5' },
    { value: '720p60', label: '720p (60 FPS)', description: 'Akıcı oyunlar için', bitrate: '2.5' },
    { value: '1080p30', label: '1080p (30 FPS)', description: 'Önerilen - Yüksek kalite', bitrate: '3' },
    { value: '1080p60', label: '1080p (60 FPS)', description: 'Çok akıcı', bitrate: '4.5' },
    { value: '1440p30', label: '1440p (30 FPS)', description: 'Çok yüksek kalite', bitrate: '5' },
    { value: '1440p60', label: '1440p (60 FPS)', description: 'Ultra akıcı', bitrate: '8' },
    { value: '4k30', label: '4K (30 FPS)', description: 'Maksimum kalite', bitrate: '12' },
  ];

  const handleStart = () => {
    onStart(selectedQuality, systemAudio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Monitor className="w-7 h-7" />
                Ekran Paylaşım Ayarları
              </h2>
              <p className="text-sm text-white/80 mt-1">Kalite ve ses seçeneklerini ayarlayın</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Kalite Seçimi */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Video Kalitesi & FPS</h3>
                <p className="text-xs text-neutral-500">Yüksek kalite = Daha fazla bant genişliği</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedQuality(option.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedQuality === option.value
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-neutral-200 hover:border-blue-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900">{option.label}</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {option.bitrate} Mbps
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sistem Sesi */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900">Sistem Sesi</h3>
                <p className="text-xs text-neutral-500">Bilgisayarınızın sesini paylaşın</p>
              </div>
            </div>

            <label className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl cursor-pointer hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-bold text-neutral-900">Sistem Sesini Paylaş</p>
                  <p className="text-xs text-neutral-600">Müzik, oyun sesleri, bildirimler vs.</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={systemAudio}
                  onChange={(e) => setSystemAudio(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </div>
            </label>
          </div>

          {/* Bilgilendirme */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">💡 İpuçları:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Tüm Ekran:</strong> Sistem sesini paylaşabilirsiniz</li>
              <li>• <strong>Pencere:</strong> Sadece o pencerenin görüntüsü paylaşılır</li>
              <li>• <strong>Tab:</strong> Tarayıcı sekmesi (ses dahil olabilir)</li>
              <li>• Yüksek kalite internet gerektir (minimum 5 Mbps upload)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-semibold transition-all"
          >
            İptal
          </button>
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Monitor className="w-5 h-5" />
            Ekran Paylaşımını Başlat
          </button>
        </div>
      </div>
    </div>
  );
};

