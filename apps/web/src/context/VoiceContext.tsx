import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// Types
export interface VoiceUser {
  userId: string;
  username: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}

export interface RemoteUser {
  userId: string;
  username: string;
  stream?: MediaStream;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}

interface VoiceContextType {
  // State
  connectedVoiceChannelId: string | null;
  voiceUsers: VoiceUser[];
  remoteUsers: RemoteUser[];
  isMuted: boolean;
  isDeafened: boolean;
  isPushToTalkMode: boolean;
  pushToTalkActive: boolean;
  myAudioLevel: number;
  
  // Refs
  voiceSocketRef: React.MutableRefObject<Socket | null>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  peerConnectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  audioAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  
  // Actions
  setConnectedVoiceChannelId: (id: string | null) => void;
  setVoiceUsers: React.Dispatch<React.SetStateAction<VoiceUser[]>>;
  setRemoteUsers: React.Dispatch<React.SetStateAction<RemoteUser[]>>;
  setIsMuted: (muted: boolean) => void;
  setIsDeafened: (deafened: boolean) => void;
  setIsPushToTalkMode: (enabled: boolean) => void;
  setPushToTalkActive: (active: boolean) => void;
  setMyAudioLevel: (level: number) => void;
  
  // Methods
  joinVoiceChannel: (channelId: string, serverId: string) => Promise<void>;
  leaveVoiceChannel: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
};

interface VoiceProviderProps {
  children: React.ReactNode;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children }) => {
  // State
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(() => 
    localStorage.getItem('pushToTalk') === 'true'
  );
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  
  // Refs
  const voiceSocketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Methods
  const joinVoiceChannel = useCallback(async (channelId: string, serverId: string) => {
    // Implementation will be in custom hook
    console.log('🎤 Joining voice channel:', channelId);
  }, []);
  
  const leaveVoiceChannel = useCallback(() => {
    // Implementation will be in custom hook
    console.log('🚪 Leaving voice channel');
    setConnectedVoiceChannelId(null);
    setVoiceUsers([]);
  }, []);
  
  const value: VoiceContextType = {
    // State
    connectedVoiceChannelId,
    voiceUsers,
    remoteUsers,
    isMuted,
    isDeafened,
    isPushToTalkMode,
    pushToTalkActive,
    myAudioLevel,
    
    // Refs
    voiceSocketRef,
    localStreamRef,
    peerConnectionsRef,
    audioContextRef,
    audioAnalyserRef,
    
    // Actions
    setConnectedVoiceChannelId,
    setVoiceUsers,
    setRemoteUsers,
    setIsMuted,
    setIsDeafened,
    setIsPushToTalkMode,
    setPushToTalkActive,
    setMyAudioLevel,
    
    // Methods
    joinVoiceChannel,
    leaveVoiceChannel,
  };
  
  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};

