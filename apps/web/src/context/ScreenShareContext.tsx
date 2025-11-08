import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

// Types
export type ScreenQuality = '720p30' | '720p60' | '1080p30' | '1080p60' | '1440p30' | '1440p60' | '4k30';

export interface TheaterPresenter {
  userId: string;
  username: string;
  stream?: MediaStream;
}

interface ScreenShareContextType {
  // State
  isScreenSharing: boolean;
  screenQuality: ScreenQuality;
  shareSystemAudio: boolean;
  showTheaterMode: boolean;
  theaterPresenter: TheaterPresenter | null;
  showQualityMenu: boolean;
  
  // Refs
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
  
  // Actions
  setIsScreenSharing: (sharing: boolean) => void;
  setScreenQuality: (quality: ScreenQuality) => void;
  setShareSystemAudio: (enabled: boolean) => void;
  setShowTheaterMode: (show: boolean) => void;
  setTheaterPresenter: (presenter: TheaterPresenter | null) => void;
  setShowQualityMenu: (show: boolean) => void;
  
  // Methods
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  getScreenConstraints: (quality: string, withAudio: boolean) => DisplayMediaStreamOptions;
}

const ScreenShareContext = createContext<ScreenShareContextType | null>(null);

export const useScreenShare = () => {
  const context = useContext(ScreenShareContext);
  if (!context) {
    throw new Error('useScreenShare must be used within ScreenShareProvider');
  }
  return context;
};

interface ScreenShareProviderProps {
  children: React.ReactNode;
}

export const ScreenShareProvider: React.FC<ScreenShareProviderProps> = ({ children }) => {
  // State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>('1080p30');
  const [shareSystemAudio, setShareSystemAudio] = useState(true);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [theaterPresenter, setTheaterPresenter] = useState<TheaterPresenter | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Refs
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Methods
  const getScreenConstraints = useCallback((quality: string, withAudio: boolean): DisplayMediaStreamOptions => {
    const qualitySettings: Record<string, { width: number; height: number; frameRate: number }> = {
      '720p30': { width: 1280, height: 720, frameRate: 30 },
      '720p60': { width: 1280, height: 720, frameRate: 60 },
      '1080p30': { width: 1920, height: 1080, frameRate: 30 },
      '1080p60': { width: 1920, height: 1080, frameRate: 60 },
      '1440p30': { width: 2560, height: 1440, frameRate: 30 },
      '1440p60': { width: 2560, height: 1440, frameRate: 60 },
      '4k30': { width: 3840, height: 2160, frameRate: 30 },
    };

    const settings = qualitySettings[quality] || qualitySettings['1080p30'];

    return {
      video: {
        width: { ideal: settings.width, max: settings.width },
        height: { ideal: settings.height, max: settings.height },
        frameRate: { ideal: settings.frameRate, max: settings.frameRate },
      },
      audio: withAudio ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 2,
      } : false,
      preferCurrentTab: false,
      surfaceSwitching: 'include',
      selfBrowserSurface: 'exclude',
      systemAudio: withAudio ? 'include' : 'exclude',
    } as DisplayMediaStreamOptions;
  }, []);
  
  const startScreenShare = useCallback(async () => {
    // Implementation will be in custom hook
    console.log('🖥️ Starting screen share');
  }, []);
  
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setShowTheaterMode(false);
    setTheaterPresenter(null);
  }, []);
  
  const value: ScreenShareContextType = {
    // State
    isScreenSharing,
    screenQuality,
    shareSystemAudio,
    showTheaterMode,
    theaterPresenter,
    showQualityMenu,
    
    // Refs
    screenStreamRef,
    
    // Actions
    setIsScreenSharing,
    setScreenQuality,
    setShareSystemAudio,
    setShowTheaterMode,
    setTheaterPresenter,
    setShowQualityMenu,
    
    // Methods
    startScreenShare,
    stopScreenShare,
    getScreenConstraints,
  };
  
  return (
    <ScreenShareContext.Provider value={value}>
      {children}
    </ScreenShareContext.Provider>
  );
};

