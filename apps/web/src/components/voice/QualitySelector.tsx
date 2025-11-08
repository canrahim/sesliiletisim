import React, { useState } from 'react';
import { Zap } from 'lucide-react';

export type ScreenQuality = 'low' | 'medium' | 'high' | 'ultra';

interface QualitySelectorProps {
  currentQuality: ScreenQuality;
  onQualityChange: (quality: ScreenQuality) => void;
}

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Düşük (720p)', fps: 15, bitrate: 500000, icon: '📶' },
  { value: 'medium', label: 'Orta (1080p)', fps: 24, bitrate: 1500000, icon: '📶📶' },
  { value: 'high', label: 'Yüksek (1080p)', fps: 30, bitrate: 2500000, icon: '📶📶📶' },
  { value: 'ultra', label: 'Ultra (1440p)', fps: 60, bitrate: 4000000, icon: '📶📶📶📶' },
];

export const QualitySelector: React.FC<QualitySelectorProps> = ({ 
  currentQuality, 
  onQualityChange 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-2"
        title="Kalite Ayarları"
      >
        <Zap className="w-4 h-4" />
        <span className="text-xs font-semibold">
          {QUALITY_OPTIONS.find(q => q.value === currentQuality)?.label.split(' ')[0]}
        </span>
      </button>

      {showMenu && (
        <div className="absolute bottom-full mb-2 right-0 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700 py-2 min-w-56 z-50">
          <div className="px-3 py-1 text-xs text-neutral-400 font-semibold border-b border-neutral-700 mb-1">
            Ekran Paylaşımı Kalitesi:
          </div>
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onQualityChange(option.value as ScreenQuality);
                setShowMenu(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-white hover:bg-neutral-700 transition-all ${
                currentQuality === option.value ? 'bg-blue-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-neutral-400">{option.fps} FPS</p>
                </div>
                <span className="text-lg">{option.icon}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const getQualityConstraints = (quality: ScreenQuality) => {
  const options = QUALITY_OPTIONS.find(q => q.value === quality);
  if (!options) return {};

  return {
    video: {
      cursor: 'always',
      frameRate: { ideal: options.fps, max: options.fps },
      width: quality === 'ultra' ? { ideal: 2560 } : quality === 'high' ? { ideal: 1920 } : { ideal: 1280 },
      height: quality === 'ultra' ? { ideal: 1440 } : quality === 'high' ? { ideal: 1080 } : { ideal: 720 },
    } as any,
    audio: false,
  };
};



