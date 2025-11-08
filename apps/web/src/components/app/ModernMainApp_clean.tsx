import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Settings, Users, LogOut, Link as LinkIcon, Hash, Volume2, Send, Plus, Menu, X, Phone, Mic, MicOff, Monitor, MonitorOff, Video, VideoOff, Headphones } from 'lucide-react';
import { EmojiPicker } from '../ui/EmojiPicker';
import { FileUpload } from '../ui/FileUpload';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';
import { serversApi } from '../../api/endpoints/servers';
import { channelsApi } from '../../api/endpoints/channels';
import { messagesApi } from '../../api/endpoints/messages';
import { uploadApi } from '../../api/endpoints/upload';
import { friendsApi } from '../../api/endpoints/friends';
import { FriendsPanel } from './FriendsPanel';
import { DirectMessages } from './DirectMessages';
import { FriendsView } from './FriendsView';
import { ToastContainer } from '../ui/Toast';
import { RemoteMediaPanel } from '../voice/RemoteMediaPanel';
import { ScreenShareTheater } from '../voice/ScreenShareTheater';
import { InlineScreenShare } from '../voice/InlineScreenShare';
import { ServerInviteModal } from './ServerInviteModal';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateServerModal } from './CreateServerModal';
import { SettingsModal } from './SettingsModal';

interface Server {
  id: string;
  name: string;
  icon?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  channelId?: string;
  user: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' 
  ? 'https://asforces.com' 
  : 'http://localhost:3000';

export const ModernMainApp: React.FC = () => {
  const { user, logout, accessToken } = useAuthStore();
  const [view, setView] = useState<'servers' | 'friends' | 'dm'>('servers');
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileVoice, setShowMobileVoice] = useState(false);
  const [showServerList, setShowServerList] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showDMPanel, setShowDMPanel] = useState(false);
  const [userVolumeSettings, setUserVolumeSettings] = useState<Record<string, number>>({});
  
  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Remote media
  const [remoteUsers, setRemoteUsers] = useState<Array<{ userId: string; username: string; stream?: MediaStream; isScreenSharing?: boolean; isVideoOn?: boolean; isMuted?: boolean; isSpeaking?: boolean }>>([]);
  const [mediaLayout, setMediaLayout] = useState<'grid' | 'speaker'>('grid');
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [theaterPresenter, setTheaterPresenter] = useState<{ userId: string; username: string; stream?: MediaStream } | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Voice & Members
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<Array<{ userId: string; username: string; isMuted?: boolean; isSpeaking?: boolean }>>([]);
  const [channelVoiceUsers, setChannelVoiceUsers] = useState<Record<string, Array<{ id: string; username: string; isMuted?: boolean }>>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(() => localStorage.getItem('pushToTalk') === 'true');
  const [contextMenu, setContextMenu] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<Record<string, { game?: string; activity?: string }>>({});
  
  // Desktop oyun alg─▒lama event'leri
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const handleGameDetected = (_: any, data: { name: string; displayName: string }) => {
        setCurrentGame(data.displayName || data.name);
        console.log('[Game] Alg─▒land─▒:', data.displayName);
        
        // Presence'a bildir
        if (presenceSocketRef.current) {
          presenceSocketRef.current.emit('activity-update', { 
            activity: `${data.displayName} oynuyor`
          });
        }
      };
      
      const handleGameClosed = () => {
        setCurrentGame(null);
        console.log('[Game] Kapand─▒');
        
        // Presence'a bildir
        if (presenceSocketRef.current) {
          presenceSocketRef.current.emit('activity-update', { activity: null });
        }
      };
      
      (window as any).electron.on('game-detected', handleGameDetected);
      (window as any).electron.on('game-closed', handleGameClosed);
      
      return () => {
        (window as any).electron.removeListener('game-detected', handleGameDetected);
        (window as any).electron.removeListener('game-closed', handleGameClosed);
      };
    }
  }, []);
  
  // PTT key listening
  useEffect(() => {
    if (!isPushToTalkMode || !connectedVoiceChannelId) return;
    
    const pttKey = localStorage.getItem('pttKey') || 'Space';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // PTT tu┼şu kombinasyonunu kontrol et
      const parts = pttKey.split('+');
      const key = parts[parts.length - 1];
      const needsCtrl = parts.includes('Ctrl');
      const needsAlt = parts.includes('Alt');
      const needsShift = parts.includes('Shift');
      
      const keyMatch = e.code === key || e.key === key || (key === 'Space' && e.key === ' ');
      const modMatch = e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift;
      
      if (keyMatch && modMatch) {
        e.preventDefault();
        if (!pushToTalkActive) {
          setPushToTalkActive(true);
          if (isMuted) setIsMuted(false);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const parts = pttKey.split('+');
      const key = parts[parts.length - 1];
      const keyMatch = e.code === key || e.key === key || (key === 'Space' && e.key === ' ');
      
      if (keyMatch && pushToTalkActive) {
        e.preventDefault();
        setPushToTalkActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPushToTalkMode, connectedVoiceChannelId, pushToTalkActive, isMuted]);
  
  // Screen Share & Video states
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [screenQuality, setScreenQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('medium');
  const [shareSystemAudio, setShareSystemAudio] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const [serverMembers, setServerMembers] = useState<Array<{ userId: string; username: string; displayName?: string; isOnline: boolean }>>([]);
  const [friends, setFriends] = useState<Array<{ id: string; username: string; displayName?: string; isOnline: boolean }>>([]);
  
  // Modals
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDescription, setNewServerDescription] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const voiceSocketRef = useRef<Socket | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChannelIdRef = useRef<string | null>(null);
  const connectedVoiceChannelIdRef = useRef<string | null>(null); // ÔåÉ YEN─░ REF!
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const joinSoundRef = useRef<HTMLAudioElement | null>(null);
  const leaveSoundRef = useRef<HTMLAudioElement | null>(null);
  const isOnlineRef = useRef<boolean>(true);
  const afkTimeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => { 
    loadServers(); 
    
    // Cleanup on unmount
    return () => {
      console.log('­şğ╣ ModernMainApp unmounting - cleaning up resources');
      
      // Stop audio monitoring
      stopAudioMonitoring();
      
      // Disconnect all sockets
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (voiceSocketRef.current) {
        voiceSocketRef.current.disconnect();
      }
      if (presenceSocketRef.current) {
        presenceSocketRef.current.disconnect();
      }
      
      // Remove all dynamically created audio elements
      document.querySelectorAll('audio[id^="audio-"]').forEach(el => {
        const audioEl = el as HTMLAudioElement;
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.remove();
      });
    };
  }, []);
  
  useEffect(() => { loadFriends(); }, []);
  useEffect(() => { if (selectedServer) { loadChannels(selectedServer.id); loadServerMembers(selectedServer.id); } }, [selectedServer]);
  
  // AFK Timeout Check (5 dakika - Discord standart)
  useEffect(() => {
    if (!connectedVoiceChannelId) return;
    
    // 5 dakika = 300000 ms
    const AFK_TIMEOUT = 5 * 60 * 1000;
    
    const checkAFK = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      
      if (timeSinceActivity > AFK_TIMEOUT && connectedVoiceChannelId) {
        console.log('ÔÅ░ AFK timeout - Leaving voice channel');
        showToast('warning', '5 dakika boyunca sessiz kald─▒n─▒z. Sesli kanaldan ├ğ─▒kt─▒n─▒z.');
        
        // Kanaldan ├ğ─▒k
        stopAudioMonitoring();
        voiceSocketRef.current?.emit('leave-voice');
        setConnectedVoiceChannelId(null);
        connectedVoiceChannelIdRef.current = null;
        setVoiceUsers([]);
        
        // ├ç─▒k─▒┼ş sesi
        if (leaveSoundRef.current) {
          leaveSoundRef.current.currentTime = 0;
          leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
        }
      }
    };
    
    // Her dakika kontrol et
    const interval = setInterval(checkAFK, 60000);
    afkTimeoutRef.current = window.setTimeout(() => {}, 0); // Dummy
    
    return () => {
      clearInterval(interval);
      if (afkTimeoutRef.current) clearTimeout(afkTimeoutRef.current);
    };
  }, [connectedVoiceChannelId]);
  
  // Load sound effects
  useEffect(() => {
    joinSoundRef.current = new Audio('/giris_join_long.wav');
    leaveSoundRef.current = new Audio('/cikis_leave_long.wav');
    
    // Online/Offline detection
    const handleOnline = () => {
      console.log('­şîÉ Internet connection restored');
      isOnlineRef.current = true;
      
      // ­şÆ¥ Son kanala otomatik kat─▒lmay─▒ dene
      try {
        const lastChannel = localStorage.getItem('lastVoiceChannel');
        if (lastChannel) {
          const { channelId, timestamp } = JSON.parse(lastChannel);
          const timePassed = Date.now() - timestamp;
          
          // 5 dakikadan az zaman ge├ğtiyse otomatik kat─▒l
          if (timePassed < 5 * 60 * 1000) {
            showToast('info', 'Sesli kanala yeniden ba─şlan─▒l─▒yor...');
            
            // 2 saniye sonra reload (socket'lerin ba─şlanmas─▒ i├ğin)
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
        }
      } catch (e) {
        console.error('LocalStorage okuma hatas─▒:', e);
      }
      
      // Normal reload
      showToast('success', '─░nternet ba─şlant─▒s─▒ geri geldi! Sayfa yenileniyor...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    const handleOffline = () => {
      console.log('ÔÜá´©Å Internet connection lost');
      isOnlineRef.current = false;
      showToast('error', '─░nternet ba─şlant─▒s─▒ kesildi! Sayfay─▒ yenileyin.');
      
      // Sesli kanaldan otomatik ├ğ─▒k
      if (connectedVoiceChannelIdRef.current) {
        console.log('­şÜ¬ Leaving voice channel due to connection loss');
        stopAudioMonitoring();
        setConnectedVoiceChannelId(null);
        connectedVoiceChannelIdRef.current = null;
        setVoiceUsers([]);
        
        // ­şöè ├çIKI┼Ş SES─░ ├çAL!
        if (leaveSoundRef.current) {
          leaveSoundRef.current.currentTime = 0;
          leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
        }
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Auto-scroll when messages change
  useEffect(() => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
    }, 50); // Small delay to ensure DOM is updated
  }, [messages]);

  // Load messages when channel changes
  useEffect(() => {
    if (!socketRef.current || !selectedChannel || selectedChannel.type !== 'TEXT' || !selectedChannel.id) {
      console.log('ÔÜá´©Å Invalid channel, skipping');
      return;
    }
    
    // Leave previous channel if exists
    if (currentChannelIdRef.current && currentChannelIdRef.current !== selectedChannel.id) {
      socketRef.current.emit('leave-channel', { channelId: currentChannelIdRef.current });
    }
    
    // Join new channel
    socketRef.current.emit('join-channel', { channelId: selectedChannel.id });
    currentChannelIdRef.current = selectedChannel.id;
    
    // Load messages for new channel
    loadMessages(selectedChannel.id);
  }, [selectedChannel]);

  // WebSocket initialization
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${API_BASE}/messages`, {
      auth: { token: accessToken },
      transports: ['websocket'], 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    socketRef.current = socket;
    socket.on('connect', () => { console.log('Ô£à Connected'); if (currentChannelIdRef.current) socket.emit('join-channel', { channelId: currentChannelIdRef.current }); });
    socket.on('new-message', (message: Message) => { if (currentChannelIdRef.current === message.channelId) setMessages((prev) => prev.some(m => m.id === message.id) ? prev : [...prev, message]); });
    socket.on('message-deleted', ({ messageId }: { messageId: string }) => setMessages((prev) => prev.filter((m) => m.id !== messageId)));
    return () => { socket.disconnect(); };
  }, [accessToken]);

  // Presence Socket (Silent - no spam!)
  useEffect(() => {
    if (!accessToken) return;
    const presenceSocket = io(`${API_BASE}/presence`, {
      auth: { token: accessToken },
      transports: ['websocket'], 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    presenceSocketRef.current = presenceSocket;

    presenceSocket.on('connect', () => {
      console.log('Ô£à Connected to presence gateway (ModernMainApp)');
      // Presence socket ba─şland─▒ktan sonra arkada┼şlar─▒ yeniden y├╝kle
      loadFriends();
    });

    presenceSocket.on('presence-update', ({ userId, status, isOnline: onlineStatus, activity }: any) => {
      // Handle both old and new format
      const isOnline = onlineStatus !== undefined 
        ? onlineStatus 
        : (typeof status === 'string' ? status === 'online' : status?.isOnline);
      
      console.log(`­şôÑ Presence update: userId=${userId}, isOnline=${isOnline}`);
      console.log(`   Friends listesinde ${friends.length} ki┼şi var:`, friends.map(f => f.id));
      
      // ├£ye listesini g├╝ncelle
      setServerMembers(prev => {
        const updated = prev.map(m => m.userId === userId ? { ...m, isOnline } : m);
        return updated;
      });
      
      // Arkada┼ş listesini g├╝ncelle (ayn─▒ ┼şekilde!)
      setFriends(prev => {
        const updated = prev.map(f => f.id === userId ? { ...f, isOnline } : f);
        console.log(`­şöä Friends g├╝ncellendi: ${updated.filter(f => f.id === userId).map(f => f.username + '=' + f.isOnline)}`);
        return updated;
      });
      
      // Aktivite g├╝ncelle
      if (activity !== undefined) {
        setUserActivities(prev => ({
          ...prev,
          [userId]: { activity }
        }));
      }
    });
    
    return () => {
      presenceSocket.disconnect();
    };
  }, [accessToken, selectedServer]);

  // Voice Socket
  useEffect(() => {
    if (!accessToken) return;
    const voiceSocket = io(`${API_BASE}/voice`, { 
      auth: { token: accessToken }, 
      transports: ['websocket'], 
      withCredentials: true,
      reconnection: true,           // Ô£à Otomatik yeniden ba─şlan
      reconnectionAttempts: 10,     // Ô£à 10 deneme
      reconnectionDelay: 1000,      // Ô£à 1 saniye bekle
      reconnectionDelayMax: 5000,   // Ô£à Maks 5 saniye
      timeout: 20000                // Ô£à 20 saniye timeout
    });
    voiceSocketRef.current = voiceSocket;
    
    voiceSocket.on('connect', async () => {
      console.log('Ô£à Voice connected');
      
      // ­şÆ¥ LocalStorage'dan son kanal─▒ oku
      try {
        const lastChannelData = localStorage.getItem('lastVoiceChannel');
        if (lastChannelData && user) {
          const { channelId, serverId, timestamp } = JSON.parse(lastChannelData);
          const timePassed = Date.now() - timestamp;
          
          // 5 dakikadan az ge├ğtiyse otomatik kat─▒l
          if (timePassed < 5 * 60 * 1000) {
            console.log('­şöä Auto-reconnecting to last voice channel:', channelId);
            
            const server = servers.find(s => s.id === serverId);
            const channel = channels.find(c => c.id === channelId);
            
            if (server && channel) {
              // State'leri ayarla
              setConnectedVoiceChannelId(channelId);
              connectedVoiceChannelIdRef.current = channelId;
              
              // Kendini hemen ekle
              setVoiceUsers([{
                userId: user.id,
                username: user.username,
                isMuted: false,
                isSpeaking: false
              }]);
              
              // Mikrofonu ba┼şlat
              const success = await startAudioMonitoring();
              if (!success) {
                console.error('ÔØî Mikrofon ba┼şlat─▒lamad─▒');
                setConnectedVoiceChannelId(null);
                connectedVoiceChannelIdRef.current = null;
                setVoiceUsers([]);
                localStorage.removeItem('lastVoiceChannel');
                return;
              }
              
              // Sesli kanala kat─▒l
              voiceSocket.emit('join-voice', {
                roomId: serverId,
                channelId: channelId,
                userId: user.id,
                username: user.username
              });
              
              console.log('Ô£à Auto-reconnected to voice channel');
              showToast('success', 'Sesli kanala yeniden kat─▒ld─▒n─▒z!');
              
              // Giri┼ş sesi ├ğal
              setTimeout(() => {
                if (joinSoundRef.current) {
                  joinSoundRef.current.currentTime = 0;
                  joinSoundRef.current.volume = 0.5;
                  joinSoundRef.current.play().catch(e => console.log('Sound failed:', e));
                }
              }, 500);
            } else {
              console.log('ÔÜá´©Å Last channel not found, clearing localStorage');
              localStorage.removeItem('lastVoiceChannel');
            }
          } else {
            console.log('ÔÅ░ Last channel expired (>5 min), clearing');
            localStorage.removeItem('lastVoiceChannel');
          }
        }
      } catch (e) {
        console.error('ÔØî LocalStorage read error:', e);
      }
    });
    
    voiceSocket.on('disconnect', (reason: string) => {
      console.warn('ÔÜá´©Å Voice socket disconnected:', reason);
      
      // Ba─şlant─▒ koparsa peer connections'─▒ temizle
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      
      // ÔÜá´©Å ANINDA KANALDAN ├çIK!
      if (connectedVoiceChannelIdRef.current) {
        console.log('­şÜ¬ Voice disconnected - Leaving channel IMMEDIATELY');
        
        // Mikrofonu kapat
        stopAudioMonitoring();
        
        // UI'─▒ g├╝ncelle
        setConnectedVoiceChannelId(null);
        connectedVoiceChannelIdRef.current = null;
        setVoiceUsers([]);
        
        // ├ç─▒k─▒┼ş sesi ├ğal
        if (leaveSoundRef.current) {
          leaveSoundRef.current.currentTime = 0;
          leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
        }
        
        showToast('error', 'Ba─şlant─▒ kesildi! Sesli kanaldan ├ğ─▒kt─▒n─▒z.');
      }
    });
    
    voiceSocket.on('connect_error', (error: any) => {
      console.error('ÔØî Voice connection error:', error);
    });
    
    voiceSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`­şöä Attempting to reconnect to voice... (${attemptNumber})`);
      showToast('info', `Sesli kanala yeniden ba─şlan─▒yor... (${attemptNumber}/10)`);
    });
    
    voiceSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`Ô£à Voice reconnected after ${attemptNumber} attempts`);
      showToast('success', 'Sesli kanala yeniden ba─şland─▒!');
    });
    
    voiceSocket.on('reconnect_failed', () => {
      console.error('ÔØî Voice reconnection failed');
      showToast('error', 'Sesli kanala ba─şlan─▒lamad─▒. Sayfay─▒ yenileyin.');
      setConnectedVoiceChannelId(null);
      connectedVoiceChannelIdRef.current = null;
    });
    
    voiceSocket.on('voice-state-update', ({ channelId, users }: any) => {
      console.log('­şÄñ Voice state update - Channel:', channelId, 'Users:', users, 'CurrentChannel:', connectedVoiceChannelIdRef.current);
      if (channelId === connectedVoiceChannelIdRef.current && users) {
        console.log('Ô£à Updating voice users from state update');
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('voice-users', ({ channelId, users }: any) => {
      console.log('­şæÑ Voice users list - Channel:', channelId, 'Users:', users);
      if (users && users.length > 0) {
        console.log('Ô£à Setting voice users from list');
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('channel-voice-users', ({ channelId, users }: any) => {
      console.log('­şôï Channel voice users - Channel:', channelId, 'Users:', users);
      if (channelId === connectedVoiceChannelIdRef.current && users) {
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('user-joined-voice', ({ channelId, userId, username, user: userData }: any) => {
      console.log('­şæï User joined voice - Channel:', channelId, 'User:', username || userData?.username, 'CurrentChannel:', connectedVoiceChannelIdRef.current);
      
      // Sadece aktif kanal─▒m─▒zsa ekle
      if (channelId === connectedVoiceChannelIdRef.current) {
        // ­şöè B─░R─░ KATILDI SES─░ ├çAL!
        if (joinSoundRef.current) {
          joinSoundRef.current.currentTime = 0;
          joinSoundRef.current.volume = 0.3; // Daha d├╝┼ş├╝k (kendi sesimiz de─şil)
          joinSoundRef.current.play().catch(e => console.log('Join sound failed:', e));
        }
        
        setVoiceUsers(prev => {
          const actualUsername = username || userData?.username || 'Unknown';
          const actualUserId = userId || userData?.id;
          const exists = prev.some(u => u.userId === actualUserId);
          
          if (exists) {
            console.log('ÔÜá´©Å User already in list:', actualUsername);
            return prev;
          }
          
          const newList = [...prev, { 
            userId: actualUserId, 
            username: actualUsername, 
            isMuted: false, 
            isSpeaking: false 
          }];
          console.log('Ô£à Added user to voice list. Total users:', newList.length);
          showToast('info', `${actualUsername} sesli kanala kat─▒ld─▒`);
          return newList;
        });
      }
    });
    
    voiceSocket.on('user-left-voice', ({ channelId, userId, username }: any) => {
      console.log('­şæï User left voice:', userId, username);
      
      // ­şöè B─░R─░ ├çIKTI SES─░ ├çAL!
      if (leaveSoundRef.current) {
        leaveSoundRef.current.currentTime = 0;
        leaveSoundRef.current.volume = 0.3; // Daha d├╝┼ş├╝k
        leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
      }
      
      setVoiceUsers(prev => {
        const leftUser = prev.find(u => u.userId === userId);
        if (leftUser) {
          showToast('info', `${leftUser.username || username || 'Kullan─▒c─▒'} sesli kanaldan ayr─▒ld─▒`);
        }
        return prev.filter(u => u.userId !== userId);
      });
    });
    
    voiceSocket.on('user-speaking', ({ userId, isSpeaking }: any) => {
      setVoiceUsers(prev => prev.map(u => u.userId === userId ? { ...u, isSpeaking } : u));
    });
    
    voiceSocket.on('user-muted', ({ userId, isMuted }: any) => {
      setVoiceUsers(prev => prev.map(u => u.userId === userId ? { ...u, isMuted } : u));
    });
    
    // Ô£à BACKEND'DEN GELEN ANA EVENT (T├£M KULLANICILAR)
    voiceSocket.on('voice-channel-update', ({ channelId, users }: any) => {
      console.log('­şöè Voice channel update - Channel:', channelId, 'Users:', users);
      
      if (users && Array.isArray(users)) {
        // T├£M KANALLAR i├ğin g├╝ncelle (├Ânizleme i├ğin)
        setChannelVoiceUsers(prev => ({
          ...prev,
          [channelId]: users
        }));
        
        // Kendi kanal─▒m─▒z i├ğin de voiceUsers'─▒ g├╝ncelle
        if (channelId === connectedVoiceChannelIdRef.current) {
          const formattedUsers = users.map((u: any) => ({
            userId: u.id,
            username: u.username,
            isMuted: u.isMuted || false,
            isSpeaking: false
          }));
          
          // ­şöè KULLANICI SAYISI DE─Ş─░┼ŞT─░ M─░ KONTROL ET!
          setVoiceUsers(prev => {
            // Yeni kat─▒lan var m─▒?
            formattedUsers.forEach(newUser => {
              const exists = prev.find(u => u.userId === newUser.userId);
              if (!exists && newUser.userId !== user?.id) {
                // ­şöè B─░R─░ KATILDI!
                console.log('­şöè Playing join sound for:', newUser.username);
                if (joinSoundRef.current) {
                  joinSoundRef.current.currentTime = 0;
                  joinSoundRef.current.volume = 0.3;
                  joinSoundRef.current.play().catch(e => console.log('Join sound failed:', e));
                }
                showToast('info', `${newUser.username} sesli kanala kat─▒ld─▒`);
              }
            });
            
            // ├ç─▒kan var m─▒?
            prev.forEach(oldUser => {
              const stillThere = formattedUsers.find(u => u.userId === oldUser.userId);
              if (!stillThere && oldUser.userId !== user?.id) {
                // ­şöè B─░R─░ ├çIKTI!
                console.log('­şöè Playing leave sound for:', oldUser.username);
                if (leaveSoundRef.current) {
                  leaveSoundRef.current.currentTime = 0;
                  leaveSoundRef.current.volume = 0.3;
                  leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
                }
                showToast('info', `${oldUser.username} sesli kanaldan ayr─▒ld─▒`);
              }
            });
            
            return formattedUsers;
          });
          
          console.log('Ô£à Setting voice users for current channel:', formattedUsers);
        }
      }
    });

    // WebRTC Events
    voiceSocket.on('peer-joined', async ({ peerId, username, shouldOffer, isScreenSharing, isVideoOn }: any) => {
      console.log('­şöù Peer joined:', peerId, username, 'Should offer:', shouldOffer, 'Screen:', isScreenSharing, 'Video:', isVideoOn);
      
      // Ô£à DUPLICATE KONTROL├£ - Ayn─▒ peer zaten varsa skip et
      if (peerConnectionsRef.current.has(peerId)) {
        console.warn('ÔÜá´©Å Peer already exists, skipping:', peerId);
        return;
      }
      
      // Yeni kat─▒lan varsa ve ekran/video payla┼ş─▒yorsa state'e ekle
      if (isScreenSharing || isVideoOn) {
        setRemoteUsers(prev => {
          const existing = prev.find(u => u.userId === peerId);
          if (existing) {
            return prev.map(u => u.userId === peerId ? { ...u, username, isScreenSharing, isVideoOn } : u);
          }
          return [...prev, { userId: peerId, username, isScreenSharing, isVideoOn }];
        });
        
        if (isScreenSharing) {
          showToast('info', `­şûÑ´©Å ${username} ekran payla┼ş─▒yor`);
        }
      }
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10
      });
      
      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log(`­şôí Connection state for ${peerId}:`, pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log(`Ô£à Successfully connected to ${username}`);
        } else if (pc.connectionState === 'failed') {
          console.error(`ÔØî Connection failed to ${username}, attempting restart...`);
          // Ba─şlant─▒ ba┼şar─▒s─▒z, peer'─▒ kapat ve tekrar ba─şlan
          setTimeout(() => {
            pc.close();
            peerConnectionsRef.current.delete(peerId);
            console.log(`­şöä Restarting connection to ${username}`);
          }, 1000);
        } else if (pc.connectionState === 'disconnected') {
          console.warn(`ÔÜá´©Å Disconnected from ${username}, waiting for reconnection...`);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log(`­şğè ICE state for ${peerId}:`, pc.iceConnectionState);
        
        // ICE ba─şlant─▒s─▒ ba┼şar─▒s─▒z olursa restart
        if (pc.iceConnectionState === 'failed') {
          console.error(`ÔØî ICE failed for ${username}, restarting ICE...`);
          pc.restartIce();
        } else if (pc.iceConnectionState === 'disconnected') {
          console.warn(`ÔÜá´©Å ICE disconnected for ${username}, waiting...`);
          // 5 saniye sonra hala disconnected ise restart
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log(`­şöä ICE still disconnected, restarting for ${username}`);
              pc.restartIce();
            }
          }, 5000);
        }
      };
      
      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate && voiceSocketRef.current) {
          console.log('­şğè Sending ICE candidate to:', peerId);
          voiceSocketRef.current.emit('signal', {
            type: 'ice-candidate',
            to: peerId,
            data: event.candidate
          });
        }
      };
      
      // Remote stream handler
      pc.ontrack = (event) => {
        console.log('­şÄğ Received remote track from:', username, 'Kind:', event.track.kind, 'ID:', event.track.id);
        const [remoteStream] = event.streams;
        
        if (remoteStream) {
          console.log('­şôĞ Remote stream received, all tracks:', remoteStream.getTracks().map(t => t.kind));
          remoteStreamsRef.current.set(peerId, remoteStream);
          
          // Update remote users state with stream (for screen share & video)
          console.log('­şöä Updating remote users state for:', peerId, 'with stream');
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.userId === peerId);
            if (existing) {
              console.log('Ô£à Updating existing user:', peerId, 'with stream');
              return prev.map(u => u.userId === peerId ? { ...u, stream: remoteStream } : u);
            }
            console.log('ÔŞò Adding new user:', peerId, 'with stream');
            return [...prev, { userId: peerId, username, stream: remoteStream }];
          });
          
          // Remove existing audio element if any
          const existingAudio = document.getElementById(`audio-${peerId}`);
          if (existingAudio) existingAudio.remove();
          
          // Create audio element and play (only for audio tracks)
          if (event.track.kind === 'audio') {
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.id = `audio-${peerId}`;
            audio.volume = userVolumeSettings[peerId] || 1.0;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            
            audio.play().then(() => {
              console.log(`­şöè Audio playing for ${username}, volume: ${audio.volume}`);
            }).catch(err => {
              console.error(`ÔØî Audio play failed for ${username}:`, err);
              showToast('warning', `${username} i├ğin ses a├ğmak i├ğin t─▒klay─▒n`);
            });
          }
          
          // For video tracks (screen share or camera)
          if (event.track.kind === 'video') {
            console.log('­şô╣ VIDEO TRACK RECEIVED from:', username);
            console.log('­şô╣ Video track enabled:', event.track.enabled, 'readyState:', event.track.readyState);
            
            // Update theater presenter if this is the current presenter
            if (theaterPresenter?.userId === peerId || showTheaterMode) {
              console.log('­şöä Updating theater presenter stream for:', username);
              setTheaterPresenter(prev => prev ? { ...prev, stream: remoteStream } : null);
            }
          }
        }
      };
      
      // Add local stream
    if (localStreamRef.current) {
        console.log('­şôñ Adding local tracks to peer connection');
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
          console.log('ÔŞò Added track:', track.kind, 'enabled:', track.enabled);
        });
            } else {
        console.error('ÔØî No local stream available!');
      }
      
      peerConnectionsRef.current.set(peerId, pc);
      
      // Create offer if needed
      if (shouldOffer) {
        try {
          console.log('­şôñ Creating offer for:', username);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true // Ô£à Video track'leri kabul et (screen share i├ğin)
          });
          await pc.setLocalDescription(offer);
          
          voiceSocketRef.current?.emit('signal', {
            type: 'offer',
            to: peerId,
            data: offer
          });
          console.log('Ô£à Offer sent to:', username);
        } catch (error) {
          console.error('ÔØî Offer creation failed:', error);
        }
      }
    });
    
    voiceSocket.on('peer-left', ({ peerId }: any) => {
      console.log('­şæï Peer left:', peerId);
      
      // Clean up peer connection
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(peerId);
      }
      
      // Remove audio element
      const audio = document.getElementById(`audio-${peerId}`);
      if (audio) {
        audio.remove();
      }
      
      remoteStreamsRef.current.delete(peerId);
      
      // Remove from remote users
      setRemoteUsers(prev => prev.filter(u => u.userId !== peerId));
    });
    
    // Screen share events (Broadcast to all in channel)
    voiceSocket.on('screen-share-started', ({ userId, username }: { userId: string; username: string }) => {
      if (userId === user?.id) return; // Ignore self
      
      console.log('­şô║ Screen share started by:', username);
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (existing) {
          return prev.map(u => u.userId === userId ? { ...u, isScreenSharing: true } : u);
        }
        return [...prev, { userId, username, isScreenSharing: true }];
      });
      showToast('info', `­şûÑ´©Å ${username} ekran payla┼ş─▒yor`);
    });

    voiceSocket.on('screen-share-stopped', ({ userId }: { userId: string }) => {
      console.log('­şô║ Screen share stopped by:', userId);
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isScreenSharing: false, stream: undefined } : u
      ));
      
      // HERKES ─░├ç─░N KAPAT - Kim olursa olsun
      if (theaterPresenter?.userId === userId || showTheaterMode) {
        setShowTheaterMode(false);
        setTheaterPresenter(null);
        showToast('info', 'Ekran payla┼ş─▒m─▒ sona erdi');
      }
    });

    voiceSocket.on('video-started', ({ userId, username }: { userId: string; username: string }) => {
      if (userId === user?.id) return; // Ignore self
      
      console.log('­şô╣ Video started by:', username);
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (existing) {
          return prev.map(u => u.userId === userId ? { ...u, isVideoOn: true } : u);
        }
        return [...prev, { userId, username, isVideoOn: true }];
      });
    });

    voiceSocket.on('video-stopped', ({ userId }: { userId: string }) => {
      console.log('­şô╣ Video stopped by:', userId);
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isVideoOn: false } : u
      ));
    });
    
    voiceSocket.on('signal', async ({ from, type, data }: any) => {
      console.log('­şô¿ Signal from:', from, 'Type:', type);
      
      let pc = peerConnectionsRef.current.get(from);
      
      if (!pc && type === 'offer') {
        console.log('­şåò Creating new peer connection for incoming offer from:', from);
        // Create new peer connection for incoming offer
        pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10
        });
        
        pc.onconnectionstatechange = () => {
          console.log(`­şôí Connection state for ${from}:`, pc!.connectionState);
          if (pc!.connectionState === 'connected') {
            console.log(`Ô£à Successfully connected to peer ${from}`);
          } else if (pc!.connectionState === 'failed') {
            console.error(`ÔØî Connection failed to ${from}, attempting restart...`);
            setTimeout(() => {
              pc!.close();
              peerConnectionsRef.current.delete(from);
              console.log(`­şöä Restarting connection to ${from}`);
            }, 1000);
          }
        };
        
        pc.oniceconnectionstatechange = () => {
          console.log(`­şğè ICE state for ${from}:`, pc!.iceConnectionState);
          
          if (pc!.iceConnectionState === 'failed') {
            console.error(`ÔØî ICE failed for ${from}, restarting ICE...`);
            pc!.restartIce();
          } else if (pc!.iceConnectionState === 'disconnected') {
            console.warn(`ÔÜá´©Å ICE disconnected for ${from}, waiting...`);
            setTimeout(() => {
              if (pc!.iceConnectionState === 'disconnected') {
                console.log(`­şöä ICE still disconnected, restarting for ${from}`);
                pc!.restartIce();
              }
            }, 5000);
          }
        };
        
    pc.onicecandidate = (event) => {
      if (event.candidate && voiceSocketRef.current) {
            console.log('­şğè Sending ICE candidate to:', from);
            voiceSocketRef.current.emit('signal', {
              type: 'ice-candidate',
              to: from,
              data: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
          console.log('­şÄğ Received remote stream from signal:', from, 'Track:', event.track.kind);
      const [remoteStream] = event.streams;
          
          if (remoteStream) {
            remoteStreamsRef.current.set(from, remoteStream);
            
            const existingAudio = document.getElementById(`audio-${from}`);
            if (existingAudio) existingAudio.remove();
            
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
        audio.autoplay = true;
            audio.id = `audio-${from}`;
            audio.volume = userVolumeSettings[from] || 1.0; // ÔåÉ SES SEV─░YES─░ AYARI!
        audio.style.display = 'none';
        document.body.appendChild(audio);
            
            audio.play().then(() => {
              console.log(`­şöè Audio playing for peer: ${from}, volume: ${audio.volume}`);
            }).catch(err => {
              console.error(`ÔØî Audio play failed for peer ${from}:`, err);
            });
          }
        };
        
        if (localStreamRef.current) {
          console.log('­şôñ Adding local tracks to new peer connection');
          localStreamRef.current.getTracks().forEach(track => {
            pc!.addTrack(track, localStreamRef.current!);
            console.log('ÔŞò Added track:', track.kind);
          });
        }
        
        peerConnectionsRef.current.set(from, pc);
      }
      
      if (pc) {
        try {
          if (type === 'offer') {
            console.log('­şôÑ Processing offer from:', from);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true // Ô£à Video track'leri kabul et
            });
            await pc.setLocalDescription(answer);
            
            voiceSocketRef.current?.emit('signal', {
              type: 'answer',
              to: from,
              data: answer
            });
            console.log('Ô£à Answer sent to:', from);
          } else if (type === 'answer') {
            console.log('­şôÑ Processing answer from:', from);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            console.log('Ô£à Answer processed for:', from);
          } else if (type === 'ice-candidate') {
            console.log('­şğè Adding ICE candidate from:', from);
            await pc.addIceCandidate(new RTCIceCandidate(data));
          }
        } catch (error) {
          console.error(`ÔØî Signal processing error for ${from}:`, error);
        }
      } else {
        console.warn(`ÔÜá´©Å No peer connection found for ${from}`);
      }
    });
    
    return () => { voiceSocket.disconnect(); };
  }, [accessToken]);

  useEffect(() => {
    if (!socketRef.current || !selectedChannel || selectedChannel.type !== 'TEXT') return;
    if (currentChannelIdRef.current && currentChannelIdRef.current !== selectedChannel.id) {
      socketRef.current.emit('leave-channel', { channelId: currentChannelIdRef.current });
    }
    currentChannelIdRef.current = selectedChannel.id;
    socketRef.current.emit('join-channel', { channelId: selectedChannel.id });
    loadMessages(selectedChannel.id);
  }, [selectedChannel]);

  const loadServers = async () => { try { const response = await serversApi.getAll(); setServers(response.data); if (response.data.length > 0) setSelectedServer(response.data[0]); } catch (error) { console.error('Error:', error); } };
  const loadChannels = async (serverId: string) => { try { const response = await channelsApi.getByServer(serverId); setChannels(response.data); if (response.data.length > 0) setSelectedChannel(response.data[0]); } catch (error) { console.error('Error:', error); } };
  const loadServerMembers = async (serverId: string) => { 
    try { 
      const response = await serversApi.getMembers(serverId); 
      const members = response.data.map((m: any) => ({ 
        userId: m.userId || m.user?.id, 
        username: m.user?.username || 'Unknown', 
        displayName: m.user?.displayName, 
        isOnline: m.user?.isOnline || false 
      }));
      setServerMembers(members);
      // Presence is updated automatically via broadcasts!
    } catch (error) { 
      console.error('Error:', error); 
    } 
  };

  const loadFriends = async () => {
    try {
      const response = await friendsApi.getAll();
      // API'den gelen isOnline de─şerlerini kullan
      console.log('­şôĞ Raw API response:');
      response.data.forEach((f: any) => {
        console.log(`  ­şæñ id=${f.id}, username=${f.username}, isOnline=${f.isOnline}`);
      });
      const friendsData = response.data.map((f: any) => ({
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        isOnline: f.isOnline || false
      }));
      setFriends(friendsData);
      console.log('Ô£à Arkada┼şlar y├╝klendi:', friendsData.map((f: any) => `${f.username}=${f.isOnline}`).join(', '));
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };
  
  // Screen Share Handlers
  const handleStartScreenShare = async (stream: MediaStream) => {
    try {
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      showToast('success', '­şûÑ´©Å Ekran payla┼ş─▒m─▒ ba┼şlad─▒');
      
      console.log('­şûÑ´©Å Screen share stream acquired, tracks:', stream.getTracks().map(t => t.kind));
      
      // RTC ├╝zerinden ekran payla┼ş─▒m─▒n─▒ broadcast et
      if (connectedVoiceChannelId && voiceSocketRef.current) {
        const screenTrack = stream.getVideoTracks()[0];
        
        if (!screenTrack) {
          console.error('ÔØî No video track in screen share stream!');
          showToast('error', 'Ekran payla┼ş─▒m─▒ video track bulunamad─▒');
          return;
        }
        
        console.log('­şôñ Broadcasting screen share to', peerConnectionsRef.current.size, 'peers');
        
        // Her peer connection'a screen video track ekle
        peerConnectionsRef.current.forEach(async (pc, peerId) => {
          try {
            console.log('ÔŞò Adding screen track to peer:', peerId);
            
            // Mevcut sender'lar─▒ kontrol et
            const senders = pc.getSenders();
            console.log('­şôñ Current senders:', senders.map(s => s.track?.kind));
            
            pc.addTrack(screenTrack, stream);
            console.log('Ô£à Screen track added');
            
            // Yeni offer olu┼ştur (renegotiation i├ğin)
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true  // Ô£à Video kabul et!
            });
            await pc.setLocalDescription(offer);
            
            voiceSocketRef.current?.emit('signal', {
              type: 'offer',
              to: peerId,
              data: offer
            });
            console.log('Ô£à Screen share renegotiation offer sent to:', peerId);
          } catch (error) {
            console.error('ÔØî Failed to add screen track to peer:', peerId, error);
          }
        });
        
        // Notify others that screen share started
        voiceSocketRef.current.emit('screen-share-started', {
          channelId: connectedVoiceChannelId,
          userId: user?.id,
          username: user?.username,
        });
        
        // Set presenter for theater mode (with stream!)
        console.log('­şÄ¡ Setting theater presenter:', user!.username, 'Stream:', stream, 'Tracks:', stream.getTracks().length);
        setTheaterPresenter({
          userId: user!.id,
          username: user!.username,
          stream,
        });
        setShowTheaterMode(true);
      }
    } catch (error: any) {
      console.error('ÔØî Screen share error:', error);
      showToast('error', 'Ekran payla┼ş─▒m─▒ ba┼şlat─▒lamad─▒');
    }
  };

  const handleStopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setShowTheaterMode(false);
    setTheaterPresenter(null);
    showToast('info', '­şûÑ´©Å Ekran payla┼ş─▒m─▒ durduruldu');
    
    // Notify others
    if (connectedVoiceChannelId && voiceSocketRef.current) {
      voiceSocketRef.current.emit('screen-share-stopped', {
        channelId: connectedVoiceChannelId,
        userId: user?.id,
      });
    }
  };

  // Video Handlers
  const handleStartVideo = async (stream: MediaStream) => {
    try {
      videoStreamRef.current = stream;
      setIsVideoOn(true);
      showToast('success', '­şô╣ Kamera a├ğ─▒ld─▒');
      
      // RTC ├╝zerinden video'yu broadcast et
      if (connectedVoiceChannelId && voiceSocketRef.current) {
        peerConnectionsRef.current.forEach((pc, peerId) => {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, stream);
          }
        });
        
        voiceSocketRef.current.emit('video-started', {
          channelId: connectedVoiceChannelId,
          userId: user?.id,
        });
      }
    } catch (error: any) {
      showToast('error', 'Kamera a├ğ─▒lamad─▒');
    }
  };

  const handleStopVideo = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setIsVideoOn(false);
    showToast('info', '­şô╣ Kamera kapat─▒ld─▒');
    
    // Notify others
    if (connectedVoiceChannelId && voiceSocketRef.current) {
      voiceSocketRef.current.emit('video-stopped', {
        channelId: connectedVoiceChannelId,
        userId: user?.id,
      });
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      setLoading(true);
      const response = await messagesApi.getChannelMessages(channelId, 50);
      const data = response.data;
      const messageList = Array.isArray(data) ? data : (data.messages || []);
      setMessages(messageList.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedChannel || !selectedChannel.id) return;
    
    const messageContent = newMessage;
    const fileToUpload = selectedFile;
    setNewMessage(''); // Hemen temizle
    setSelectedFile(null); // Dosyay─▒ temizle
    
    try {
      let fileData = null;
      
      // Dosya varsa ├Ânce upload et (GER├çEK UPLOAD!)
      if (fileToUpload) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const uploadResponse = await uploadApi.uploadFile(fileToUpload, (progress) => {
          setUploadProgress(progress);
        });
        
        fileData = uploadResponse.data;
        setIsUploading(false);
        setUploadProgress(100);
      }
      
      // Mesaj─▒ g├Ânder
      const finalContent = messageContent || (fileData ? `­şôÄ ${fileData.filename}` : '');
      const response = await messagesApi.sendMessage(selectedChannel.id, finalContent);
      
      // Optimistically add message
      if (response.data && user) {
        const newMsg = {
          id: response.data.id || Math.random().toString(),
          content: finalContent,
          channelId: selectedChannel.id,
          createdAt: new Date().toISOString(),
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName
          }
        };
        setMessages(prev => [...prev, newMsg]);
        
        if (fileData) {
          showToast('success', `Ô£à Dosya y├╝klendi: ${fileData.filename}`);
        }
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Mesaj g├Ânderilemedi');
      setNewMessage(messageContent);
      setSelectedFile(fileToUpload);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !selectedServer) return;
    try {
      await channelsApi.create(selectedServer.id, { name: newChannelName, type: newChannelType });
      setNewChannelName('');
      setShowNewChannelModal(false);
      loadChannels(selectedServer.id);
      showToast('success', 'Kanal olu┼şturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kanal olu┼şturulamad─▒');
    }
  };

  const createServer = async () => {
    if (!newServerName.trim()) return;
    try {
      await serversApi.create({ name: newServerName, description: newServerDescription });
      setNewServerName('');
      setNewServerDescription('');
      setShowNewServerModal(false);
      loadServers();
      showToast('success', 'Sunucu olu┼şturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Sunucu olu┼şturulamad─▒');
    }
  };

  const generateInvite = async () => {
    if (!selectedServer) return;
    try {
      const response = await serversApi.createInvite(selectedServer.id);
      const code = response.data.inviteCode || response.data.code;
      setInviteCode(code);
      setShowInviteModal(true);
      showToast('success', 'Davet linki olu┼şturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Davet linki olu┼şturulamad─▒');
    }
  };

  // Ses seviyesi izlemeyi ba┼şlat
  const startAudioMonitoring = async (): Promise<boolean> => {
    try {
      console.log('­şÄÖ´©Å Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      stream.getTracks().forEach(track => track.enabled = true);
      localStreamRef.current = stream;
      console.log('Ô£à Microphone stream acquired');
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioAnalyserRef.current = audioContextRef.current.createAnalyser();
      
      // ÔÜí HASSAS SES ALGILAMA AYARLARI (Daha iyi sensitivity)
      audioAnalyserRef.current.fftSize = 512; // Daha hassas frekans analizi
      audioAnalyserRef.current.minDecibels = -100; // Daha d├╝┼ş├╝k sesler i├ğin
      audioAnalyserRef.current.maxDecibels = -10; // Daha geni┼ş aral─▒k
      audioAnalyserRef.current.smoothingTimeConstant = 0.2; // Daha h─▒zl─▒ tepki
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(audioAnalyserRef.current);
      
      const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
      let lastSpeakingState = false;
      
      audioLevelIntervalRef.current = window.setInterval(() => {
        // PTT modunda tu┼ş bas─▒l─▒ de─şilse veya mikrofon kapal─▒ysa ses g├Âsterme
        if (!audioAnalyserRef.current || isMuted || (isPushToTalkMode && !pushToTalkActive)) {
          setMyAudioLevel(0);
          return;
        }
        
        // Frekans verilerini al
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // ─░nsan sesi frekanslar─▒na odaklan (80Hz - 4000Hz aras─▒)
        // FFT 512 ile: ~86Hz per bin, insan sesi i├ğin bin 1-47 aras─▒
        let sum = 0;
        let count = 0;
        for (let i = 1; i < Math.min(48, dataArray.length); i++) {
          sum += dataArray[i];
          count++;
        }
        const average = count > 0 ? sum / count : 0;
        const level = average / 255;
        
        setMyAudioLevel(level);
        
        // ÔÜí D├£┼Ş├£K SES ─░├ç─░N HASSAS THRESHOLD (0.01)
        const isSpeaking = level > 0.01;
        if (isSpeaking !== lastSpeakingState && voiceSocketRef.current) {
          console.log(`­şÄñ Speaking: ${isSpeaking}, level: ${level.toFixed(3)}`);
          voiceSocketRef.current.emit('speaking', { isSpeaking });
          
          // ÔÅ░ AFK TIMER'I SIFIRLA! (Konu┼şma = Aktif)
          if (isSpeaking) {
            lastActivityRef.current = Date.now();
          }
          
          // Kendi kullan─▒c─▒n─▒n isSpeaking state'ini g├╝ncelle
          if (user) {
            setVoiceUsers(prev => prev.map(u => 
              u.userId === user.id ? { ...u, isSpeaking } : u
            ));
          }
          
          lastSpeakingState = isSpeaking;
        }
      }, 80); // ÔÜí DENGELI G├£NCELLEME (80ms - Optimal!)
      
      console.log('Ô£à Audio monitoring started');
      return true;
    } catch (error) {
      console.error('ÔØî Mikrofon eri┼şim hatas─▒:', error);
      showToast('error', 'Mikrofon eri┼şimi reddedildi');
      return false;
    }
  };

  const stopAudioMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn('AudioContext close failed:', e));
      audioContextRef.current = null;
    }
    
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      try {
        pc.close();
      } catch (e) {
        console.warn(`Failed to close peer ${peerId}:`, e);
      }
      
      // Remove audio element
      const audio = document.getElementById(`audio-${peerId}`);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      }
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    
    audioAnalyserRef.current = null;
    setMyAudioLevel(0);
    
    // Force garbage collection hint
    console.log('­şğ╣ Audio monitoring stopped and resources cleaned');
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  const textChannels = channels.filter(ch => ch.type === 'TEXT');
  const voiceChannels = channels.filter(ch => ch.type === 'VOICE');

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Modals */}
      {showInviteModal && inviteCode && selectedServer && (
        <ServerInviteModal inviteCode={inviteCode} serverName={selectedServer.name} onClose={() => setShowInviteModal(false)} showToast={showToast} />
      )}
      <CreateChannelModal isOpen={showNewChannelModal} channelName={newChannelName} channelType={newChannelType} onNameChange={setNewChannelName} onTypeChange={setNewChannelType} onCreate={createChannel} onClose={() => setShowNewChannelModal(false)} />
      <CreateServerModal isOpen={showNewServerModal} serverName={newServerName} serverDescription={newServerDescription} onNameChange={setNewServerName} onDescriptionChange={setNewServerDescription} onCreate={createServer} onClose={() => setShowNewServerModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} showToast={showToast} />

      {view === 'friends' ? (
        <FriendsView onClose={() => setView('servers')} showToast={showToast} />
      ) : view === 'dm' ? (
        <DirectMessagesView showToast={showToast} />
      ) : (
        <>
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 hover:bg-neutral-100 rounded-xl">
              <Menu className="w-5 h-5" />
              </button>
            <h1 className="font-bold text-lg text-blue-600">AsforceS</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('friends')} className="p-2 hover:bg-neutral-100 rounded-xl"><Users className="w-5 h-5" /></button>
              <button onClick={() => setView('dm')} className="p-2 hover:bg-neutral-100 rounded-xl"><MessageSquare className="w-5 h-5" /></button>
            </div>
              </div>
              
          {/* Horizontal Server Bar - Desktop Only */}
          <div className="hidden lg:flex bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 border-b-2 border-blue-800 shadow-xl w-full">
            <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto flex-1">
              {/* Logo */}
              <div className="flex items-center gap-3 pr-4 border-r border-white/20">
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/30 rounded-xl blur-md group-hover:blur-lg transition-all"></div>
                  <div className="relative w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-xl">
                    <span className="font-black text-xl bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">A</span>
              </div>
              </div>
            </div>
              
              {/* Server List */}
              <div className="flex gap-2 flex-1">
            {servers.map((server) => (
            <button
              key={server.id}
              onClick={() => setSelectedServer(server)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 group hover:scale-105 ${
                selectedServer?.id === server.id
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                    }`}
                    title={server.name}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-md ${
                      selectedServer?.id === server.id 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {server.icon || server.name.charAt(0).toUpperCase()}
                </div>
                    <span className="font-semibold text-sm whitespace-nowrap max-w-[120px] truncate">{server.name}</span>
            </button>
          ))}
          
                {/* Add Server */}
          <button
            onClick={() => setShowNewServerModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 border-2 border-dashed border-white/30"
          >
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm whitespace-nowrap">Sunucu Ekle</span>
          </button>
        </div>
              
              {/* Right Side - User & Logout */}
              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-semibold text-sm">{user?.username}</span>
                </div>
            <button
                  onClick={logout} 
                  className="p-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-lg transition-all duration-200 hover:scale-110"
            title="├ç─▒k─▒┼ş Yap"
          >
            <LogOut className="w-5 h-5" />
          </button>
              </div>
        </div>
      </div>

          {/* Main Content Wrapper */}
      <div className="flex-1 flex overflow-hidden">
            {/* Channel Sidebar - Clean White Design */}
            <div className={`${showMobileMenu ? 'flex' : 'hidden lg:flex'} w-72 bg-white flex-col border-r border-neutral-200 shadow-lg fixed lg:static inset-y-0 left-0 z-40 lg:z-auto`}>
            <div className="px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md relative">
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="lg:hidden absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-xl truncate mb-1 pr-12 lg:pr-0">{selectedServer?.name || 'Sunucu Se├ğ'}</h2>
              <p className="text-xs text-blue-100">{serverMembers.length} ├╝ye ├ğevrimi├ği</p>
          </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Text Channels */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Metin Kanallar─▒</h3>
                  <button onClick={() => setShowNewChannelModal(true)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
              </div>
                <div className="space-y-1.5">
                {textChannels.map((channel) => (
                  <button
                    key={channel.id}
                      onClick={() => {
                        setSelectedChannel(channel);
                        setShowDMPanel(false); // DM'i kapat
                        setShowFriendsPanel(false); // Arkada┼şlar panelini kapat
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      selectedChannel?.id === channel.id
                          ? 'bg-blue-500 text-white shadow-lg scale-105'
                          : 'text-neutral-700 hover:bg-blue-50 hover:scale-102'
                    }`}
                  >
                      <Hash className="w-5 h-5" />
                      <span className="font-medium truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Channels */}
              {voiceChannels.length > 0 && (
            <div>
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Sesli Kanallar</h3>
                  <div className="space-y-2">
                {voiceChannels.map((channel) => {
                  const isConnected = connectedVoiceChannelId === channel.id;
                      // Ba─şl─▒ kanalsa voiceUsers (mikrofon animasyonu i├ğin), de─şilse channelVoiceUsers (├Ânizleme i├ğin)
                      const currentChannelUsers = isConnected 
                        ? voiceUsers.map(u => ({ id: u.userId, username: u.username, isMuted: u.isMuted, isSpeaking: u.isSpeaking }))
                        : (channelVoiceUsers[channel.id] || []);
                  
                  return (
                    <div key={channel.id}>
                      <button
                            onClick={() => {
                              if (isConnected) {
                                  // Ayr─▒l
                                  stopAudioMonitoring();
                                  voiceSocketRef.current?.emit('leave-voice');
                                  setConnectedVoiceChannelId(null);
                                  connectedVoiceChannelIdRef.current = null;
                                  setVoiceUsers([]);
                                  
                                  // ­şÆ¥ LocalStorage'dan sil
                                  localStorage.removeItem('lastVoiceChannel');
                                  
                                  // ­şöè ├çIKI┼Ş SES─░ ├çAL!
                                  if (leaveSoundRef.current) {
                                    leaveSoundRef.current.currentTime = 0;
                                    leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                  }
                                  
                                  console.log('­şÜ¬ Left voice channel:', channel.id);
                              } else {
                                // Kat─▒l
                                (async () => {
                                  setConnectedVoiceChannelId(channel.id);
                                  connectedVoiceChannelIdRef.current = channel.id;
                                  
                                  // Mikrofonu ba┼şlat ve BEKLE
                                  const success = await startAudioMonitoring();
                                  
                                  if (!success) {
                                    console.error('ÔØî Mikrofon ba┼şlat─▒lamad─▒, sesli kanala kat─▒lma iptal edildi');
                                    setConnectedVoiceChannelId(null);
                                    connectedVoiceChannelIdRef.current = null;
                                    return;
                                  }
                                  
                                  // Ô£à Mikrofon haz─▒r, ┼şimdi sesli kanala kat─▒l
                                  if (voiceSocketRef.current && user && selectedServer) {
                                    voiceSocketRef.current.emit('join-voice', { 
                                      roomId: selectedServer.id,
                                      channelId: channel.id,
                                      userId: user.id,
                                      username: user.username
                                    });
                                    console.log('­şÄñ Joining voice - Server:', selectedServer.id, 'Channel:', channel.id);
                                    
                                    // Ô£à KEND─░N─░ HEMEN EKLE!
                                    setVoiceUsers([{
                                      userId: user.id,
                                      username: user.username,
                                      isMuted: false,
                                      isSpeaking: false
                                    }]);
                                    console.log('­şæñ Added self to voice immediately:', user.username);
                                    
                                    // ­şÆ¥ Kanala kat─▒l─▒nca localStorage'a kaydet
                                    localStorage.setItem('lastVoiceChannel', JSON.stringify({
                                      channelId: channel.id,
                                      serverId: selectedServer.id,
                                      timestamp: Date.now()
                                    }));
                                    
                                    // ­şöè G─░R─░┼Ş SES─░ ├çAL!
                                    setTimeout(() => {
                                      if (joinSoundRef.current) {
                                        joinSoundRef.current.currentTime = 0;
                                        joinSoundRef.current.volume = 0.5; // Orta seviye
                                        joinSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                      }
                                    }, 500); // Mikrofon ba┼şlad─▒ktan sonra
                                  }
                                })();
                              }
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                          isConnected
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Volume2 className="w-5 h-5" />
                              <span className="font-medium">{channel.name}</span>
                            </div>
                            {currentChannelUsers.length > 0 && (
                              <span className="text-xs px-2 py-1 bg-white/20 rounded-full font-semibold">{currentChannelUsers.length}</span>
                        )}
                      </button>
                      
                          {/* Sesli kanaldaki kullan─▒c─▒lar - Her zaman g├Âster */}
                          {currentChannelUsers.length > 0 && (
                            <div className="ml-4 mt-3 space-y-2">
                              {currentChannelUsers.map((vu) => {
                                const isMe = vu.id === user?.id;
                                const currentIsSpeaking = isMe 
                                  ? (myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive)) 
                                  : vu.isSpeaking;
                            
                            return (
                              <div 
                                    key={vu.id}
                                    onContextMenu={(e) => {
                                      if (!isMe) {
                                        e.preventDefault();
                                        setContextMenu({
                                          userId: vu.id,
                                          username: vu.username,
                                          x: e.clientX,
                                          y: e.clientY
                                        });
                                      }
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                                      currentIsSpeaking 
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 shadow-md border-l-4 border-green-500 scale-105' 
                                        : 'bg-white/60 hover:bg-white hover:shadow-sm border-l-4 border-transparent'
                                    }`}
                                  >
                                    <div className="relative">
                                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 ${
                                        currentIsSpeaking ? 'ring-4 ring-green-400 ring-offset-2 scale-110' : 'ring-2 ring-white'
                                      }`}>
                                        {vu.username?.charAt(0).toUpperCase() || 'U'}
                                      </div>
                                      {currentIsSpeaking && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-ping"></div>
                                  )}
                                </div>
                                    
                                <div className="flex-1 min-w-0">
                                      <div className={`font-semibold text-sm truncate ${currentIsSpeaking ? 'text-green-700' : 'text-neutral-800'}`}>
                                        {vu.username} {isMe && <span className="text-xs text-blue-600">(Sen)</span>}
                                </div>
                                      {currentIsSpeaking && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <div className="flex gap-0.5">
                                            <div className="w-1 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1 h-4 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                                            <div className="w-1 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                                            <div className="w-1 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                          </div>
                                          <span className="text-xs text-green-600 font-medium ml-1">Konu┼şuyor...</span>
                                  </div>
                                )}
                                      {!isMe && (
                                        <div className="mt-2">
                                          <div className="flex items-center gap-2">
                                            <Volume2 className="w-3 h-3 text-neutral-500" />
                                            <input
                                              type="range"
                                              min="0"
                                              max="100"
                                              value={(userVolumeSettings[vu.id] || 1) * 100}
                                              onChange={(e) => {
                                                const volume = parseInt(e.target.value) / 100;
                                                setUserVolumeSettings(prev => ({ ...prev, [vu.id]: volume }));
                                                const audioEl = document.getElementById(`audio-${vu.id}`) as HTMLAudioElement;
                                                if (audioEl) {
                                                  audioEl.volume = volume;
                                                  console.log(`­şöè Volume for ${vu.username}: ${volume}`);
                                                }
                                              }}
                                              className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                                            />
                                            <span className="text-xs text-neutral-600 font-medium w-8">{Math.round((userVolumeSettings[vu.id] || 1) * 100)}%</span>
                              </div>
                        </div>
                      )}
                    </div>
                                    
                                    {vu.isMuted ? (
                                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                        </svg>
              </div>
                                    ) : currentIsSpeaking ? (
                                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z"/>
                                          <path d="M6 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zM14 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z"/>
                                          <path d="M4 10a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM16 10a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z"/>
                                        </svg>
            </div>
                                    ) : (
                                      <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                        </svg>
          </div>
                                    )}
            </div>
                                );
                              })}
              </div>
                )}
              </div>
                      );
                    })}
            </div>
                </div>
              )}

              {/* Quick Access - Portal, Friends, Settings */}
              <div className="pt-4 border-t-2 border-neutral-200">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  ÔÜí H─▒zl─▒ Eri┼şim
                </h3>
                <div className="space-y-1.5">
                  <a
                    href="/"
                    target="_blank"
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-sm">­şÅá</div>
                    <div className="flex-1">
                      <div className="font-bold">Portal</div>
                      <div className="text-xs text-blue-600">Ana sayfa</div>
                    </div>
                  </a>
                  <button
                    onClick={() => { 
                      setShowFriendsPanel(true); 
                      setShowDMPanel(false); 
                      setSelectedChannel(null); // Kanal se├ğimini kald─▒r
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      showFriendsPanel ? 'bg-blue-500 text-white' : 'text-neutral-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      showFriendsPanel ? 'bg-white/20 text-white' : 'bg-neutral-100 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">Arkada┼şlar</span>
                  </button>
                  <button
                    onClick={() => { setShowDMPanel(true); setShowFriendsPanel(false); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      showDMPanel ? 'bg-blue-500 text-white' : 'text-neutral-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      showDMPanel ? 'bg-white/20 text-white' : 'bg-neutral-100 group-hover:bg-blue-500 group-hover:text-white'
                    }`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="font-semibold">Direkt Mesajlar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* User Profile Card with Voice Controls */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
              <div className="bg-white rounded-2xl p-3 shadow-lg space-y-3">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                    {user?.avatar ? (
                      <img src={`${API_BASE}${user.avatar}`} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-neutral-900 truncate">{user?.username}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
                      <span className="text-xs text-green-600 font-medium">Çevrimiçi</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2.5 bg-neutral-100 hover:bg-blue-500 text-neutral-600 hover:text-white rounded-xl transition-all duration-200 hover:scale-110 shadow-sm"
                    title="Ayarlar"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* Voice Controls - Sadece sesli kanala bağlıyken göster */}
                {connectedVoiceChannelId && (
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                    <div className="text-xs text-neutral-600 truncate">
                      <span className="font-semibold">{channels.find(c => c.id === connectedVoiceChannelId)?.name || 'Sesli'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Mikrofon */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setIsPushToTalkMode(!isPushToTalkMode);
                          localStorage.setItem('pushToTalk', String(!isPushToTalkMode));
                          showToast('info', isPushToTalkMode ? '🎤 Normal mod' : '⌨️ Bas-Konuş modu');
                        }}
                        className={`p-2 rounded-lg transition-all relative ${
                          isMuted ? 'bg-red-500' : pushToTalkActive && isPushToTalkMode ? 'bg-green-500' : isPushToTalkMode ? 'bg-yellow-500' : 'bg-neutral-700'
                        }`}
                        title={isPushToTalkMode ? (pushToTalkActive ? 'Konuşuyor' : 'PTT') : (isMuted ? 'Aç' : 'Kapat')}
                      >
                        {isMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                        {isPushToTalkMode && !isMuted && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full border border-white"></div>}
                      </button>
                      
                      {/* Kulaklık */}
                      <button
                        onClick={() => { const d = !isDeafened; setIsDeafened(d); if (d && !isMuted) setIsMuted(true); }}
                        className={`p-2 rounded-lg ${isDeafened ? 'bg-red-500' : 'bg-neutral-700'}`}
                        title={isDeafened ? 'Kulaklık Aç' : 'Kulaklık Kapat'}
                      >
                        <Headphones className={`w-3.5 h-3.5 ${isDeafened ? 'text-white' : 'text-neutral-400'}`} />
                      </button>
                      
                      {/* Ekran Paylaş */}
                      <button
                        onClick={async () => {
                          if (isScreenSharing) {
                            handleStopScreenShare();
                          } else {
                            try {
                              const stream = await navigator.mediaDevices.getDisplayMedia({
                                video: { cursor: 'always' } as any,
                                audio: shareSystemAudio ? { echoCancellation: false, noiseSuppression: false } : false
                              } as any);
                              stream.getVideoTracks()[0].onended = () => handleStopScreenShare();
                              await handleStartScreenShare(stream);
                            } catch (err) {}
                          }
                        }}
                        className={`p-2 rounded-lg ${isScreenSharing ? 'bg-blue-500' : 'bg-neutral-700'}`}
                        title="Ekran Paylaş"
                      >
                        <Monitor className={`w-3.5 h-3.5 ${isScreenSharing ? 'text-white' : 'text-neutral-400'}`} />
                      </button>

                      {/* Ayrıl */}
                      <button
                        onClick={() => {
                          stopAudioMonitoring();
                          voiceSocketRef.current?.emit('leave-voice');
                          setConnectedVoiceChannelId(null);
                          connectedVoiceChannelIdRef.current = null;
                          setVoiceUsers([]);
                          localStorage.removeItem('lastVoiceChannel');
                        }}
                        className="p-2 rounded-lg bg-red-500"
                        title="Ayrıl"
                      >
                        <Phone className="w-3.5 h-3.5 text-white rotate-[135deg]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-neutral-50 pb-20 lg:pb-0">
            {showDMPanel ? (
        <div className="flex-1 flex flex-col">
                {/* DM Header with Close Button */}
                <div className="h-16 bg-white border-b-2 border-neutral-200 px-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-neutral-800">Direkt Mesajlar</h2>
                      <p className="text-xs text-neutral-500">├ûzel sohbetleriniz</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDMPanel(false)}
                    className="p-2 hover:bg-red-50 text-neutral-600 hover:text-red-600 rounded-xl transition-all"
                    title="Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <DirectMessages 
                    friends={friends}
                    onBack={() => setShowDMPanel(false)}
                    showToast={showToast}
                  />
                </div>
              </div>
            ) : (
              <>
          {/* Channel Header */}
            <div className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
            {selectedChannel && (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedChannel.type === 'TEXT' 
                        ? 'bg-blue-500' 
                        : 'bg-green-500'
                    } shadow-md`}>
                      {selectedChannel.type === 'TEXT' ? <Hash className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </div>
                    <div>
                      <span className="font-bold text-neutral-800 text-lg">{selectedChannel.name}</span>
                      <p className="text-xs text-neutral-500">{selectedChannel.type === 'TEXT' ? 'Metin Kanal─▒' : 'Sesli Kanal'}</p>
                    </div>
                  </>
            )}
          </div>

              <div className="hidden lg:flex items-center gap-2">
                <button onClick={generateInvite} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Davet</span>
                </button>
              </div>
            </div>

            {/* Inline Screen Share (Mesajlar─▒n ├£st├╝nde) */}
            {selectedChannel?.type === 'TEXT' && showTheaterMode && theaterPresenter && (
              <InlineScreenShare
                presenter={theaterPresenter}
                participants={(() => {
                  // Unique participants (duplicate'leri temizle)
                  const uniqueMap = new Map();
                  
                  voiceUsers.forEach(vu => {
                    if (!uniqueMap.has(vu.userId)) {
                      uniqueMap.set(vu.userId, {
                        userId: vu.userId,
                        username: vu.username,
                        isMuted: vu.isMuted,
                        isSpeaking: vu.isSpeaking,
                        isScreenSharing: vu.userId === theaterPresenter.userId,
                        isVideoOn: remoteUsers.find(ru => ru.userId === vu.userId)?.isVideoOn,
                        stream: remoteUsers.find(ru => ru.userId === vu.userId)?.stream,
                      });
                    }
                  });
                  
                  // Add self if not already in list
                  if (!uniqueMap.has(user!.id)) {
                    uniqueMap.set(user!.id, {
                      userId: user!.id,
                      username: user!.username,
                      isMuted: isMuted || (isPushToTalkMode && !pushToTalkActive),
                      isSpeaking: myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive),
                      isScreenSharing: isScreenSharing,
                      isVideoOn,
                      stream: isVideoOn ? videoStreamRef.current || undefined : undefined,
                    });
                  }
                  
                  return Array.from(uniqueMap.values());
                })()}
                onClose={() => {
                  setShowTheaterMode(false);
                  setTheaterPresenter(null);
                }}
                myUserId={user!.id}
              />
            )}

            {/* Messages Area - DM Style */}
          {selectedChannel?.type === 'TEXT' ? (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-neutral-500">Y├╝kleniyor...</p>
                      </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-neutral-500">
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-800 mb-2">#{selectedChannel.name}</h3>
                        <p className="text-sm">─░lk mesaj─▒ siz g├Ânderin! ­şÜÇ</p>
                    </div>
                  </div>
                ) : (
                    messages.map((msg) => {
                      const isMe = msg.user?.id === user?.id;
                      const inviteMatch = msg.content.match(/https:\/\/app\.asforces\.com\/invite\/([a-zA-Z0-9]+)/);
                      const inviteCode = inviteMatch ? inviteMatch[1] : null;
                      
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-4 md:px-12 lg:px-24`}>
                          <div className={`max-w-lg ${isMe ? 'order-2' : 'order-1'}`}>
                            {!isMe && (
                              <div className="text-xs text-neutral-500 mb-1 ml-1 font-medium">
                                {msg.user?.displayName || msg.user?.username || 'Kullan─▒c─▒'}
                      </div>
                            )}
                            <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                              isMe 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md' 
                                : 'bg-white border-2 border-neutral-200 text-neutral-800 rounded-bl-md'
                            }`}>
                              <div className="message-content whitespace-pre-wrap break-words leading-relaxed text-lg">{msg.content}</div>
                              
                              {/* Invite Link Button */}
                              {inviteCode && (
                                <button
                                  onClick={() => {
                                    window.location.href = `/invite/${inviteCode}`;
                                  }}
                                  className={`mt-3 px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                                    isMe
                                      ? 'bg-blue-800 hover:bg-blue-900 text-white shadow-lg hover:scale-105'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105'
                                  }`}
                                >
                                  <span>­şÄë Sunucuya Kat─▒l</span>
                                </button>
                              )}
                              
                              <div className={`text-xs mt-2 ${isMe ? 'text-blue-200' : 'text-neutral-400'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                        </div>
                      );
                    })
                )}
                <div ref={messagesEndRef} />
              </div>

                {/* Message Input - Clean Blue Design */}
                <div className={`p-4 lg:p-6 bg-white border-t border-neutral-200 ${connectedVoiceChannelId ? 'mb-24' : ''}`}>
                  {selectedFile && (
                    <div className="mb-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl relative overflow-hidden">
                        {/* Progress Bar Background */}
                        {isUploading && uploadProgress > 0 && (
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-20 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        )}
                        
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center relative z-10">
                          {isUploading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="text-2xl">­şôÄ</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 relative z-10">
                          <p className="font-semibold text-neutral-800 truncate">{selectedFile.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-600">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {isUploading && uploadProgress > 0 && (
                              <span className="text-xs font-bold text-blue-600">
                                %{uploadProgress}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isUploading && (
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-all relative z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={sendMessage} className="flex items-center gap-2">
                    {/* Emoji Picker */}
                    <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
                    
                    {/* File Upload */}
                    <FileUpload 
                      onFileSelect={setSelectedFile}
                      onCancel={() => setSelectedFile(null)}
                      selectedFile={selectedFile}
                    />
                    
                    {/* Message Input */}
                    <div className="flex-1 bg-neutral-50 rounded-2xl border-2 border-neutral-200 focus-within:border-blue-500 focus-within:bg-white transition-all duration-200 shadow-sm">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`#${selectedChannel.name} kanal─▒na mesaj g├Ânder...`}
                        className="w-full px-5 py-4 bg-transparent text-neutral-900 placeholder-neutral-500 outline-none font-medium"
                        disabled={isUploading}
                      />
                    </div>
                    
                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                      className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 font-semibold flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="hidden sm:inline">Y├╝kleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span className="hidden sm:inline">G├Ânder</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
                    <Volume2 className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800 mb-2">Sesli Kanal</h3>
                  <p className="text-neutral-500">Sol men├╝den sesli kanala kat─▒l─▒n</p>
              </div>
            </div>
          )}
          </>
          )}
        </div>

          {/* Right Panel - Members/Friends */}
          {!showFriendsPanel && !showDMPanel ? (
            <div className="hidden xl:flex w-64 bg-white border-l border-neutral-200 flex-col shadow-lg">
              <div className="px-5 py-5 border-b border-neutral-200 bg-blue-50">
                <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  ├£yeler ÔÇö {serverMembers.length}
            </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {serverMembers.map((member) => (
                  <div key={member.userId} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-200 group">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {member.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      {member.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-neutral-800 truncate text-sm">
                        {member.displayName || member.username}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {member.isOnline ? '­şşó ├çevrimi├ği' : 'ÔÜ½ ├çevrimd─▒┼ş─▒'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : showFriendsPanel ? (
            <div className="hidden lg:flex w-[500px] xl:w-[600px] bg-white border-l-2 border-neutral-200 flex-col shadow-2xl">
              <div className="px-6 py-5 border-b-2 border-neutral-200 bg-gradient-to-r from-blue-50 to-blue-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Arkada┼şlar
                </h3>
                <button onClick={() => setShowFriendsPanel(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <FriendsPanel
                  friends={friends}
                  onFriendsUpdate={loadFriends}
                  onOpenDM={(friend) => {
                    setShowFriendsPanel(false);
                    setShowDMPanel(true);
                  }}
                  onClose={() => setShowFriendsPanel(false)}
                />
              </div>
            </div>
          ) : null}
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-2 py-3 flex justify-around shadow-2xl z-50">
            <button onClick={() => { setView('servers'); setShowMobileVoice(false); setShowDMPanel(false); setShowFriendsPanel(false); }} className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${view === 'servers' && !showMobileVoice && !showDMPanel ? 'bg-blue-100 text-blue-600' : 'text-neutral-600'}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium">Sohbet</span>
            </button>
            <button onClick={() => setShowMobileVoice(!showMobileVoice)} className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${showMobileVoice ? 'bg-green-100 text-green-600' : connectedVoiceChannelId ? 'bg-green-50 text-green-600' : 'text-neutral-600'}`}>
              <Volume2 className="w-5 h-5" />
              <span className="text-xs font-medium">Ses</span>
            </button>
            <button onClick={() => { setView('friends'); setShowMobileVoice(false); }} className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${view === 'friends' && !showMobileVoice ? 'bg-blue-100 text-blue-600' : 'text-neutral-600'}`}>
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">Arkada┼ş</span>
            </button>
            <button onClick={() => { setShowDMPanel(true); setShowMobileVoice(false); setShowFriendsPanel(false); }} className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${showDMPanel ? 'bg-blue-100 text-blue-600' : 'text-neutral-600'}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium">DM</span>
            </button>
            <button onClick={generateInvite} className="flex flex-col items-center space-y-1 px-3 py-2 rounded-xl text-neutral-600 hover:text-blue-600 transition-all">
              <LinkIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Davet</span>
            </button>
          </div>
          
          {/* Mobile Voice Channels Modal */}
          {showMobileVoice && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowMobileVoice(false)}>
              <div className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 px-6 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-xl">Sesli Kanallar</h2>
                      <p className="text-xs text-green-100 mt-1">{selectedServer?.name}</p>
                    </div>
                    <button onClick={() => setShowMobileVoice(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                {/* Voice Channels List */}
                <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(80vh - 88px)' }}>
                  {voiceChannels.length === 0 ? (
                    <div className="text-center py-12">
                      <Volume2 className="w-16 h-16 mx-auto text-neutral-300 mb-3" />
                      <p className="text-neutral-500 font-medium">Sesli kanal yok</p>
                    </div>
                  ) : (
                    voiceChannels.map((channel) => {
                      const isConnected = connectedVoiceChannelId === channel.id;
                      const currentChannelUsers = isConnected 
                        ? voiceUsers.map(u => ({ id: u.userId, username: u.username, isMuted: u.isMuted, isSpeaking: u.isSpeaking }))
                        : (channelVoiceUsers[channel.id] || []);
                      
                      return (
                        <div key={channel.id} className="bg-neutral-50 rounded-2xl overflow-hidden border-2 border-neutral-200">
                          <button
                            onClick={() => {
                              if (isConnected) {
                                stopAudioMonitoring();
                                voiceSocketRef.current?.emit('leave-voice');
                                setConnectedVoiceChannelId(null);
                                connectedVoiceChannelIdRef.current = null;
                                setVoiceUsers([]);
                                setShowMobileVoice(false);
                                
                                // ­şöè ├çIKI┼Ş SES─░ ├çAL!
                                if (leaveSoundRef.current) {
                                  leaveSoundRef.current.currentTime = 0;
                                  leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                }
                              } else {
                                (async () => {
                                  setConnectedVoiceChannelId(channel.id);
                                  connectedVoiceChannelIdRef.current = channel.id;
                                  
                                  // Mikrofonu ba┼şlat ve BEKLE
                                  const success = await startAudioMonitoring();
                                  
                                  if (!success) {
                                    console.error('ÔØî Mikrofon ba┼şlat─▒lamad─▒');
                                    setConnectedVoiceChannelId(null);
                                    connectedVoiceChannelIdRef.current = null;
                                    return;
                                  }
                                  
                                  // Ô£à Mikrofon haz─▒r, sesli kanala kat─▒l
                                  if (voiceSocketRef.current && user && selectedServer) {
                                    voiceSocketRef.current.emit('join-voice', { 
                                      roomId: selectedServer.id,
                                      channelId: channel.id,
                                      userId: user.id,
                                      username: user.username
                                    });
                                    
                                    // ­şöè G─░R─░┼Ş SES─░ ├çAL! (Mobil)
                                    setTimeout(() => {
                                      if (joinSoundRef.current) {
                                        joinSoundRef.current.currentTime = 0;
                                        joinSoundRef.current.volume = 0.5;
                                        joinSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                      }
                                    }, 500);
                                  }
                                  setShowMobileVoice(false);
                                })();
                              }
                            }}
                            className={`w-full flex items-center justify-between px-5 py-4 transition-all ${
                              isConnected
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'bg-white hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Volume2 className={`w-6 h-6 ${isConnected ? 'text-white' : 'text-green-600'}`} />
                              <div className="text-left">
                                <p className={`font-bold text-base ${isConnected ? 'text-white' : 'text-neutral-800'}`}>{channel.name}</p>
                                {currentChannelUsers.length > 0 && (
                                  <p className={`text-xs ${isConnected ? 'text-green-100' : 'text-neutral-500'}`}>
                                    {currentChannelUsers.length} ki┼şi
                                  </p>
                                )}
                              </div>
                            </div>
                            {isConnected && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">Ba─şl─▒</span>
                                <Phone className="w-5 h-5 text-red-400" />
                              </div>
                            )}
                          </button>
                          
                          {/* Users in channel */}
                          {currentChannelUsers.length > 0 && (
                            <div className="px-4 pb-4 pt-2 space-y-2 bg-white">
                              {currentChannelUsers.map((vu) => {
                                const isMe = vu.id === user?.id;
                                const currentIsSpeaking = isMe 
                                  ? (myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive)) 
                                  : vu.isSpeaking;
                
                return (
                  <div 
                                    key={vu.id} 
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                                      currentIsSpeaking 
                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400' 
                                        : 'bg-neutral-50'
                    }`}
                  >
                    <div className="relative">
                                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg ${
                                        currentIsSpeaking ? 'ring-4 ring-green-400 ring-offset-2 scale-110' : ''
                                      }`}>
                                        {vu.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                                      {currentIsSpeaking && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-ping"></div>
                      )}
                    </div>
                                    
                                    <div className="flex-1">
                                      <div className={`font-bold text-sm ${currentIsSpeaking ? 'text-green-700' : 'text-neutral-800'}`}>
                                        {vu.username} {isMe && <span className="text-xs text-blue-600">(Sen)</span>}
                      </div>
                                      {currentIsSpeaking && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <div className="flex gap-0.5">
                                            <div className="w-1 h-2 bg-green-500 rounded-full animate-bounce"></div>
                                            <div className="w-1 h-3 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                                            <div className="w-1 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                                          </div>
                                          <span className="text-xs text-green-600 font-medium">Konu┼şuyor</span>
                            </div>
                          )}
                        </div>
                                    
                                    {isMe && isConnected && (
                                      <div className="flex items-center gap-2">
                                        {/* Mikrofon */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMuted(!isMuted);
                                          }}
                                          className={`p-2 rounded-lg ${isMuted ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}
                                          title={isMuted ? 'Mikrofonu A├ğ' : 'Mikrofonu Kapat'}
                                        >
                                          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </button>
                                        
                                        {/* Ekran Payla┼ş─▒m─▒ */}
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isScreenSharing) {
                                              handleStopScreenShare();
                                            } else {
                                              try {
                                                const stream = await navigator.mediaDevices.getDisplayMedia({
                                                  video: { cursor: 'always' } as any,
                                                  audio: false,
                                                });
                                                stream.getVideoTracks()[0].onended = () => handleStopScreenShare();
                                                await handleStartScreenShare(stream);
                                              } catch (err) {
                                                showToast('error', 'Ekran payla┼ş─▒m─▒ reddedildi');
                                              }
                                            }
                                          }}
                                          className={`p-2 rounded-lg ${isScreenSharing ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}
                                          title={isScreenSharing ? 'Ekran Payla┼ş─▒m─▒n─▒ Durdur' : 'Ekran─▒ Payla┼ş'}
                                        >
                                          {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                        </button>
                                        
                                        {/* Video */}
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isVideoOn) {
                                              handleStopVideo();
                                            } else {
                                              try {
                                                const stream = await navigator.mediaDevices.getUserMedia({
                                                  video: { width: 1280, height: 720, facingMode: 'user' },
                                                  audio: false,
                                                });
                                                await handleStartVideo(stream);
                                              } catch (err) {
                                                showToast('error', 'Kamera eri┼şimi reddedildi');
                                              }
                                            }
                                          }}
                                          className={`p-2 rounded-lg ${isVideoOn ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}
                                          title={isVideoOn ? 'Kameray─▒ Kapat' : 'Kameray─▒ A├ğ'}
                                        >
                                          {isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    )}
                  </div>
                );
              })}
            </div>
                          )}
          </div>
                      );
                    })
                  )}
        </div>
              </div>
            </div>
          )}
          </>
        )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Kullan─▒c─▒ Sa─ş T─▒k Men├╝s├╝ */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-[70] bg-white rounded-xl shadow-2xl border-2 border-neutral-200 py-2 min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-4 py-2 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <p className="font-bold text-neutral-900 text-sm">{contextMenu.username}</p>
            </div>
            
            <div className="px-3 py-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-blue-600" />
                  Ses Seviyesi
                </span>
                <span className="text-blue-600">{Math.round((userVolumeSettings[contextMenu.userId] || 1) * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={(userVolumeSettings[contextMenu.userId] || 1) * 100}
                onChange={(e) => {
                  const volume = parseInt(e.target.value) / 100;
                  setUserVolumeSettings(prev => ({ ...prev, [contextMenu.userId]: volume }));
                  const audioEl = document.getElementById(`audio-${contextMenu.userId}`) as HTMLAudioElement;
                  if (audioEl) {
                    audioEl.volume = Math.min(volume, 1.0);
                  }
                }}
                className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-blue-600 [&::-webkit-slider-thumb]:shadow-lg"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Sessiz</span>
                <span>2x</span>
              </div>
            </div>
            
            <div className="px-2 py-1 border-t border-neutral-200">
              <button
                onClick={() => {
                  setUserVolumeSettings(prev => ({ ...prev, [contextMenu.userId]: 1.0 }));
                  const audioEl = document.getElementById(`audio-${contextMenu.userId}`) as HTMLAudioElement;
                  if (audioEl) audioEl.volume = 1.0;
                  showToast('success', '­şöè Ses seviyesi s─▒f─▒rland─▒');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
              >
                ­şöä S─▒f─▒rla (100%)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

