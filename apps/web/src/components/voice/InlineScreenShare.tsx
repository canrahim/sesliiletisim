import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Maximize2, Minimize2, X, Users, Volume2, Video, Settings, Zap } from 'lucide-react';

interface Participant {
  userId: string;
  username: string;
  stream?: MediaStream;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}

interface InlineScreenShareProps {
  presenter: Participant;
  participants: Participant[];
  onClose: () => void;
  myUserId: string;
}

export const InlineScreenShare: React.FC<InlineScreenShareProps> = ({
  presenter,
  participants,
  onClose,
  myUserId,
}) => {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | '16:9' | '4:3'>('cover');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (mainVideoRef.current && presenter.stream) {
      console.log('🎬 Attaching presenter stream to video element:', presenter.username);
      console.log('🎬 Stream tracks:', presenter.stream.getTracks().map(t => `${t.kind} - ${t.enabled ? 'enabled' : 'disabled'}`));
      mainVideoRef.current.srcObject = presenter.stream;
      
      // ✅ SADECE KENDİ EKRANIMSA MUTE ET (sistem sesi feedback önleme)
      // ✅ BAŞKA BİRİNİN EKRANI İSE UNMUTE (sistem sesini duyalım!)
      const shouldMute = presenter.userId === myUserId;
      mainVideoRef.current.muted = shouldMute;
      mainVideoRef.current.defaultMuted = shouldMute;
      mainVideoRef.current.volume = 1.0; // Tam ses
      
      console.log(`🔊 Video element ${shouldMute ? 'MUTED' : 'UNMUTED'} (${presenter.userId === myUserId ? 'kendi ekranım' : 'başkasının ekranı'})`);
      
      // Force play
      mainVideoRef.current.play().catch(err => {
        console.error('❌ Video play failed:', err);
      });
    } else {
      console.warn('⚠️ No stream or video ref:', { hasRef: !!mainVideoRef.current, hasStream: !!presenter.stream });
    }
  }, [presenter.stream, presenter.username, myUserId]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && mainVideoRef.current) {
        // Video element'i fullscreen yap
        if (mainVideoRef.current.requestFullscreen) {
          await mainVideoRef.current.requestFullscreen();
        }
      } else if (document.fullscreenElement) {
        // Fullscreen'den çık
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
      // Fallback: Panel'i büyüt
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={`bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-500 transition-all duration-300 ${
      isExpanded 
        ? 'fixed inset-4 z-[90]' 
        : 'mx-4 mb-4'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-white" />
          <div>
            <p className="text-white font-bold">{presenter.username} ekran paylaşıyor</p>
            <p className="text-blue-100 text-xs flex items-center gap-2">
              <span>{participants.length} katılımcı</span>
              {presenter.hasScreenAudio && <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] uppercase tracking-wider">🔊 Sistem Sesi</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Participants Toggle */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              showParticipants 
                ? 'bg-white/20 text-white' 
                : 'bg-white/10 text-white/70'
            }`}
            title="Katılımcılar"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">{participants.length}</span>
          </button>

          {/* Display Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-2"
              title="Görüntü Ayarları"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs">Ayarlar</span>
            </button>
            
            {showSettings && (
              <div className="absolute top-full mt-2 right-0 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700 py-2 min-w-56 z-50">
                <div className="px-3 py-1 text-xs text-neutral-400 font-semibold border-b border-neutral-700 mb-1">
                  Görüntü Oranı:
                </div>
                {[
                  { value: 'cover', label: 'Tam Ekran (Kes)', icon: '⛶', desc: 'Siyah yok' },
                  { value: 'contain', label: 'Sığdır (Hepsi)', icon: '◻️', desc: 'Yanlar siyah' },
                  { value: '16:9', label: '16:9 Geniş', icon: '📺', desc: 'Film oranı' },
                  { value: '4:3', label: '4:3 Klasik', icon: '🖥️', desc: 'Eski ekran' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setAspectRatio(option.value as any);
                      setShowSettings(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-white hover:bg-neutral-700 transition-all ${
                      aspectRatio === option.value ? 'bg-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <span>{option.icon}</span>
                          {option.label}
                        </p>
                        <p className="text-xs text-neutral-400">{option.desc}</p>
                      </div>
                      {aspectRatio === option.value && <span className="text-blue-400">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
            title={isExpanded ? 'Küçült' : 'Büyüt'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex bg-black">
        {/* Screen Share Video */}
        <div className={`flex-1 flex items-center justify-center p-4 bg-neutral-950 ${
          isExpanded ? 'h-[calc(100vh-8rem)]' : 'h-96'
        }`}>
          {presenter.stream ? (
            <video
              ref={mainVideoRef}
              autoPlay
              playsInline
              muted={presenter.userId === myUserId}
              className={`w-full h-full rounded-lg shadow-2xl ${
                aspectRatio === 'cover' ? 'object-cover' :
                aspectRatio === 'contain' ? 'object-contain' :
                aspectRatio === '16:9' ? 'object-contain aspect-video' :
                'object-contain aspect-[4/3]'
              }`}
            />
          ) : (
            <div className="text-center text-neutral-500">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-neutral-600 animate-pulse" />
              <p className="font-semibold">Stream yükleniyor...</p>
              <p className="text-sm mt-2">Ekran paylaşımı bağlantısı kuruluyor</p>
            </div>
          )}
        </div>

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className={`bg-neutral-800 border-l-2 border-neutral-700 overflow-y-auto ${
            isExpanded ? 'w-72' : 'w-48'
          }`}>
            <div className="p-3 border-b border-neutral-700">
              <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Katılımcılar
              </h4>
            </div>

            <div className="p-3 space-y-2">
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className={`p-3 rounded-xl transition-all ${
                    (p.isSpeaking || (p.hasScreenAudio && !(p.isMuted))) 
                      ? 'bg-green-500/20 border-2 border-green-500' 
                      : 'bg-neutral-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm ${
                      (p.isSpeaking || (p.hasScreenAudio && !(p.isMuted))) ? 'ring-2 ring-green-400 animate-pulse' : ''
                    }`}>
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">
                        {p.username}
                        {p.userId === myUserId && <span className="text-xs text-blue-400 ml-1">(Sen)</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.hasScreenAudio && !(p.isMuted) ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Sistem Sesi
                          </span>
                        ) : p.isMuted ? (
                          <span className="text-xs text-red-400">🔇 Kapalı</span>
                        ) : p.isSpeaking ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-2 bg-green-400 rounded-full animate-bounce"></div>
                              <div className="w-0.5 h-3 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                              <div className="w-0.5 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                            </div>
                            Konuşuyor
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">🎤 Aktif</span>
                        )}
                        {p.isVideoOn && <span className="text-xs text-blue-400">📹</span>}
                        {p.isScreenSharing && <span className="text-xs text-green-400">🖥️</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="bg-neutral-800 px-4 py-2 flex items-center justify-between border-t border-neutral-700">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-white">
            <Volume2 className="w-4 h-4 text-green-400" />
            <span>
              {
                participants.filter(p => {
                  if (p.hasScreenAudio) return true;
                  return !p.isMuted;
                }).length
              }
              /{participants.length} Ses
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-white">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span>{participants.filter(p => p.isScreenSharing).length} Ekran</span>
          </div>
          <div className="flex items-center gap-1.5 text-white">
            <Video className="w-4 h-4 text-purple-400" />
            <span>{participants.filter(p => p.isVideoOn).length} Video</span>
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          title="F11 Tam Ekran"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Tam Ekran</span>
        </button>
      </div>
    </div>
  );
};

