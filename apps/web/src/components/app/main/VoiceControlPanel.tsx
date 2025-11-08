import React from 'react';
import { Phone, Mic, MicOff, Monitor, MonitorOff, Video, VideoOff, Headphones, Settings } from 'lucide-react';
import { useVoice } from '../../../context/VoiceContext';
import { useScreenShare } from '../../../context/ScreenShareContext';
import { Channel } from '../../../types';

interface VoiceControlPanelProps {
  channels: Channel[];
  voiceUsers: any[];
  isVideoOn: boolean;
  onVideoToggle: () => void;
  onLeaveChannel: () => void;
  showToast: (type: string, message: string) => void;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  channels,
  voiceUsers,
  isVideoOn,
  onVideoToggle,
  onLeaveChannel,
  showToast,
}) => {
  const {
    connectedVoiceChannelId,
    isMuted,
    isDeafened,
    isPushToTalkMode,
    pushToTalkActive,
    setIsMuted,
    setIsDeafened,
    setIsPushToTalkMode,
  } = useVoice();
  
  const {
    isScreenSharing,
    screenQuality,
    shareSystemAudio,
    showQualityMenu,
    setShowQualityMenu,
    setScreenQuality,
    setShareSystemAudio,
    getScreenConstraints,
    remoteUsers,
    showTheaterMode,
    setTheaterPresenter,
    setShowTheaterMode,
  } = useScreenShare();
  
  if (!connectedVoiceChannelId) return null;
  
  const handleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop will be handled by context
      return;
    }
    
    try {
      const displayOptions = getScreenConstraints(screenQuality, shareSystemAudio);
      const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      
      if (shareSystemAudio && stream.getAudioTracks().length > 0) {
        showToast('success', '🖥️🔊 Ekran + Ses paylaşımı başladı');
      } else {
        showToast('success', '🖥️ Ekran paylaşımı başladı');
      }
      
      // Handle screen share start via context
    } catch (err) {
      showToast('error', 'Ekran paylaşımı reddedildi');
    }
  };
  
  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
      <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
        {/* Kanal Bilgisi */}
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-neutral-800">
              {channels.find(c => c.id === connectedVoiceChannelId)?.name || 'Sesli Kanal'}
            </p>
            <p className="text-xs text-neutral-500">{voiceUsers.length} kişi bağlı</p>
          </div>
        </div>
        
        {/* Kontrol Butonları */}
        <div className="grid grid-cols-3 gap-2">
          {/* Mikrofon */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            onContextMenu={(e) => {
              e.preventDefault();
              const newMode = !isPushToTalkMode;
              setIsPushToTalkMode(newMode);
              localStorage.setItem('pushToTalk', String(newMode));
              showToast('info', newMode ? '⌨️ Bas-Konuş modu' : '🎤 Normal mod');
            }}
            className={`p-3 rounded-xl transition-all hover:scale-105 relative ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : pushToTalkActive && isPushToTalkMode
                ? 'bg-green-500 hover:bg-green-600'
                : isPushToTalkMode
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-neutral-700 hover:bg-neutral-600'
            }`}
            title={isPushToTalkMode ? 'PTT Mod' : (isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat')}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
            {isPushToTalkMode && !isMuted && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
            )}
          </button>
          
          {/* Kulaklık */}
          <button
            onClick={() => {
              const newDeafened = !isDeafened;
              setIsDeafened(newDeafened);
              if (newDeafened && !isMuted) setIsMuted(true);
            }}
            className={`p-3 rounded-xl transition-all hover:scale-105 ${
              isDeafened ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-700 hover:bg-neutral-600'
            }`}
            title={isDeafened ? 'Kulaklığı Aç' : 'Kulaklığı Kapat'}
          >
            <Headphones className="w-4 h-4 text-white" />
          </button>
          
          {/* Ayrıl */}
          <button
            onClick={onLeaveChannel}
            className="p-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all hover:scale-105"
            title="Kanaldan Ayrıl"
          >
            <Phone className="w-4 h-4 text-white rotate-135" />
          </button>
        </div>
        
        {/* Ekran Paylaşımı ve Video */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200">
          {/* Ekran Paylaşımı + Ayarlar */}
          <div className="col-span-2 flex gap-2">
            <button
              onClick={handleScreenShare}
              className={`flex-1 p-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              <span className="text-sm font-medium">{isScreenSharing ? 'Durdur' : 'Ekran Paylaş'}</span>
            </button>
            
            {!isScreenSharing && (
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="p-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-all hover:scale-105 relative"
                title="Ayarlar"
              >
                <Settings className="w-4 h-4 text-white" />
                
                {showQualityMenu && (
                  <>
                    <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setShowQualityMenu(false); }}></div>
                    <div className="absolute bottom-full left-0 mb-2 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-600 w-56 z-[100]" onClick={(e) => e.stopPropagation()}>
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 rounded-t-xl">
                        <h3 className="text-white font-semibold text-xs">Ekran Paylaşımı</h3>
                      </div>
                      <div className="p-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition-all">
                          <input
                            type="checkbox"
                            checked={shareSystemAudio}
                            onChange={(e) => setShareSystemAudio(e.target.checked)}
                            className="w-3 h-3 rounded accent-blue-500"
                          />
                          <span>🔊</span>
                          <div className="flex-1">
                            <p className="text-white font-medium text-xs">Sistem Sesi</p>
                          </div>
                        </label>
                        <div>
                          <p className="text-white font-medium mb-1.5 text-xs">Kalite</p>
                          <div className="space-y-1">
                            {[
                              { value: '720p30', label: '720p', sub: '30fps' },
                              { value: '1080p30', label: '1080p', sub: '30fps' },
                              { value: '1080p60', label: '1080p', sub: '60fps' },
                              { value: '1440p60', label: '1440p', sub: '60fps' },
                              { value: '4k30', label: '4K', sub: '30fps' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setScreenQuality(opt.value as any)}
                                className={`w-full px-2 py-1.5 rounded-md text-left flex items-center justify-between transition-all ${
                                  screenQuality === opt.value ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-750'
                                }`}
                              >
                                <span className="font-medium text-xs">{opt.label}</span>
                                <span className="text-[10px] opacity-70">{opt.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-neutral-800 rounded-b-xl border-t border-neutral-700">
                        <button
                          onClick={() => setShowQualityMenu(false)}
                          className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs"
                        >
                          Tamam
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </button>
            )}
          </div>
          
          {/* Video */}
          <button
            onClick={onVideoToggle}
            className={`p-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 ${
              isVideoOn ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white'
            }`}
          >
            {isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            <span className="text-sm font-medium">{isVideoOn ? 'Kapat' : 'Kamera'}</span>
          </button>
          
          {/* İzle Butonu */}
          {(remoteUsers.some(u => u.isScreenSharing) && !showTheaterMode) && (
            <button
              onClick={() => {
                const presenter = remoteUsers.find(u => u.isScreenSharing);
                if (presenter) {
                  setTheaterPresenter(presenter);
                  setShowTheaterMode(true);
                }
              }}
              className="p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all hover:scale-105 flex items-center justify-center gap-2 animate-pulse"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">İzle</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

