import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Mic, 
  MicOff, 
  Headphones, 
  PhoneOff, 
  Volume2,
  Settings,
  Users,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { VoiceCallManager } from '@asforces/rtc';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui';

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  serverId: string;
}

interface VoiceUser {
  userId: string;
  username: string;
  avatar?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  connectionQuality: 'good' | 'moderate' | 'poor';
}

export const VoiceChannel: React.FC<VoiceChannelProps> = ({
  channelId,
  channelName,
  serverId,
}) => {
  const { user, token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'moderate' | 'poor'>('good');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const voiceManagerRef = useRef<VoiceCallManager | null>(null);
  const audioLevelIntervalRef = useRef<number | null>(null);

  // Initialize socket and voice manager
  useEffect(() => {
    if (!token || !user) return;

    const initializeVoice = async () => {
      try {
        // Create RTC socket connection
        const socket = io(`${import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' ? 'https://asforces.com' : 'http://localhost:3000')}/rtc`, {
          auth: { token },
          transports: ['websocket'],
        });

        socketRef.current = socket;

        // Create voice manager
        const voiceManager = new VoiceCallManager({
          pushToTalk,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });

        voiceManagerRef.current = voiceManager;

        // Setup event handlers
        setupSocketHandlers(socket);
        setupVoiceHandlers(voiceManager);

        // Initialize voice manager with socket
        await voiceManager.initialize(socket, user.id);

      } catch (err) {
        console.error('Failed to initialize voice:', err);
        setError('Failed to initialize voice connection');
      }
    };

    initializeVoice();

    return () => {
      cleanup();
    };
  }, [token, user, pushToTalk]);

  // Setup socket handlers
  const setupSocketHandlers = (socket: Socket) => {
    socket.on('connect', () => {
      console.log('Connected to RTC server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from RTC server');
      setIsConnected(false);
    });

    socket.on('voice-users', (data: { users: any[], iceServers: RTCIceServer[] }) => {
      console.log('Voice users:', data.users);
      
      // Update user list
      const users: VoiceUser[] = data.users.map(u => ({
        userId: u.userId,
        username: u.username || 'Unknown',
        avatar: u.avatar,
        isMuted: false,
        isSpeaking: false,
        connectionQuality: 'good' as const,
      }));
      
      setVoiceUsers(users);
    });

    socket.on('user-joined-voice', (data: { userId: string, username: string }) => {
      console.log('User joined voice:', data);
      
      setVoiceUsers(prev => [...prev, {
        userId: data.userId,
        username: data.username || 'Unknown',
        isMuted: false,
        isSpeaking: false,
        connectionQuality: 'good',
      }]);
    });

    socket.on('user-left-voice', (data: { userId: string }) => {
      console.log('User left voice:', data);
      setVoiceUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    socket.on('user-audio-state', (data: { userId: string, isMuted: boolean }) => {
      setVoiceUsers(prev => prev.map(u => 
        u.userId === data.userId ? { ...u, isMuted: data.isMuted } : u
      ));
    });

    socket.on('user-speaking', (data: { userId: string, isSpeaking: boolean }) => {
      setVoiceUsers(prev => prev.map(u => 
        u.userId === data.userId ? { ...u, isSpeaking: data.isSpeaking } : u
      ));
    });

    socket.on('error', (data: { message: string }) => {
      console.error('RTC error:', data);
      setError(data.message);
    });
  };

  // Setup voice manager handlers
  const setupVoiceHandlers = (voiceManager: VoiceCallManager) => {
    voiceManager.on('onPeerJoined', (peerId) => {
      console.log('Peer joined:', peerId);
    });

    voiceManager.on('onPeerLeft', (peerId) => {
      console.log('Peer left:', peerId);
    });

    voiceManager.on('onConnectionStateChange', (peerId, state) => {
      console.log(`Connection state for ${peerId}:`, state);
      
      // Update connection quality based on state
      if (state === 'connected') {
        setConnectionQuality('good');
      } else if (state === 'connecting' || state === 'disconnected') {
        setConnectionQuality('moderate');
      } else if (state === 'failed' || state === 'closed') {
        setConnectionQuality('poor');
      }
    });

    voiceManager.on('onError', (error) => {
      console.error('Voice error:', error);
      setError(error.message);
    });

    voiceManager.on('onLocalStream', (stream) => {
      console.log('Local stream ready:', stream);
      
      // Start audio level monitoring
      startAudioLevelMonitoring();
    });

    voiceManager.on('onRemoteStream', (peerId, stream) => {
      console.log(`Remote stream from ${peerId}:`, stream);
      
      // Play remote audio
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.playsInline = true;
    });
  };

  // Start monitoring audio levels
  const startAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
    }

    audioLevelIntervalRef.current = window.setInterval(() => {
      if (voiceManagerRef.current) {
        const level = voiceManagerRef.current.getAudioLevel();
        setAudioLevel(level);
        
        // Detect speaking
        const isSpeaking = level > 0.1;
        if (isSpeaking && !isMuted) {
          socketRef.current?.emit('speaking', { isSpeaking: true });
          setTimeout(() => {
            socketRef.current?.emit('speaking', { isSpeaking: false });
          }, 500);
        }
      }
    }, 100);
  };

  // Join voice channel
  const joinChannel = async () => {
    if (!voiceManagerRef.current || !socketRef.current) {
      setError('Voice system not initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await voiceManagerRef.current.joinVoiceChannel(serverId, channelId);
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error('Failed to join voice channel:', err);
      setError(err.message || 'Failed to join voice channel');
      setIsConnecting(false);
    }
  };

  // Leave voice channel
  const leaveChannel = async () => {
    if (!voiceManagerRef.current) return;

    try {
      await voiceManagerRef.current.leaveVoiceChannel();
      setIsConnected(false);
      setVoiceUsers([]);
      setError(null);
    } catch (err) {
      console.error('Failed to leave voice channel:', err);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!voiceManagerRef.current) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    voiceManagerRef.current.setMicrophoneEnabled(!newMuted);
    
    // Notify others
    socketRef.current?.emit('audio-state', { isMuted: newMuted });
  };

  // Toggle deafen
  const toggleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    
    // Mute all remote audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.muted = newDeafened;
    });

    // Also mute when deafened
    if (newDeafened && !isMuted) {
      toggleMute();
    }
  };

  // Handle push to talk
  const handlePushToTalk = useCallback((e: KeyboardEvent) => {
    if (!pushToTalk || !voiceManagerRef.current) return;

    if (e.code === 'Space' && !e.repeat) {
      if (e.type === 'keydown') {
        voiceManagerRef.current.startPushToTalk();
        setIsMuted(false);
      } else if (e.type === 'keyup') {
        voiceManagerRef.current.stopPushToTalk();
        setIsMuted(true);
      }
    }
  }, [pushToTalk]);

  // Setup push to talk listeners
  useEffect(() => {
    if (pushToTalk && isConnected) {
      window.addEventListener('keydown', handlePushToTalk);
      window.addEventListener('keyup', handlePushToTalk);

      return () => {
        window.removeEventListener('keydown', handlePushToTalk);
        window.removeEventListener('keyup', handlePushToTalk);
      };
    }
  }, [pushToTalk, isConnected, handlePushToTalk]);

  // Cleanup
  const cleanup = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
    }

    if (voiceManagerRef.current) {
      voiceManagerRef.current.dispose();
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Connection quality indicator
  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'moderate':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Voice channel header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="font-semibold text-white">{channelName}</h3>
              {isConnected && (
                <p className="text-xs text-gray-400">
                  {voiceUsers.length} {voiceUsers.length === 1 ? 'user' : 'users'} connected
                </p>
              )}
            </div>
          </div>
          {isConnected && getConnectionIcon()}
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Voice users list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Headphones className="w-12 h-12 mb-4" />
            <p className="text-center mb-4">
              {isConnecting ? 'Connecting...' : 'Click to join voice channel'}
            </p>
            <Button 
              onClick={joinChannel}
              disabled={isConnecting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? 'Connecting...' : 'Join Voice'}
            </Button>
          </div>
        ) : (
          <>
            {/* Current user */}
            <div className={`p-3 rounded-lg bg-gray-800 ${audioLevel > 0.1 && !isMuted ? 'ring-2 ring-green-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user?.username} (You)</p>
                    <p className="text-xs text-gray-400">
                      {isMuted ? 'Muted' : 'Speaking'}
                      {isDeafened && ' • Deafened'}
                    </p>
                  </div>
                </div>
                {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
              </div>

              {/* Audio level indicator */}
              {!isMuted && (
                <div className="mt-2">
                  <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Other users */}
            {voiceUsers.map(voiceUser => (
              <div key={voiceUser.userId} className={`p-3 rounded-lg bg-gray-800 ${voiceUser.isSpeaking ? 'ring-2 ring-green-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      {voiceUser.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{voiceUser.username}</p>
                      <p className="text-xs text-gray-400">
                        {voiceUser.isMuted ? 'Muted' : voiceUser.isSpeaking ? 'Speaking' : 'Connected'}
                      </p>
                    </div>
                  </div>
                  {voiceUser.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Voice controls */}
      {isConnected && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-md transition-colors ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleDeafen}
                className={`p-2 rounded-md transition-colors ${
                  isDeafened 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                <Headphones className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                title="Voice Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={leaveChannel}
              className="p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Leave Channel"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={pushToTalk}
                  onChange={(e) => {
                    setPushToTalk(e.target.checked);
                    voiceManagerRef.current?.setPushToTalkMode(e.target.checked);
                  }}
                  className="rounded"
                />
                Push to Talk (Hold Space)
              </label>

              <div className="text-xs text-gray-400">
                {pushToTalk 
                  ? 'Hold Space key to talk' 
                  : 'Your microphone is always active'
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
