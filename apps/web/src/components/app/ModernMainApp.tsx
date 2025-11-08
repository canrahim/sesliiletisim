import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Settings, Users, LogOut, Link as LinkIcon, Hash, Volume2, Send, Plus, Menu, X, Phone, Mic, MicOff, Monitor, MonitorOff, Video, VideoOff, Headphones, MoreVertical, Shield, UserCheck, VolumeX, Crown, Download, FileText, Eye } from 'lucide-react';
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
import { ScreenShareSettings } from '../voice/ScreenShareSettings';
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

type ParsedMessage =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'file';
      filename: string;
      url: string;
      mimetype?: string;
      size?: number;
      text?: string | null;
    };

const resolveFileUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  // Eski /api/uploads/ formatını yeni /api/upload/uploads/ formatına çevir
  const normalizedUrl = url.replace('/api/uploads/', '/api/upload/uploads/');
  return `${API_BASE}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
};

const parseMessageContent = (raw: string): ParsedMessage => {
  if (!raw) {
    return { type: 'text', text: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'file' && parsed.filename && parsed.url) {
      return {
        type: 'file',
        filename: parsed.filename,
        url: parsed.url,
        mimetype: parsed.mimetype,
        size: parsed.size,
        text: typeof parsed.text === 'string' ? parsed.text : null,
      };
    }
  } catch (error) {
    // Plain text message, parsing başarısızsa olduğu gibi döndür.
  }

  return { type: 'text', text: raw };
};

const formatFileSize = (bytes?: number) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const handleDownloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('❌ Download error:', error);
    alert('Dosya indirilemedi');
  }
};

export const ModernMainApp: React.FC = () => {
  console.log('🚀🚀🚀 ModernMainApp.tsx LOADED - Build version: CRazdFZ3-FINAL 🚀🚀🚀');
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
  const [previewFile, setPreviewFile] = useState<{ filename: string; url: string; mimetype?: string; size?: number } | null>(null);
  
  // Remote media
const [remoteUsers, setRemoteUsers] = useState<Array<{ userId: string; username: string; stream?: MediaStream; isScreenSharing?: boolean; isVideoOn?: boolean; isMuted?: boolean; isSpeaking?: boolean; hasScreenAudio?: boolean }>>([]);
  const [mediaLayout, setMediaLayout] = useState<'grid' | 'speaker'>('grid');
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [showTheaterMode, setShowTheaterMode] = useState(false);
  const [theaterPresenter, setTheaterPresenter] = useState<{ userId: string; username: string; stream?: MediaStream } | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Voice & Members
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
const [voiceUsers, setVoiceUsers] = useState<Array<{
  userId: string;
  username: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}>>([]);
  const [channelVoiceUsers, setChannelVoiceUsers] = useState<Record<string, Array<{ id: string; username: string; isMuted?: boolean }>>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [isPushToTalkMode, setIsPushToTalkMode] = useState(() => localStorage.getItem('pushToTalk') === 'true');
  const [contextMenu, setContextMenu] = useState<{ userId: string; username: string; x: number; y: number } | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<{ messageId: string; isOwner: boolean; x: number; y: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [serverContextMenu, setServerContextMenu] = useState<{ serverId: string; serverName: string; x: number; y: number } | null>(null);
  const [channelContextMenu, setChannelContextMenu] = useState<{ channelId: string; channelName: string; x: number; y: number } | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersList, setMembersList] = useState<Array<{ userId: string; username: string; avatar?: string; role: string; joinedAt: string }>>([]);
  const [showAvatarUpload, setShowAvatarUpload] = useState<'server' | 'profile' | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<Record<string, { game?: string; activity?: string }>>({});
  
  // Desktop oyun algılama event'leri
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const handleGameDetected = (_: any, data: { name: string; displayName: string }) => {
        setCurrentGame(data.displayName || data.name);
        console.log('[Game] Algılandı:', data.displayName);
        
        // Presence'a bildir
        if (presenceSocketRef.current) {
          presenceSocketRef.current.emit('activity-update', { 
            activity: `${data.displayName} oynuyor`
          });
        }
      };
      
      const handleGameClosed = () => {
        setCurrentGame(null);
        console.log('[Game] Kapandı');
        
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
      // PTT tuşu kombinasyonunu kontrol et
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
  const [screenQuality, setScreenQuality] = useState<'720p30' | '720p60' | '1080p30' | '1080p60' | '1440p30' | '1440p60' | '4k30'>('1080p30');
  const [shareSystemAudio, setShareSystemAudio] = useState(true); // Varsayılan olarak sistem sesi AÇIK
  const [showScreenShareSettings, setShowScreenShareSettings] = useState(false);
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
  const hasRequestedInitialPresenceRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChannelIdRef = useRef<string | null>(null);
  const connectedVoiceChannelIdRef = useRef<string | null>(null); // ← YENİ REF!
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
  const previousEffectiveMuteRef = useRef<boolean | null>(null);

  useEffect(() => { 
    loadServers(); 
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 ModernMainApp unmounting - cleaning up resources');
      
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
  useEffect(() => {
    const effectiveMuted = isMuted || (isPushToTalkMode && !pushToTalkActive);
    const shouldEnableTrack = !effectiveMuted;

    // ✅ SADECE MİKROFONU MUTE ET, SİSTEM SESİNE DOKUNMA!
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        // Sadece mikrofon track'ini kontrol et (label'ında 'microphone' veya boş olan)
        const isMicrophoneTrack = !track.label || track.label.toLowerCase().includes('micro') || track.label.toLowerCase().includes('default');
        
        if (isMicrophoneTrack && track.enabled !== shouldEnableTrack) {
          track.enabled = shouldEnableTrack;
          console.log('🎚️ Mikrofon track durumu güncellendi:', shouldEnableTrack ? 'açık' : 'kapalı');
        }
      });
    }
    
    // ✅ SİSTEM SESİ TRACK'İ HER ZAMAN AÇIK OLMALI!
    if (screenStreamRef.current) {
      const systemAudioTrack = screenStreamRef.current.getAudioTracks()[0];
      if (systemAudioTrack && !systemAudioTrack.enabled) {
        systemAudioTrack.enabled = true;
        console.log('🔊 Sistem sesi track yeniden aktifleştirildi (her zaman açık olmalı!)');
      }
    }
    

    const previousState = previousEffectiveMuteRef.current;
    if (previousState === effectiveMuted) {
      return;
    }

    previousEffectiveMuteRef.current = effectiveMuted;

    if (voiceSocketRef.current && voiceSocketRef.current.connected && connectedVoiceChannelId) {
      voiceSocketRef.current.emit('toggle-mute', { muted: effectiveMuted });
      console.log('🎛️ Sent toggle-mute event:', effectiveMuted);
    }

    if (user) {
      setVoiceUsers(prev =>
        prev.map(u => (u.userId === user.id ? { ...u, isMuted: effectiveMuted } : u)),
      );
    }
  }, [isMuted, isPushToTalkMode, pushToTalkActive, connectedVoiceChannelId, user]);
  useEffect(() => { if (selectedServer) { loadChannels(selectedServer.id); loadServerMembers(selectedServer.id); } }, [selectedServer]);
  
  // AFK Timeout - KALDIRILDI (Kullanıcı istemiyor)
  
  // Load sound effects
  useEffect(() => {
    joinSoundRef.current = new Audio('/giris_join_long.wav');
    leaveSoundRef.current = new Audio('/cikis_leave_long.wav');
    
    // Online/Offline detection
    const handleOnline = () => {
      console.log('🌐 Internet connection restored');
      isOnlineRef.current = true;
      
      // 💾 Son kanala otomatik katılmayı dene
      try {
        const lastChannel = localStorage.getItem('lastVoiceChannel');
        if (lastChannel) {
          const { channelId, timestamp } = JSON.parse(lastChannel);
          const timePassed = Date.now() - timestamp;
          
          // 5 dakikadan az zaman geçtiyse otomatik katıl
          if (timePassed < 5 * 60 * 1000) {
            showToast('info', 'Sesli kanala yeniden bağlanılıyor...');
            
            // 2 saniye sonra reload (socket'lerin bağlanması için)
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            return;
          }
        }
      } catch (e) {
        console.error('LocalStorage okuma hatası:', e);
      }
      
      // Normal reload
      showToast('success', 'İnternet bağlantısı geri geldi! Sayfa yenileniyor...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    const handleOffline = () => {
      console.log('⚠️ Internet connection lost');
      isOnlineRef.current = false;
      showToast('error', 'İnternet bağlantısı kesildi! Sayfayı yenileyin.');
      
      // Sesli kanaldan otomatik çık
      if (connectedVoiceChannelIdRef.current) {
        console.log('🚪 Leaving voice channel due to connection loss');
        stopAudioMonitoring();
        setConnectedVoiceChannelId(null);
        connectedVoiceChannelIdRef.current = null;
        setVoiceUsers([]);
        
        // 🔊 ÇIKIŞ SESİ ÇAL!
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
      console.log('⚠️ Invalid channel, skipping');
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
    socket.on('connect', () => { console.log('✅ Connected'); if (currentChannelIdRef.current) socket.emit('join-channel', { channelId: currentChannelIdRef.current }); });
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
      console.log('✅ Connected to presence gateway (ModernMainApp)');
      // Presence socket bağlandıktan sonra arkadaşları yeniden yükle
      loadFriends();
    });

    presenceSocket.on('presence-update', ({ userId, status, isOnline: onlineStatus, activity }: any) => {
      // Handle both old and new format
      const isOnline = onlineStatus !== undefined 
        ? onlineStatus 
        : (typeof status === 'string' ? status === 'online' : status?.isOnline);
      
      console.log(`📥 Presence update: userId=${userId}, isOnline=${isOnline}`);
      console.log(`   Friends listesinde ${friends.length} kişi var:`, friends.map(f => f.id));
      
      // Üye listesini güncelle
      setServerMembers(prev => {
        const updated = prev.map(m => m.userId === userId ? { ...m, isOnline } : m);
        return updated;
      });
      
      // Arkadaş listesini güncelle (aynı şekilde!)
      setFriends(prev => {
        const updated = prev.map(f => f.id === userId ? { ...f, isOnline } : f);
        console.log(`🔄 Friends güncellendi: ${updated.filter(f => f.id === userId).map(f => f.username + '=' + f.isOnline)}`);
        return updated;
      });
      
      // Aktivite güncelle
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
      reconnection: true,           // ✅ Otomatik yeniden bağlan
      reconnectionAttempts: 10,     // ✅ 10 deneme
      reconnectionDelay: 1000,      // ✅ 1 saniye bekle
      reconnectionDelayMax: 5000,   // ✅ Maks 5 saniye
      timeout: 20000                // ✅ 20 saniye timeout
    });
    voiceSocketRef.current = voiceSocket;
    
    voiceSocket.on('connect', async () => {
      console.log('✅ Voice connected');
      
      // 💾 LocalStorage'dan son kanalı oku
      try {
        const lastChannelData = localStorage.getItem('lastVoiceChannel');
        if (lastChannelData && user) {
          const { channelId, serverId, timestamp } = JSON.parse(lastChannelData);
          const timePassed = Date.now() - timestamp;
          
          // 5 dakikadan az geçtiyse otomatik katıl
          if (timePassed < 5 * 60 * 1000) {
            console.log('🔄 Auto-reconnecting to last voice channel:', channelId);
            
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
              
              // Mikrofonu başlat
              const success = await startAudioMonitoring();
              if (!success) {
                console.error('❌ Mikrofon başlatılamadı');
                setConnectedVoiceChannelId(null);
                connectedVoiceChannelIdRef.current = null;
                setVoiceUsers([]);
                localStorage.removeItem('lastVoiceChannel');
                return;
              }
              
              // Sesli kanala katıl
              voiceSocket.emit('join-voice', {
                roomId: serverId,
                channelId: channelId,
                userId: user.id,
                username: user.username
              });
              
              console.log('✅ Auto-reconnected to voice channel');
              showToast('success', 'Sesli kanala yeniden katıldınız!');
              
              // Giriş sesi çal
              setTimeout(() => {
                if (joinSoundRef.current) {
                  joinSoundRef.current.currentTime = 0;
                  joinSoundRef.current.volume = 0.5;
                  joinSoundRef.current.play().catch(e => console.log('Sound failed:', e));
                }
              }, 500);
            } else {
              console.log('⚠️ Last channel not found, clearing localStorage');
              localStorage.removeItem('lastVoiceChannel');
            }
          } else {
            console.log('⏰ Last channel expired (>5 min), clearing');
            localStorage.removeItem('lastVoiceChannel');
          }
        }
      } catch (e) {
        console.error('❌ LocalStorage read error:', e);
      }
    });
    
    voiceSocket.on('disconnect', (reason: string) => {
      console.warn('⚠️ Voice socket disconnected:', reason);
      
      // Bağlantı koparsa peer connections'ı temizle
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      
      // ⚠️ ANINDA KANALDAN ÇIK!
      if (connectedVoiceChannelIdRef.current) {
        console.log('🚪 Voice disconnected - Leaving channel IMMEDIATELY');
        
        // Mikrofonu kapat
        stopAudioMonitoring();
        
        // UI'ı güncelle
        setConnectedVoiceChannelId(null);
        connectedVoiceChannelIdRef.current = null;
        setVoiceUsers([]);
        
        // Çıkış sesi çal
        if (leaveSoundRef.current) {
          leaveSoundRef.current.currentTime = 0;
          leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
        }
        
        showToast('error', 'Bağlantı kesildi! Sesli kanaldan çıktınız.');
      }
    });
    
    voiceSocket.on('connect_error', (error: any) => {
      console.error('❌ Voice connection error:', error);
    });
    
    voiceSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Attempting to reconnect to voice... (${attemptNumber})`);
      showToast('info', `Sesli kanala yeniden bağlanıyor... (${attemptNumber}/10)`);
    });
    
    voiceSocket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Voice reconnected after ${attemptNumber} attempts`);
      showToast('success', 'Sesli kanala yeniden bağlandı!');
    });
    
    voiceSocket.on('reconnect_failed', () => {
      console.error('❌ Voice reconnection failed');
      showToast('error', 'Sesli kanala bağlanılamadı. Sayfayı yenileyin.');
      setConnectedVoiceChannelId(null);
      connectedVoiceChannelIdRef.current = null;
    });
    
    voiceSocket.on('voice-state-update', ({ channelId, users }: any) => {
      console.log('🎤 Voice state update - Channel:', channelId, 'Users:', users, 'CurrentChannel:', connectedVoiceChannelIdRef.current);
      if (channelId === connectedVoiceChannelIdRef.current && users) {
        console.log('✅ Updating voice users from state update');
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('voice-users', ({ channelId, users }: any) => {
      console.log('👥 Voice users list - Channel:', channelId, 'Users:', users);
      if (users && users.length > 0) {
        console.log('✅ Setting voice users from list');
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('channel-voice-users', ({ channelId, users }: any) => {
      console.log('📋 Channel voice users - Channel:', channelId, 'Users:', users);
      if (channelId === connectedVoiceChannelIdRef.current && users) {
        setVoiceUsers(users);
      }
    });
    
    voiceSocket.on('user-joined-voice', ({ channelId, userId, username, user: userData }: any) => {
      console.log('👋 User joined voice - Channel:', channelId, 'User:', username || userData?.username, 'CurrentChannel:', connectedVoiceChannelIdRef.current);
      
      // Sadece aktif kanalımızsa ekle
      if (channelId === connectedVoiceChannelIdRef.current) {
        // 🔊 BİRİ KATILDI SESİ ÇAL!
        if (joinSoundRef.current) {
          joinSoundRef.current.currentTime = 0;
          joinSoundRef.current.volume = 0.3; // Daha düşük (kendi sesimiz değil)
          joinSoundRef.current.play().catch(e => console.log('Join sound failed:', e));
        }
        
        setVoiceUsers(prev => {
          const actualUsername = username || userData?.username || 'Unknown';
          const actualUserId = userId || userData?.id;
          const exists = prev.some(u => u.userId === actualUserId);
          
          if (exists) {
            console.log('⚠️ User already in list:', actualUsername);
            return prev;
          }
          
          const newList = [...prev, { 
            userId: actualUserId, 
            username: actualUsername, 
            isMuted: false, 
            isSpeaking: false 
          }];
          console.log('✅ Added user to voice list. Total users:', newList.length);
          showToast('info', `${actualUsername} sesli kanala katıldı`);
          return newList;
        });
      }
    });
    
    voiceSocket.on('user-left-voice', ({ channelId, userId, username }: any) => {
      console.log('👋 User left voice:', userId, username);
      
      // 🔊 BİRİ ÇIKTI SESİ ÇAL!
      if (leaveSoundRef.current) {
        leaveSoundRef.current.currentTime = 0;
        leaveSoundRef.current.volume = 0.3; // Daha düşük
        leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
      }
      
      setVoiceUsers(prev => {
        const leftUser = prev.find(u => u.userId === userId);
        if (leftUser) {
          showToast('info', `${leftUser.username || username || 'Kullanıcı'} sesli kanaldan ayrıldı`);
        }
        return prev.filter(u => u.userId !== userId);
      });
    });
    
    voiceSocket.on('user-speaking', ({ userId, isSpeaking }: any) => {
      setVoiceUsers(prev => prev.map(u => u.userId === userId ? { ...u, isSpeaking } : u));
    });
    
    voiceSocket.on('user-muted', ({ userId, muted }: any) => {
      setVoiceUsers(prev => prev.map(u => u.userId === userId ? { ...u, isMuted: muted } : u));
    });
    
    // ✅ BACKEND'DEN GELEN ANA EVENT (TÜM KULLANICILAR)
    voiceSocket.on('voice-channel-update', ({ channelId, users }: any) => {
      console.log('🔊 Voice channel update - Channel:', channelId, 'Users:', users);
      
      if (users && Array.isArray(users)) {
        // TÜM KANALLAR için güncelle (önizleme için)
        setChannelVoiceUsers(prev => ({
          ...prev,
          [channelId]: users
        }));
        
        // Kendi kanalımız için de voiceUsers'ı güncelle
        if (channelId === connectedVoiceChannelIdRef.current) {
          const formattedUsers = users.map((u: any) => ({
            userId: u.id,
            username: u.username,
            isMuted: u.isMuted ?? false,
            isSpeaking: false,
            hasScreenAudio: u.hasScreenAudio ?? false,
          }));
          
          // 🔊 KULLANICI SAYISI DEĞİŞTİ Mİ KONTROL ET!
          setVoiceUsers(prev => {
            // Yeni katılan var mı?
            formattedUsers.forEach(newUser => {
              const exists = prev.find(u => u.userId === newUser.userId);
              if (!exists && newUser.userId !== user?.id) {
                // 🔊 BİRİ KATILDI!
                console.log('🔊 Playing join sound for:', newUser.username);
                if (joinSoundRef.current) {
                  joinSoundRef.current.currentTime = 0;
                  joinSoundRef.current.volume = 0.3;
                  joinSoundRef.current.play().catch(e => console.log('Join sound failed:', e));
                }
                showToast('info', `${newUser.username} sesli kanala katıldı`);
              }
            });
            
            // Çıkan var mı?
            prev.forEach(oldUser => {
              const stillThere = formattedUsers.find(u => u.userId === oldUser.userId);
              if (!stillThere && oldUser.userId !== user?.id) {
                // 🔊 BİRİ ÇIKTI!
                console.log('🔊 Playing leave sound for:', oldUser.username);
                if (leaveSoundRef.current) {
                  leaveSoundRef.current.currentTime = 0;
                  leaveSoundRef.current.volume = 0.3;
                  leaveSoundRef.current.play().catch(e => console.log('Leave sound failed:', e));
                }
                showToast('info', `${oldUser.username} sesli kanaldan ayrıldı`);
              }
            });

            const previousMap = new Map(prev.map(u => [u.userId, u]));
            const merged = formattedUsers.map(u => {
              const existing = previousMap.get(u.userId);
              return {
                ...u,
                isSpeaking: existing?.isSpeaking ?? false,
                hasScreenAudio: u.hasScreenAudio || existing?.hasScreenAudio || false,
              };
            });
            
            console.log('✅ Setting voice users for current channel:', merged);
            return merged;
          });
        }
      }
    });

    // WebRTC Events
    voiceSocket.on('peer-joined', async ({ peerId, username, shouldOffer, isScreenSharing, isVideoOn, hasScreenAudio }: any) => {
      console.log('🔗 Peer joined:', peerId, username, 'Should offer:', shouldOffer, 'Screen:', isScreenSharing, 'Video:', isVideoOn, 'Audio:', hasScreenAudio);
      
      // ✅ DUPLICATE KONTROLÜ - Aynı peer zaten varsa skip et
      if (peerConnectionsRef.current.has(peerId)) {
        console.warn('⚠️ Peer already exists, skipping:', peerId);
        return;
      }
      
      // Yeni katılan varsa ve ekran/video paylaşıyorsa state'e ekle
      if (isScreenSharing || isVideoOn || hasScreenAudio) {
        setRemoteUsers(prev => {
          const existing = prev.find(u => u.userId === peerId);
          if (existing) {
            return prev.map(u => u.userId === peerId ? { ...u, username, isScreenSharing, isVideoOn, hasScreenAudio } : u);
          }
          return [...prev, { userId: peerId, username, isScreenSharing, isVideoOn, hasScreenAudio }];
        });
        
        if (isScreenSharing) {
          showToast('info', `🖥️ ${username} ekran paylaşıyor`);
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
        console.log(`📡 Connection state for ${peerId}:`, pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log(`✅ Successfully connected to ${username}`);
        } else if (pc.connectionState === 'failed') {
          console.error(`❌ Connection failed to ${username}, attempting restart...`);
          // Bağlantı başarısız, peer'ı kapat ve tekrar bağlan
          setTimeout(() => {
            pc.close();
            peerConnectionsRef.current.delete(peerId);
            console.log(`🔄 Restarting connection to ${username}`);
          }, 1000);
        } else if (pc.connectionState === 'disconnected') {
          console.warn(`⚠️ Disconnected from ${username}, waiting for reconnection...`);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE state for ${peerId}:`, pc.iceConnectionState);
        
        // ICE bağlantısı başarısız olursa restart
        if (pc.iceConnectionState === 'failed') {
          console.error(`❌ ICE failed for ${username}, restarting ICE...`);
          pc.restartIce();
        } else if (pc.iceConnectionState === 'disconnected') {
          console.warn(`⚠️ ICE disconnected for ${username}, waiting...`);
          // 5 saniye sonra hala disconnected ise restart
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log(`🔄 ICE still disconnected, restarting for ${username}`);
              pc.restartIce();
            }
          }, 5000);
        }
      };
      
      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate && voiceSocketRef.current) {
          console.log('🧊 Sending ICE candidate to:', peerId);
          voiceSocketRef.current.emit('signal', {
            type: 'ice-candidate',
            to: peerId,
            data: event.candidate
          });
        }
      };
      
      // Remote stream handler
      pc.ontrack = (event) => {
        console.log('🎧 Received remote track from:', username, 'Kind:', event.track.kind, 'ID:', event.track.id, 'Label:', event.track.label);
        const [remoteStream] = event.streams;
        
        if (remoteStream) {
          console.log('📦 Remote stream received, all tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.label}`));
          remoteStreamsRef.current.set(peerId, remoteStream);
          
          // Update remote users state with stream (for screen share & video)
          console.log('🔄 Updating remote users state for:', peerId, 'with stream');
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.userId === peerId);
            if (existing) {
              console.log('✅ Updating existing user:', peerId, 'with stream');
              return prev.map(u => u.userId === peerId ? { ...u, stream: remoteStream } : u);
            }
            console.log('➕ Adding new user:', peerId, 'with stream');
            return [...prev, { userId: peerId, username, stream: remoteStream }];
          });
          
          // ✅ AUDIO TRACK: Sadece mikrofon için audio element yarat
          // Sistem sesi track'i video element üzerinden çalacak (InlineScreenShare)
          if (event.track.kind === 'audio') {
            const trackLabel = (event.track.label || '').toLowerCase();
            const isSystemAudio = trackLabel.includes('tab') || 
                                  trackLabel.includes('screen') || 
                                  trackLabel.includes('system') ||
                                  trackLabel.includes('share') ||
                                  trackLabel.includes('loopback');
            
            if (isSystemAudio) {
              console.log(`🔈 SİSTEM SESİ TRACK ALINDI from ${username}, label: ${event.track.label}`);
              console.log(`🔈 Bu track için AUDIO ELEMENT YARATILMAYACAK - Video element üzerinden çalacak!`);
              // Sistem sesi için ayrı audio element yaratma - video element'te zaten var
              return;
            }
            
            const trackId = event.track.id;
            const audioElementId = `audio-${peerId}-${trackId}`;
            
            // Mevcut audio element'i kontrol et
            const existingAudio = document.getElementById(audioElementId);
            if (existingAudio) {
              console.log(`♻️ Audio element already exists for track ${trackId}, skipping`);
              return;
            }
            
            // Yeni MediaStream sadece bu track için
            const singleTrackStream = new MediaStream([event.track]);
            
            const audio = document.createElement('audio');
            audio.srcObject = singleTrackStream;
            audio.autoplay = true;
            audio.id = audioElementId;
            audio.volume = userVolumeSettings[peerId] || 1.0;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            
            console.log(`🔊 Creating audio element for ${username}, track: ${event.track.label || event.track.kind}, volume: ${audio.volume}`);
            
            audio.play().then(() => {
              console.log(`✅ Audio playing for ${username}, track: ${event.track.label || trackId}`);
            }).catch(err => {
              console.error(`❌ Audio play failed for ${username}:`, err);
              showToast('warning', `${username} için ses açmak için tıklayın`);
            });
            
            // Track sonlandığında audio element'i temizle
            event.track.onended = () => {
              console.log(`🛑 Audio track ended for ${username}, removing element`);
              const el = document.getElementById(audioElementId);
              if (el) el.remove();
            };
          }
          
          // For video tracks (screen share or camera)
          if (event.track.kind === 'video') {
            console.log('📹 VIDEO TRACK RECEIVED from:', username);
            console.log('📹 Video track enabled:', event.track.enabled, 'readyState:', event.track.readyState);
            
            // Update theater presenter if this is the current presenter
            if (theaterPresenter?.userId === peerId || showTheaterMode) {
              console.log('🔄 Updating theater presenter stream for:', username);
              setTheaterPresenter(prev => prev ? { ...prev, stream: remoteStream } : null);
            }
          }
        }
      };
      
      // Add local stream (mikrofon)
      if (localStreamRef.current) {
        console.log('📤 Adding local audio tracks to peer connection');
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
          console.log('➕ Added track:', track.kind, 'enabled:', track.enabled, 'label:', track.label);
        });
      } else {
        console.error('❌ No local audio stream available!');
      }
      
      // ✅ EKRAN PAYLAŞIMI: Eğer ekran paylaşıyorsam, yeni peer'e de ekran track'lerini ekle
      if (screenStreamRef.current) {
        const screenTracks = screenStreamRef.current.getTracks();
        console.log(`📤 Adding screen share tracks to new peer ${peerId}:`, screenTracks.map(t => `${t.kind}:${t.label}`));
        
        for (const track of screenTracks) {
          const sender = pc.addTrack(track, screenStreamRef.current);
          console.log(`➕ Added screen track to ${peerId}:`, {
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            senderId: sender.track?.id
          });
        }
        
        console.log(`📊 Total senders for ${peerId} after screen tracks:`, pc.getSenders().length);
      }
      
      // ✅ VİDEO: Eğer video açıksam, yeni peer'e de video track'ini ekle
      if (videoStreamRef.current) {
        console.log('📤 Adding video tracks to new peer:', peerId);
        videoStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, videoStreamRef.current!);
          console.log('➕ Added video track:', track.kind);
        });
      }
      
      peerConnectionsRef.current.set(peerId, pc);
      
      // Create offer if needed
      if (shouldOffer) {
        try {
          console.log(`📤 Creating offer for: ${username}, total senders:`, pc.getSenders().length);
          console.log(`📤 Sender details:`, pc.getSenders().map(s => `${s.track?.kind}:${s.track?.label}`));
          
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true // ✅ Video track'leri kabul et (screen share için)
          });
          await pc.setLocalDescription(offer);
          
          console.log(`📞 Offer created for ${username}:`, {
            video: offer.sdp?.includes('m=video'),
            audio: offer.sdp?.includes('m=audio'),
            audioCount: (offer.sdp?.match(/m=audio/g) || []).length,
            videoCount: (offer.sdp?.match(/m=video/g) || []).length
          });
          
          voiceSocketRef.current?.emit('signal', {
            type: 'offer',
            to: peerId,
            data: offer
          });
          console.log('✅ Offer sent to:', username);
        } catch (error) {
          console.error('❌ Offer creation failed:', error);
        }
      }
    });
    
    voiceSocket.on('peer-left', ({ peerId }: any) => {
      console.log('👋 Peer left:', peerId);
      
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
    voiceSocket.on('screen-share-started', ({ userId, username, hasAudio }: { userId: string; username: string; hasAudio?: boolean }) => {
      if (userId === user?.id) return; // Ignore self
      
      console.log('📺 Screen share started by:', username, 'hasAudio:', hasAudio, 'typeof:', typeof hasAudio);
      console.log('📺 Setting hasScreenAudio to:', !!hasAudio);
      
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (existing) {
          console.log('📺 Updating existing remote user:', userId, 'with hasScreenAudio:', !!hasAudio);
          return prev.map(u => u.userId === userId ? { ...u, isScreenSharing: true, hasScreenAudio: !!hasAudio } : u);
        }
        console.log('📺 Adding new remote user:', userId, 'with hasScreenAudio:', !!hasAudio);
        return [...prev, { userId, username, isScreenSharing: true, hasScreenAudio: !!hasAudio }];
      });
      
      setVoiceUsers(prev => {
        const updated = prev.map(u => 
          u.userId === userId ? { ...u, hasScreenAudio: !!hasAudio } : u
        );
        console.log('📺 Updated voiceUsers:', updated);
        return updated;
      });
      
      showToast('info', `🖥️ ${username} ekran paylaşıyor ${hasAudio ? '(Sistem Sesi 🔊)' : ''}`);
    });

    voiceSocket.on('screen-share-stopped', ({ userId }: { userId: string }) => {
      console.log('📺 Screen share stopped by:', userId);
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isScreenSharing: false, hasScreenAudio: false, stream: undefined } : u
      ));
      setVoiceUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, hasScreenAudio: false } : u
      ));
      
      // HERKES İÇİN KAPAT - Kim olursa olsun
      if (theaterPresenter?.userId === userId || showTheaterMode) {
        setShowTheaterMode(false);
        setTheaterPresenter(null);
        showToast('info', 'Ekran paylaşımı sona erdi');
      }
    });

    voiceSocket.on('video-started', ({ userId, username }: { userId: string; username: string }) => {
      if (userId === user?.id) return; // Ignore self
      
      console.log('📹 Video started by:', username);
      setRemoteUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (existing) {
          return prev.map(u => u.userId === userId ? { ...u, isVideoOn: true } : u);
        }
        return [...prev, { userId, username, isVideoOn: true }];
      });
    });

    voiceSocket.on('video-stopped', ({ userId }: { userId: string }) => {
      console.log('📹 Video stopped by:', userId);
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, isVideoOn: false } : u
      ));
    });
    
    voiceSocket.on('signal', async ({ from, type, data }: any) => {
      console.log('📨 Signal from:', from, 'Type:', type);
      
      let pc = peerConnectionsRef.current.get(from);
      
      if (!pc && type === 'offer') {
        console.log('🆕 Creating new peer connection for incoming offer from:', from);
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
          console.log(`📡 Connection state for ${from}:`, pc!.connectionState);
          if (pc!.connectionState === 'connected') {
            console.log(`✅ Successfully connected to peer ${from}`);
          } else if (pc!.connectionState === 'failed') {
            console.error(`❌ Connection failed to ${from}, attempting restart...`);
            setTimeout(() => {
              pc!.close();
              peerConnectionsRef.current.delete(from);
              console.log(`🔄 Restarting connection to ${from}`);
            }, 1000);
          }
        };
        
        pc.oniceconnectionstatechange = () => {
          console.log(`🧊 ICE state for ${from}:`, pc!.iceConnectionState);
          
          if (pc!.iceConnectionState === 'failed') {
            console.error(`❌ ICE failed for ${from}, restarting ICE...`);
            pc!.restartIce();
          } else if (pc!.iceConnectionState === 'disconnected') {
            console.warn(`⚠️ ICE disconnected for ${from}, waiting...`);
            setTimeout(() => {
              if (pc!.iceConnectionState === 'disconnected') {
                console.log(`🔄 ICE still disconnected, restarting for ${from}`);
                pc!.restartIce();
              }
            }, 5000);
          }
        };
        
    pc.onicecandidate = (event) => {
      if (event.candidate && voiceSocketRef.current) {
            console.log('🧊 Sending ICE candidate to:', from);
            voiceSocketRef.current.emit('signal', {
              type: 'ice-candidate',
              to: from,
              data: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
          console.log('🎧 Received remote stream from signal:', from, 'Track:', event.track.kind);
      const [remoteStream] = event.streams;
          
          if (remoteStream) {
            remoteStreamsRef.current.set(from, remoteStream);
            
            const existingAudio = document.getElementById(`audio-${from}`);
            if (existingAudio) existingAudio.remove();
            
            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
        audio.autoplay = true;
            audio.id = `audio-${from}`;
            audio.volume = userVolumeSettings[from] || 1.0; // ← SES SEVİYESİ AYARI!
        audio.style.display = 'none';
        document.body.appendChild(audio);
            
            audio.play().then(() => {
              console.log(`🔊 Audio playing for peer: ${from}, volume: ${audio.volume}`);
            }).catch(err => {
              console.error(`❌ Audio play failed for peer ${from}:`, err);
            });
          }
        };
        
        if (localStreamRef.current) {
          console.log('📤 Adding local tracks to new peer connection');
          localStreamRef.current.getTracks().forEach(track => {
            pc!.addTrack(track, localStreamRef.current!);
            console.log('➕ Added track:', track.kind);
          });
        }
        
        peerConnectionsRef.current.set(from, pc);
      }
      
      if (pc) {
        try {
          if (type === 'offer') {
            console.log('📥 Processing offer from:', from);
            console.log('📥 Offer SDP:', {
              video: data.sdp?.includes('m=video'),
              audio: data.sdp?.includes('m=audio'),
              audioCount: (data.sdp?.match(/m=audio/g) || []).length,
              videoCount: (data.sdp?.match(/m=video/g) || []).length
            });
            
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true // ✅ Video track'leri kabul et
            });
            await pc.setLocalDescription(answer);
            
            console.log('📥 Answer created:', {
              video: answer.sdp?.includes('m=video'),
              audio: answer.sdp?.includes('m=audio'),
              audioCount: (answer.sdp?.match(/m=audio/g) || []).length,
              videoCount: (answer.sdp?.match(/m=video/g) || []).length
            });
            
            voiceSocketRef.current?.emit('signal', {
              type: 'answer',
              to: from,
              data: answer
            });
            console.log('✅ Answer sent to:', from);
          } else if (type === 'answer') {
            console.log('📥 Processing answer from:', from);
            console.log('📥 Answer SDP:', {
              video: data.sdp?.includes('m=video'),
              audio: data.sdp?.includes('m=audio'),
              audioCount: (data.sdp?.match(/m=audio/g) || []).length,
              videoCount: (data.sdp?.match(/m=video/g) || []).length
            });
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            console.log('✅ Answer processed for:', from);
          } else if (type === 'ice-candidate') {
            console.log('🧊 Adding ICE candidate from:', from);
            await pc.addIceCandidate(new RTCIceCandidate(data));
          }
        } catch (error) {
          console.error(`❌ Signal processing error for ${from}:`, error);
        }
      } else {
        console.warn(`⚠️ No peer connection found for ${from}`);
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
      console.log('👥 Server members API response:', response.data);
      const members = response.data.map((m: any) => ({ 
        userId: m.userId || m.user?.id,
        id: m.userId || m.user?.id, // Hem userId hem id ekle (compatibility)
        username: m.user?.username || 'Unknown', 
        displayName: m.user?.displayName,
        avatar: m.user?.avatar, // Avatar field'ini ekle!
        isOnline: m.user?.isOnline || false 
      }));
      console.log('🖼️ Üye avatarları:', members.map((m: any) => `${m.username}: ${m.avatar ? '✅ ' + m.avatar : '❌'}`).join(', '));
      setServerMembers(members);
      // Presence is updated automatically via broadcasts!
    } catch (error) { 
      console.error('Error:', error); 
    } 
  };

  const requestPresenceForFriends = useCallback((friendList: Array<{ id: string }>) => {
    const presenceSocket = presenceSocketRef.current;

    if (!presenceSocket || !presenceSocket.connected) {
      console.warn('⚠️ Presence soketi hazır değil, get-presence erteleniyor. Arkadaş sayısı:', friendList?.length ?? 0);
      return;
    }

    if (!friendList || friendList.length === 0) {
      console.log('ℹ️ get-presence çağrısı iptal edildi, arkadaş listesi boş');
      return;
    }

    const userIds = friendList.map(friend => friend.id).filter(Boolean);
    if (userIds.length === 0) {
      console.warn('⚠️ get-presence için geçerli userId bulunamadı');
      return;
    }

    console.log('⏳ get-presence isteği gönderiliyor, userIds:', userIds);

    presenceSocket
      .timeout(5000)
      .emit('get-presence', { userIds }, (err: any, response: any) => {
        if (err) {
          console.warn('⚠️ get-presence zaman aşımı:', err);
          return;
        }

        const payload = response || {};
        if (payload.error || !payload.success) {
          console.warn('⚠️ get-presence başarısız:', payload);
          return;
        }

        const presenceMap: Record<string, string | boolean | null | undefined> = payload.presence || {};
        console.log('🛰️ get-presence cevabı:', presenceMap);

        setFriends(prev => {
          const updated = prev.map(friend => {
            const status = presenceMap[friend.id];
            if (status === undefined) {
              return friend;
            }

            const isOnline = status === null
              ? false
              : typeof status === 'string'
                ? status !== 'offline'
                : Boolean(status);

            if (friend.isOnline === isOnline) {
              return friend;
            }

            console.log(`🔁 get-presence ${friend.username} için durum değişti: ${friend.isOnline} → ${isOnline}`);
            return { ...friend, isOnline };
          });

          const changed = updated.filter((friend, index) => friend !== prev[index]);
          if (changed.length > 0) {
            console.log('✅ get-presence ile güncellenen arkadaşlar:', changed.map(f => `${f.username}=${f.isOnline}`).join(', '));
          } else {
            console.log('ℹ️ get-presence sonucu değişiklik yok');
          }

          return updated;
        });

        setServerMembers(prev =>
          prev.map(member => {
            const status = presenceMap[member.userId];
            if (status === undefined) {
              return member;
            }

            const isOnline = status === null
              ? false
              : typeof status === 'string'
                ? status !== 'offline'
                : Boolean(status);

            return member.isOnline === isOnline ? member : { ...member, isOnline };
          }),
        );
      });
  }, [setFriends, setServerMembers]);

  const loadFriends = async () => {
    try {
      const response = await friendsApi.getAll();
      // API'den gelen isOnline değerlerini kullan
      console.log('📦 Raw API response:');
      response.data.forEach((f: any) => {
        console.log(`  👤 id=${f.id}, username=${f.username}, isOnline=${f.isOnline}`);
      });
      const friendsData = response.data.map((f: any) => ({
        id: f.id,
        username: f.username,
        displayName: f.displayName,
        avatar: f.avatar, // Avatar field'ini ekle!
        isOnline: f.isOnline || false
      }));
      console.log('🔍 Presence socket durumu:', {
        hasSocket: !!presenceSocketRef.current,
        socketConnected: presenceSocketRef.current?.connected || false,
        hasRequestedInitialPresence: hasRequestedInitialPresenceRef.current,
      });
      console.log('🚀 requestPresenceForFriends çağrılıyor (loadFriends dönüşünde)');
      console.log('🖼️ Arkadaş avatarları:', friendsData.map((f: any) => `${f.username}: ${f.avatar ? '✅' : '❌'}`).join(', '));
      setFriends(friendsData);
      console.log('✅ Arkadaşlar yüklendi:', friendsData.map((f: any) => `${f.username}=${f.isOnline}`).join(', '));
      if (!presenceSocketRef.current || !presenceSocketRef.current.connected) {
        console.log('⏳ Presence soketi henüz bağlı değil, get-presence beklemede');
      }
      requestPresenceForFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  useEffect(() => {
    if (hasRequestedInitialPresenceRef.current) return;
    if (friends.length === 0) return;
    if (!presenceSocketRef.current || !presenceSocketRef.current.connected) return;

    hasRequestedInitialPresenceRef.current = true;
    console.log('♻️ Arkadaşlar yüklendi, initial get-presence tetiklendi. Arkadaş sayısı:', friends.length);
    console.log('   Presence soketi bağlı mı?', presenceSocketRef.current.connected);
    requestPresenceForFriends(friends);
  }, [friends, requestPresenceForFriends]);
  
  // Screen Share Handlers
  // Kalite ayarlarını constraint'e çevir
  const getScreenConstraints = (quality: string, withAudio: boolean): DisplayMediaStreamOptions => {
    const qualitySettings: Record<string, { width: number; height: number; frameRate: number; bitrate: number }> = {
      '720p30': { width: 1280, height: 720, frameRate: 30, bitrate: 1500000 },
      '720p60': { width: 1280, height: 720, frameRate: 60, bitrate: 2500000 },
      '1080p30': { width: 1920, height: 1080, frameRate: 30, bitrate: 3000000 },
      '1080p60': { width: 1920, height: 1080, frameRate: 60, bitrate: 4500000 },
      '1440p30': { width: 2560, height: 1440, frameRate: 30, bitrate: 5000000 },
      '1440p60': { width: 2560, height: 1440, frameRate: 60, bitrate: 8000000 },
      '4k30': { width: 3840, height: 2160, frameRate: 30, bitrate: 12000000 },
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
  };

  const startScreenShareWithSettings = async (quality: string, systemAudio: boolean) => {
    try {
      console.log('🖥️ Ekran paylaşımı başlatılıyor:', { quality, systemAudio });
      
      const constraints = getScreenConstraints(quality, systemAudio);
      console.log('📋 Display media constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('✅ Screen share stream acquired');
      console.log('📺 Video tracks:', stream.getVideoTracks().map(t => ({ 
        label: t.label, 
        width: t.getSettings().width, 
        height: t.getSettings().height,
        frameRate: t.getSettings().frameRate 
      })));
      console.log('🔊 Audio tracks:', stream.getAudioTracks().map(t => ({ label: t.label })));
      
      await handleStartScreenShare(stream);
      
    } catch (error: any) {
      console.error('❌ Screen share başlatma hatası:', error);
      if (error.name === 'NotAllowedError') {
        showToast('error', 'Ekran paylaşımı izni reddedildi');
      } else if (error.name === 'NotFoundError') {
        showToast('error', 'Paylaşılacak ekran bulunamadı');
      } else {
        showToast('error', 'Ekran paylaşımı başlatılamadı: ' + error.message);
      }
    }
  };

  const handleStartScreenShare = async (stream: MediaStream) => {
    try {
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setScreenQuality(screenQuality);
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const hasSystemAudio = !!audioTrack;
      
      console.log('🖥️ Screen share aktif:', {
        video: !!videoTrack,
        systemAudio: hasSystemAudio,
        videoSettings: videoTrack?.getSettings(),
        audioSettings: audioTrack?.getSettings(),
      });
      console.log('🔊 hasSystemAudio:', hasSystemAudio, '(will be sent to server)');
      
      // ✅ SİSTEM SESİ TRACK'İ ASLA MUTE OLMAMALI!
      if (audioTrack) {
        audioTrack.enabled = true; // Her zaman açık
        console.log('🔊 Sistem sesi track enabled durumu:', audioTrack.enabled);
      }
      
      // Track sonlandığında otomatik durdur
      videoTrack?.addEventListener('ended', () => {
        console.log('🛑 Ekran paylaşımı kullanıcı tarafından durduruldu');
        handleStopScreenShare();
      });
      audioTrack?.addEventListener('ended', () => {
        console.log('🔇 Sistem sesi akışı sona erdi');
      });
      
      // RTC üzerinden broadcast
      if (connectedVoiceChannelId && voiceSocketRef.current) {
        console.log('📤 Ekran paylaşımı broadcast ediliyor:', peerConnectionsRef.current.size, 'peer');
        
        // Her peer'e track'leri ekle
        console.log('🔥🔥🔥 RENEGOTIATION BAŞLADI - CRazdFZ3-FINAL 🔥🔥🔥');
        for (const [peerId, pc] of peerConnectionsRef.current.entries()) {
          try {
            console.log(`📤 Renegotiating with peer ${peerId}, current senders:`, pc.getSenders().map(s => `${s.track?.kind}:${s.track?.label}`));
            
            // Video track'i ekle veya değiştir
            if (videoTrack) {
              const existingVideoSender = pc.getSenders().find(s => 
                s.track?.kind === 'video' &&
                (s.track?.label?.includes('screen') || s.track?.label?.includes('web-contents') || s.track?.label?.includes('share'))
              );
              
              if (existingVideoSender) {
                console.log(`🔄 Replacing video track:`, videoTrack.label);
                await existingVideoSender.replaceTrack(videoTrack);
              } else {
                console.log(`➕ Adding new video track:`, videoTrack.label);
                pc.addTrack(videoTrack, stream);
              }
            }
            
            // Sistem sesi track'i (varsa) ekle
            if (audioTrack) {
              const existingAudioSender = pc.getSenders().find(s => 
                s.track?.kind === 'audio' &&
                (s.track?.label?.toLowerCase().includes('tab') || s.track?.label?.toLowerCase().includes('share'))
              );
              
              if (existingAudioSender) {
                console.log(`🔄 Replacing system audio track:`, audioTrack.label);
                await existingAudioSender.replaceTrack(audioTrack);
              } else {
                console.log(`➕ Adding system audio track:`, audioTrack.label);
                pc.addTrack(audioTrack, stream);
              }
            }
            
            // Renegotiate
            console.log(`📞 Creating offer for peer ${peerId}`);
            console.log(`📞 Current senders BEFORE offer:`, pc.getSenders().map(s => ({
              kind: s.track?.kind,
              label: s.track?.label,
              enabled: s.track?.enabled,
              id: s.track?.id
            })));
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log(`📞 Offer created:`, {
              video: offer.sdp?.includes('m=video'),
              audio: offer.sdp?.includes('m=audio'),
              audioLines: (offer.sdp?.match(/m=audio/g) || []).length,
              videoLines: (offer.sdp?.match(/m=video/g) || []).length
            });
            console.log(`📞 Offer SDP (first 2000 chars):`, offer.sdp?.substring(0, 2000));
            
            voiceSocketRef.current?.emit('signal', {
              type: 'offer',
              to: peerId,
              data: offer,
            });
            
            console.log('✅ Screen share renegotiation sent to:', peerId);
          } catch (error) {
            console.error('❌ Peer renegotiation error:', peerId, error);
          }
        }
        
        // Sunucuya bildir
        voiceSocketRef.current.emit('screen-share-started', {
          channelId: connectedVoiceChannelId,
          userId: user?.id,
          username: user?.username,
          hasAudio: hasSystemAudio,
        });

        if (user) {
          setVoiceUsers(prev => prev.map(u => 
            u.userId === user.id ? { ...u, hasScreenAudio: hasSystemAudio } : u
          ));
        }
        
        // Theater mode'u aç
        setTheaterPresenter({
          userId: user!.id,
          username: user!.username,
          stream,
        });
        setShowTheaterMode(true);
        
        showToast('success', `✅ Ekran paylaşımı başlatıldı ${hasSystemAudio ? '(Sistem Sesi Dahil 🔊)' : ''}`);
      }
    } catch (error: any) {
      console.error('❌ Screen share error:', error);
      showToast('error', 'Ekran paylaşımı başlatılamadı');
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
    if (user) {
      setVoiceUsers(prev => prev.map(u => u.userId === user.id ? { ...u, hasScreenAudio: false } : u));
    }
    showToast('info', '🖥️ Ekran paylaşımı durduruldu');
    
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
      showToast('success', '📹 Kamera açıldı');
      
      // RTC üzerinden video'yu broadcast et
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
      showToast('error', 'Kamera açılamadı');
    }
  };

  const handleStopVideo = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    setIsVideoOn(false);
    showToast('info', '📹 Kamera kapatıldı');
    
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
    setSelectedFile(null); // Dosyayı temizle
    
    try {
      let fileData = null;
      
      // Dosya varsa önce upload et (GERÇEK UPLOAD!)
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
      
      // Mesaj içeriğini hazırla (dosya varsa JSON formatında gönder)
      let finalContent = messageContent.trim();
      
      if (fileData) {
        finalContent = JSON.stringify({
          type: 'file',
          filename: fileData.filename,
          url: fileData.url,
          mimetype: fileData.mimetype,
          size: fileData.size,
          text: messageContent.trim() || null,
        });
      }
      
      // Mesajı gönder (socket'ten gelecek, duplicate ekleme!)
      const response = await messagesApi.sendMessage(selectedChannel.id, finalContent);
      
      // Dosya yüklendiyse toast göster
      if (fileData && response.data) {
        showToast('success', `✅ Dosya yüklendi: ${fileData.filename}`);
      }
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Mesaj gönderilemedi');
      setNewMessage(messageContent);
      setSelectedFile(fileToUpload);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Mesaj düzenleme
  const startEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    // JSON formatındaysa text kısmını al
    try {
      const parsed = JSON.parse(currentContent);
      setEditingContent(parsed.text || '');
    } catch {
      setEditingContent(currentContent);
    }
    setMessageContextMenu(null);
  };

  const saveEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    try {
      await messagesApi.editMessage(messageId, editingContent.trim());
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, content: editingContent.trim(), isEdited: true }
          : m
      ));
      setEditingMessageId(null);
      setEditingContent('');
      showToast('success', 'Mesaj düzenlendi');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Mesaj düzenlenemedi');
    }
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // Mesaj silme
  const deleteMessage = async (messageId: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    
    try {
      await messagesApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setMessageContextMenu(null);
      showToast('success', 'Mesaj silindi');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Mesaj silinemedi');
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !selectedServer) return;
    try {
      await channelsApi.create(selectedServer.id, { name: newChannelName, type: newChannelType });
      setNewChannelName('');
      setShowNewChannelModal(false);
      loadChannels(selectedServer.id);
      showToast('success', 'Kanal oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kanal oluşturulamadı');
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Bu kanalı silmek istediğinize emin misiniz? Tüm mesajlar silinecek!')) return;
    
    try {
      await channelsApi.delete(channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
        setMessages([]);
      }
      showToast('success', 'Kanal silindi');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kanal silinemedi');
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
      showToast('success', 'Sunucu oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Sunucu oluşturulamadı');
    }
  };

  const deleteServer = async (serverId: string) => {
    if (!confirm('Bu sunucuyu silmek istediğinize emin misiniz? Tüm kanallar ve mesajlar silinecek!')) return;
    
    try {
      await serversApi.delete(serverId);
      setServers(prev => prev.filter(s => s.id !== serverId));
      if (selectedServer?.id === serverId) {
        setSelectedServer(null);
        setChannels([]);
        setMessages([]);
        setSelectedChannel(null);
      }
      showToast('success', 'Sunucu silindi');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Sunucu silinemedi');
    }
  };

  // Üye yönetim modalı için veri yükle
  const loadMembersForManagement = async (serverId: string) => {
    try {
      const response = await serversApi.getMembers(serverId);
      console.log('👥 Üye yönetim modalı - API response:', response.data);
      const membersData = response.data.map((m: any) => ({
        userId: m.userId || m.user?.id,
        username: m.user?.username || m.username || 'Bilinmeyen',
        avatar: m.user?.avatar, // Avatar field'ini ekle!
        role: m.role || 'MEMBER',
        joinedAt: m.joinedAt || new Date().toISOString(),
      }));
      console.log('🖼️ Modal üye avatarları:', membersData.map((m: any) => `${m.username}: ${m.avatar ? '✅' : '❌'}`).join(', '));
      setMembersList(membersData);
      setShowMembersModal(true);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Üyeler yüklenemedi');
    }
  };

  const updateMemberRole = async (serverId: string, memberId: string, newRole: string) => {
    try {
      await serversApi.updateMemberRole(serverId, memberId, newRole);
      setMembersList(prev => prev.map(m => 
        m.userId === memberId ? { ...m, role: newRole } : m
      ));
      setServerMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      showToast('success', `✅ Rol güncellendi: ${newRole}`);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Rol güncellenemedi');
    }
  };

  const kickMember = async (serverId: string, memberId: string) => {
    if (!confirm('Bu üyeyi sunucudan atmak istediğinize emin misiniz?')) return;
    
    try {
      await serversApi.removeMember(serverId, memberId);
      setMembersList(prev => prev.filter(m => m.userId !== memberId));
      setServerMembers(prev => prev.filter(m => m.id !== memberId));
      showToast('success', 'Üye sunucudan atıldı');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Üye atılamadı');
    }
  };

  // Avatar yükleme
  const handleAvatarUpload = async (file: File, type: 'server' | 'profile') => {
    console.log('🎯 handleAvatarUpload çağrıldı:', { fileName: file.name, fileType: file.type, uploadType: type });
    
    if (!file) {
      console.warn('⚠️ Dosya yok!');
      return;
    }
    
    // Dosya tipini kontrol et (sadece resim + GIF)
    if (!file.type.startsWith('image/')) {
      console.error('❌ Geçersiz dosya tipi:', file.type);
      showToast('error', 'Sadece resim dosyaları yüklenebilir (JPG, PNG, GIF, WebP)');
      return;
    }

    // Boyut kontrolü (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ Dosya çok büyük:', file.size);
      showToast('error', 'Avatar boyutu 5MB\'dan küçük olmalı');
      return;
    }

    console.log('✅ Validasyonlar geçti, upload başlıyor...');
    setUploadingAvatar(true);

    try {
      console.log('📤 Upload API çağrılıyor...');
      const uploadResponse = await uploadApi.uploadFile(file, () => {});
      const avatarUrl = uploadResponse.data.url;
      
      console.log('📤 Avatar upload başarılı:', avatarUrl);
      console.log('📦 Upload response:', uploadResponse.data);

      if (type === 'server' && selectedServer) {
        console.log('🏢 SUNUCU AVATAR GÜNCELLENECEK');
        console.log('🔄 Sunucu güncelleniyor:', selectedServer.id, { icon: avatarUrl });
        const updateResponse = await serversApi.update(selectedServer.id, { icon: avatarUrl });
        console.log('✅ Sunucu güncelleme yanıtı:', updateResponse);
        
        setServers(prev => prev.map(s => 
          s.id === selectedServer.id ? { ...s, icon: avatarUrl } : s
        ));
        setSelectedServer(prev => prev ? { ...prev, icon: avatarUrl } : null);
        showToast('success', '✅ Sunucu avatarı güncellendi');
      } else if (type === 'profile' && user) {
        console.log('👤 PROFİL AVATAR GÜNCELLENECEK');
        console.log('🔄 Profil avatarı güncelleniyor:', { avatar: avatarUrl, userId: user.id });
        console.log('🔑 Access token mevcut:', !!accessToken);
        console.log('🌐 API Base:', API_BASE);
        
        const response = await fetch(`${API_BASE}/api/users/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ avatar: avatarUrl }),
        });
        
        console.log('📥 Profil API yanıtı:', response.status, response.statusText, response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Profil güncellendi:', data);
          
          // Auth store'u güncelle (anında görünsün)
          if (data.avatar) {
            const { setUser } = useAuthStore.getState();
            setUser({ ...user, avatar: data.avatar });
            console.log('🔄 Auth store güncellendi, yeni avatar:', data.avatar);
          }
          
          showToast('success', '✅ Profil resminiz güncellendi!');
          
          // Reload'u aktif et (1 saniye sonra)
          setTimeout(() => {
            console.log('🔄 Sayfa yenileniyor...');
            window.location.reload();
          }, 1500);
        } else {
          const errorData = await response.json();
          console.error('❌ Profil güncelleme hatası:', errorData);
          throw new Error(errorData.message || 'Profil güncellenemedi');
        }
      }

      setShowAvatarUpload(null);
    } catch (error: any) {
      console.error('❌ Avatar upload hatası:', error);
      console.error('📋 Hata detayı:', error.response?.data);
      console.error('📋 Tam error objesi:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Avatar yüklenemedi';
      showToast('error', `❌ ${errorMsg}`);
    } finally {
      setUploadingAvatar(false);
      console.log('🏁 Avatar upload işlemi tamamlandı');
    }
  };

  const generateInvite = async () => {
    if (!selectedServer) return;
    try {
      const response = await serversApi.createInvite(selectedServer.id);
      const code = response.data.inviteCode || response.data.code;
      setInviteCode(code);
      setShowInviteModal(true);
      showToast('success', 'Davet linki oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Davet linki oluşturulamadı');
    }
  };

  // Ses seviyesi izlemeyi başlat
  const startAudioMonitoring = async (): Promise<boolean> => {
    try {
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      const effectiveMuted = isMuted || (isPushToTalkMode && !pushToTalkActive);
      const shouldEnableTrack = !effectiveMuted;
      stream.getTracks().forEach(track => track.enabled = shouldEnableTrack);
      localStreamRef.current = stream;
      previousEffectiveMuteRef.current = effectiveMuted;
      
      if (user) {
        setVoiceUsers(prev =>
          prev.map(u => (u.userId === user.id ? { ...u, isMuted: effectiveMuted } : u)),
        );
      }
      
      if (voiceSocketRef.current && voiceSocketRef.current.connected && connectedVoiceChannelIdRef.current) {
        voiceSocketRef.current.emit('toggle-mute', { muted: effectiveMuted });
        console.log('🎛️ Initial toggle-mute sent during startAudioMonitoring:', effectiveMuted);
      }
      console.log('✅ Microphone stream acquired');
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioAnalyserRef.current = audioContextRef.current.createAnalyser();
      
      // ⚡ HASSAS SES ALGILAMA AYARLARI (Daha iyi sensitivity)
      audioAnalyserRef.current.fftSize = 512; // Daha hassas frekans analizi
      audioAnalyserRef.current.minDecibels = -100; // Daha düşük sesler için
      audioAnalyserRef.current.maxDecibels = -10; // Daha geniş aralık
      audioAnalyserRef.current.smoothingTimeConstant = 0.2; // Daha hızlı tepki
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(audioAnalyserRef.current);
      
      const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
      let lastSpeakingState = false;
      
      audioLevelIntervalRef.current = window.setInterval(() => {
        // PTT modunda tuş basılı değilse veya mikrofon kapalıysa ses gönderme
        if (!audioAnalyserRef.current || isMuted || (isPushToTalkMode && !pushToTalkActive)) {
          if (lastSpeakingState) {
            if (voiceSocketRef.current) {
              voiceSocketRef.current.emit('speaking', { isSpeaking: false });
            }
            if (user) {
              setVoiceUsers(prev =>
                prev.map(u => (u.userId === user.id ? { ...u, isSpeaking: false } : u)),
              );
            }
            lastSpeakingState = false;
          }
          setMyAudioLevel(0);
          return;
        }
        
        // Frekans verilerini al
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // İnsan sesi frekanslarına odaklan (80Hz - 4000Hz arası)
        // FFT 512 ile: ~86Hz per bin, insan sesi için bin 1-47 arası
        let sum = 0;
        let count = 0;
        for (let i = 1; i < Math.min(48, dataArray.length); i++) {
          sum += dataArray[i];
          count++;
        }
        const average = count > 0 ? sum / count : 0;
        const level = average / 255;
        
        setMyAudioLevel(level);
        
        // ⚡ DÜŞÜK SES İÇİN HASSAS THRESHOLD (0.01)
        const isSpeaking = level > 0.01;
        if (isSpeaking !== lastSpeakingState && voiceSocketRef.current) {
          console.log(`🎤 Speaking: ${isSpeaking}, level: ${level.toFixed(3)}`);
          voiceSocketRef.current.emit('speaking', { isSpeaking });
          
          // ⏰ AFK TIMER'I SIFIRLA! (Konuşma = Aktif)
          if (isSpeaking) {
            lastActivityRef.current = Date.now();
          }
          
          // Kendi kullanıcının isSpeaking state'ini güncelle
          if (user) {
            setVoiceUsers(prev => prev.map(u => 
              u.userId === user.id ? { ...u, isSpeaking } : u
            ));
          }
          
          lastSpeakingState = isSpeaking;
        }
      }, 80); // ⚡ DENGELI GÜNCELLEME (80ms - Optimal!)
      
      console.log('✅ Audio monitoring started');
      return true;
    } catch (error) {
      console.error('❌ Mikrofon erişim hatası:', error);
      showToast('error', 'Mikrofon erişimi reddedildi');
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
    previousEffectiveMuteRef.current = null;
    
    // Force garbage collection hint
    console.log('🧹 Audio monitoring stopped and resources cleaned');
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
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        showToast={showToast}
        onAvatarClick={() => {
          setShowSettingsModal(false);
          setShowAvatarUpload('profile');
        }}
      />
      
      {/* Ekran Paylaşım Ayarları Modalı */}
      <ScreenShareSettings
        isOpen={showScreenShareSettings}
        onClose={() => setShowScreenShareSettings(false)}
        onStart={startScreenShareWithSettings}
        currentQuality={screenQuality}
        currentSystemAudio={shareSystemAudio}
      />

      {previewFile && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/70 text-white hover:bg-neutral-900 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 truncate">{previewFile.filename}</h3>
              <p className="text-sm text-neutral-500">
                {previewFile.mimetype || 'Dosya'}
                {previewFile.size ? ` • ${formatFileSize(previewFile.size)}` : ''}
              </p>
            </div>
            <div className="bg-neutral-100 flex items-center justify-center max-h-[70vh]">
              {previewFile.mimetype?.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-10 text-center text-neutral-600">
                  <p className="text-lg font-semibold mb-2">Önizleme desteklenmiyor</p>
                  <p className="text-sm">Bu dosyayı bilgisayarınıza indirerek görüntüleyebilirsiniz.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-neutral-200 bg-white">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-all"
              >
                Kapat
              </button>
              <button
                onClick={() => handleDownloadFile(previewFile.url, previewFile.filename)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                İndir
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div key={server.id} className="relative group">
              <button
                onClick={() => setSelectedServer(server)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setServerContextMenu({
                    serverId: server.id,
                    serverName: server.name,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                  selectedServer?.id === server.id
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                }`}
                title={server.name}
              >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-md overflow-hidden ${
                      selectedServer?.id === server.id 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {server.icon ? (
                        <img 
                          src={resolveFileUrl(server.icon)} 
                          alt={server.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        server.name.charAt(0).toUpperCase()
                      )}
                </div>
                    <span className="font-semibold text-sm whitespace-nowrap max-w-[120px] truncate">{server.name}</span>
              </button>
            </div>
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
              
              {/* Hızlı Erişim (Üst Barda) */}
              <div className="flex items-center gap-2 pl-4 border-l border-white/20">
                <a
                  href="/"
                  target="_blank"
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all hover:scale-110"
                  title="Portal - Ana Sayfa"
                >
                  <span className="text-lg">🏠</span>
                </a>
                <button
                  onClick={() => { 
                    setShowFriendsPanel(true); 
                    setShowDMPanel(false); 
                    setSelectedChannel(null);
                  }}
                  className={`p-2 rounded-lg transition-all hover:scale-110 ${
                    showFriendsPanel ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Arkadaşlar"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowDMPanel(true); setShowFriendsPanel(false); }}
                  className={`p-2 rounded-lg transition-all hover:scale-110 ${
                    showDMPanel ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Direkt Mesajlar"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
              
              {/* Right Side - User & Logout */}
              <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl hover:bg-white/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {user?.avatar ? (
                      <img 
                        src={resolveFileUrl(user.avatar)} 
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-white font-semibold text-sm">{user?.username}</span>
                </button>
            <button
                  onClick={logout} 
                  className="p-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-lg transition-all duration-200 hover:scale-110"
            title="Çıkış Yap"
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
              <h2 className="font-bold text-xl truncate mb-1 pr-12 lg:pr-0">{selectedServer?.name || 'Sunucu Seç'}</h2>
              <p className="text-xs text-blue-100">{serverMembers.length} üye çevrimiçi</p>
          </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Text Channels */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Metin Kanalları</h3>
                  <button onClick={() => setShowNewChannelModal(true)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
              </div>
                <div className="space-y-1.5">
                {textChannels.map((channel) => (
                  <div key={channel.id} className="relative group">
                    <button
                      onClick={() => {
                        setSelectedChannel(channel);
                        setShowDMPanel(false);
                        setShowFriendsPanel(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setChannelContextMenu({
                          channelId: channel.id,
                          channelName: channel.name,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                        selectedChannel?.id === channel.id
                          ? 'bg-blue-500 text-white shadow-lg scale-105'
                          : 'text-neutral-700 hover:bg-blue-50 hover:scale-102'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Hash className="w-5 h-5" />
                        <span className="font-medium truncate">{channel.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChannelContextMenu({
                            channelId: channel.id,
                            channelName: channel.name,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </button>
                  </div>
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
                      // Bağlı kanalsa voiceUsers (mikrofon animasyonu için), değilse channelVoiceUsers (önizleme için)
                      const currentChannelUsers = isConnected 
                        ? voiceUsers.map(u => ({ id: u.userId, username: u.username, isMuted: u.isMuted, isSpeaking: u.isSpeaking, hasScreenAudio: u.hasScreenAudio }))
                        : (channelVoiceUsers[channel.id] || []);
                  
                  return (
                    <div key={channel.id} className="relative group">
                      <button
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setChannelContextMenu({
                                channelId: channel.id,
                                channelName: channel.name,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            onClick={() => {
                              if (isConnected) {
                                  // Ayrıl
                                  stopAudioMonitoring();
                                  voiceSocketRef.current?.emit('leave-voice');
                                  setConnectedVoiceChannelId(null);
                                  connectedVoiceChannelIdRef.current = null;
                                  setVoiceUsers([]);
                                  
                                  // 💾 LocalStorage'dan sil
                                  localStorage.removeItem('lastVoiceChannel');
                                  
                                  // 🔊 ÇIKIŞ SESİ ÇAL!
                                  if (leaveSoundRef.current) {
                                    leaveSoundRef.current.currentTime = 0;
                                    leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                  }
                                  
                                  console.log('🚪 Left voice channel:', channel.id);
                              } else {
                                // Katıl
                                (async () => {
                                  setConnectedVoiceChannelId(channel.id);
                                  connectedVoiceChannelIdRef.current = channel.id;
                                  
                                  // Mikrofonu başlat ve BEKLE
                                  const success = await startAudioMonitoring();
                                  
                                  if (!success) {
                                    console.error('❌ Mikrofon başlatılamadı, sesli kanala katılma iptal edildi');
                                    setConnectedVoiceChannelId(null);
                                    connectedVoiceChannelIdRef.current = null;
                                    return;
                                  }
                                  
                                  // ✅ Mikrofon hazır, şimdi sesli kanala katıl
                                  if (voiceSocketRef.current && user && selectedServer) {
                                    voiceSocketRef.current.emit('join-voice', { 
                                      roomId: selectedServer.id,
                                      channelId: channel.id,
                                      userId: user.id,
                                      username: user.username
                                    });
                                    console.log('🎤 Joining voice - Server:', selectedServer.id, 'Channel:', channel.id);
                                    
                                    const initialMutedState = isMuted || (isPushToTalkMode && !pushToTalkActive);
                                    setTimeout(() => {
                                      if (voiceSocketRef.current && voiceSocketRef.current.connected) {
                                        voiceSocketRef.current.emit('toggle-mute', { muted: initialMutedState });
                                        console.log('🎛️ Syncing initial mute state after join:', initialMutedState);
                                      }
                                    }, 200);
                                    
                                    // ✅ KENDİNİ HEMEN EKLE!
                                    setVoiceUsers([{
                                      userId: user.id,
                                      username: user.username,
                                      isMuted: false,
                                      isSpeaking: false,
                                      hasScreenAudio: false
                                    }]);
                                    console.log('👤 Added self to voice immediately:', user.username);
                                    
                                    // 💾 Kanala katılınca localStorage'a kaydet
                                    localStorage.setItem('lastVoiceChannel', JSON.stringify({
                                      channelId: channel.id,
                                      serverId: selectedServer.id,
                                      timestamp: Date.now()
                                    }));
                                    
                                    // 🔊 GİRİŞ SESİ ÇAL!
                                    setTimeout(() => {
                                      if (joinSoundRef.current) {
                                        joinSoundRef.current.currentTime = 0;
                                        joinSoundRef.current.volume = 0.5; // Orta seviye
                                        joinSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                      }
                                    }, 500); // Mikrofon başladıktan sonra
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
                      
                          {/* Sesli kanaldaki kullanıcılar - Modern Kompakt */}
                          {currentChannelUsers.length > 0 && (
                            <div className="ml-2 mt-2 space-y-1">
                              {currentChannelUsers.map((vu) => {
                                const isMe = vu.id === user?.id;
                                const voiceState = voiceUsers.find(u => u.userId === vu.id);
                                const baseMuteState = voiceState?.isMuted ?? vu.isMuted ?? false;
                                const hasScreenAudio = voiceState?.hasScreenAudio ?? (vu as any).hasScreenAudio ?? false;
                                const effectiveMuteForUser = hasScreenAudio ? false : baseMuteState;
                                const currentIsSpeaking = isMe
                                  ? (myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive))
                                  : (voiceState?.isSpeaking ?? vu.isSpeaking ?? false);
                                const isDeafenedUser = isMe && isDeafened;
                                
                                // DEBUG LOG
                                if (!isMe && hasScreenAudio) {
                                  console.log(`🎤 [${vu.username}] hasScreenAudio:`, hasScreenAudio, 'effectiveMuteForUser:', effectiveMuteForUser, 'voiceState:', voiceState);
                                }

                                return (
                                  <div
                                    key={vu.id}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        userId: vu.id,
                                        username: vu.username,
                                        x: e.clientX,
                                        y: e.clientY,
                                      });
                                    }}
                                    className={`group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all cursor-pointer ${
                                      currentIsSpeaking
                                        ? 'bg-green-500/10 hover:bg-green-500/20'
                                        : 'hover:bg-neutral-100'
                                    }`}
                                  >
                                    {/* Avatar - Ses Seviyesine Göre Glow */}
                                    <div className="relative flex-shrink-0">
                                      <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-200 ${
                                          currentIsSpeaking
                                            ? 'bg-gradient-to-br from-green-500 to-green-600 avatar-speaking'
                                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                        }`}
                                        style={{
                                          boxShadow: currentIsSpeaking && isMe
                                            ? `0 0 ${Math.min(20, myAudioLevel * 100)}px ${Math.min(10, myAudioLevel * 50)}px rgba(16, 185, 129, ${Math.min(0.6, myAudioLevel * 3)})`
                                            : currentIsSpeaking
                                            ? '0 0 15px 5px rgba(16, 185, 129, 0.4)'
                                            : 'none'
                                        }}
                                      >
                                        {(() => {
                                          const member = serverMembers.find(m => m.id === vu.userId);
                                          const avatarUrl = isMe ? user?.avatar : member?.avatar;
                                          
                                          if (avatarUrl) {
                                            return <img src={resolveFileUrl(avatarUrl)} alt={vu.username} className="w-full h-full object-cover" />;
                                          }
                                          return vu.username?.charAt(0).toUpperCase() || 'U';
                                        })()}
                                      </div>
                                    </div>

                                    {/* Username + Durum İkonları */}
                                    <div className="flex-1 min-w-0 flex items-center gap-2">
                                      <div className="font-medium text-sm text-neutral-800 truncate">
                                        {vu.username}
                                      </div>
                                      
                                      {/* Mikrofon İkonu - Yeni SVG */}
                                      {effectiveMuteForUser ? (
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                                          </svg>
                                        </div>
                                      ) : (
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                          </svg>
                                        </div>
                                      )}

                                      {/* Hoparlör İkonu - Yeni SVG (sadece deafen durumu için) */}
                                      {isDeafenedUser && (
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                                            <path d="M2 2L22 22" stroke="currentColor" strokeWidth="2"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Menü Butonu */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setContextMenu({
                                          userId: vu.id,
                                          username: vu.username,
                                          x: e.clientX,
                                          y: e.clientY,
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 transition-all"
                                    >
                                      <MoreVertical className="w-4 h-4 text-neutral-600" />
                                    </button>
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

            </div>

            {/* Sesli Kanal Kontrolleri (Profil Üstünde) */}
            {connectedVoiceChannelId && (
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
                        setIsPushToTalkMode(!isPushToTalkMode);
                        localStorage.setItem('pushToTalk', String(!isPushToTalkMode));
                        showToast('info', isPushToTalkMode ? '🎤 Normal mod' : '⌨️ Bas-Konuş modu');
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
                      onClick={() => {
                        stopAudioMonitoring();
                        voiceSocketRef.current?.emit('leave-voice');
                        setConnectedVoiceChannelId(null);
                        connectedVoiceChannelIdRef.current = null;
                        setVoiceUsers([]);
                        localStorage.removeItem('lastVoiceChannel');
                      }}
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
                        onClick={async () => {
                          if (isScreenSharing) {
                            handleStopScreenShare();
                          } else {
                            try {
                              const displayOptions = getScreenConstraints(screenQuality, shareSystemAudio);
                              const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
                              if (shareSystemAudio && stream.getAudioTracks().length > 0) {
                                showToast('success', '🖥️🔊 Ekran + Ses paylaşımı başladı');
                              }
                              stream.getVideoTracks()[0].onended = () => handleStopScreenShare();
                              await handleStartScreenShare(stream);
                            } catch (err) {
                              showToast('error', 'Ekran paylaşımı reddedildi');
                            }
                          }
                        }}
                        className={`flex-1 p-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                          isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                        }`}
                        title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
                      >
                        {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        <span className="text-sm font-medium">{isScreenSharing ? 'Durdur' : 'Ekran Paylaş'}</span>
                      </button>
                      
                      {!isScreenSharing && (
                        <button
                          onClick={() => setShowQualityMenu(!showQualityMenu)}
                          className="p-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 transition-all hover:scale-105 relative"
                          title="Ekran Paylaşımı Ayarları"
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
                                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-all">
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
                                      ].map((option) => (
                                        <button
                                          key={option.value}
                                          onClick={() => setScreenQuality(option.value as any)}
                                          className={`w-full px-2 py-1.5 rounded-md text-left flex items-center justify-between transition-all ${
                                            screenQuality === option.value ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-750'
                                          }`}
                                        >
                                          <span className="font-medium text-xs">{option.label}</span>
                                          <span className="text-[10px] opacity-70">{option.sub}</span>
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
                      onClick={async () => {
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
                            showToast('error', 'Kamera erişimi reddedildi');
                          }
                        }
                      }}
                      className={`p-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                        isVideoOn ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                      }`}
                      title={isVideoOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                    >
                      {isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      <span className="text-sm font-medium">{isVideoOn ? 'Kapat' : 'Kamera'}</span>
                    </button>
                    
                    {/* İzle Butonu (Başkaları paylaşıyorsa) */}
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
            )}
            
            {/* User Profile Card */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
              <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                  {user?.avatar ? (
                    <img 
                      src={resolveFileUrl(user.avatar)} 
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
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
                      <p className="text-xs text-neutral-500">Özel sohbetleriniz</p>
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
                      <p className="text-xs text-neutral-500">{selectedChannel.type === 'TEXT' ? 'Metin Kanalı' : 'Sesli Kanal'}</p>
                    </div>
                  </>
            )}
          </div>

              <div className="hidden lg:flex items-center gap-2">
                <button 
                  onClick={() => selectedServer && loadMembersForManagement(selectedServer.id)} 
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Üyeler ({serverMembers.length})</span>
                </button>
                <button onClick={generateInvite} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Davet</span>
                </button>
              </div>
            </div>

            {/* Inline Screen Share (Mesajların Üstünde) */}
            {selectedChannel?.type === 'TEXT' && showTheaterMode && theaterPresenter && (
              <InlineScreenShare
                presenter={theaterPresenter}
                participants={(() => {
                  // Unique participants (duplicate'leri temizle)
                  const uniqueMap = new Map();
                  
                  voiceUsers.forEach(vu => {
                    if (!uniqueMap.has(vu.userId)) {
                      const remoteMeta = remoteUsers.find(ru => ru.userId === vu.userId);
                      uniqueMap.set(vu.userId, {
                        userId: vu.userId,
                        username: vu.username,
                        isMuted: vu.isMuted,
                        isSpeaking: vu.isSpeaking,
                        isScreenSharing: vu.userId === theaterPresenter.userId,
                        isVideoOn: remoteMeta?.isVideoOn,
                        hasScreenAudio: vu.hasScreenAudio || remoteMeta?.hasScreenAudio,
                        stream: remoteMeta?.stream,
                      });
                    }
                  });
                  
                  // Add self if not already in list
                  if (!uniqueMap.has(user!.id)) {
                    const selfVoiceState = voiceUsers.find(vu => vu.userId === user!.id);
                    uniqueMap.set(user!.id, {
                      userId: user!.id,
                      username: user!.username,
                      isMuted: isMuted || (isPushToTalkMode && !pushToTalkActive),
                      isSpeaking: myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive),
                      isScreenSharing: isScreenSharing,
                      isVideoOn,
                      hasScreenAudio: selfVoiceState?.hasScreenAudio || false,
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
                        <p className="text-neutral-500">Yükleniyor...</p>
                      </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-neutral-500">
                        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-800 mb-2">#{selectedChannel.name}</h3>
                        <p className="text-sm">İlk mesajı siz gönderin! 🚀</p>
                    </div>
                  </div>
                ) : (
                    messages.map((msg) => {
                      const isMe = msg.user?.id === user?.id;
                      const payload = parseMessageContent(msg.content);
                      const messageText = payload.type === 'file' ? (payload.text || '') : payload.text;
                      const inviteMatch = messageText ? messageText.match(/https:\/\/app\.asforces\.com\/invite\/([a-zA-Z0-9]+)/) : null;
                      const inviteCode = inviteMatch ? inviteMatch[1] : null;
                      const fileUrl = payload.type === 'file' ? resolveFileUrl(payload.url) : null;
                      const isImageFile = payload.type === 'file' && (payload.mimetype?.startsWith('image/') ?? false);
                      const fileSizeLabel = payload.type === 'file' ? formatFileSize(payload.size) : '';
                      
                      return (
                        <div 
                          key={msg.id} 
                          className={`group flex gap-3 px-4 md:px-12 lg:px-24 ${isMe ? 'flex-row-reverse' : 'flex-row'} relative`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMessageContextMenu({
                              messageId: msg.id,
                              isOwner: isMe,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md overflow-hidden ${
                              isMe
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                : 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white'
                            }`}>
                              {isMe ? (
                                user?.avatar ? (
                                  <img src={resolveFileUrl(user.avatar)} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                  user?.username?.charAt(0).toUpperCase()
                                )
                              ) : (
                                msg.user?.avatar ? (
                                  <img src={resolveFileUrl(msg.user.avatar)} alt={msg.user.username} className="w-full h-full object-cover" />
                                ) : (
                                  msg.user?.username?.charAt(0).toUpperCase()
                                )
                              )}
                            </div>
                          </div>
                          
                          {/* Message */}
                          <div className={`max-w-lg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                              <div className="text-xs text-neutral-500 mb-1 px-2 font-semibold">
                                {msg.user?.displayName || msg.user?.username || 'Kullanıcı'}
                              </div>
                            )}
                            
                            {/* Düzenleme Modu */}
                            {editingMessageId === msg.id ? (
                              <div className="w-full bg-white border-2 border-blue-500 rounded-xl p-3 shadow-lg">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                                  rows={3}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      saveEditMessage(msg.id);
                                    }
                                    if (e.key === 'Escape') {
                                      cancelEditMessage();
                                    }
                                  }}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    onClick={cancelEditMessage}
                                    className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
                                  >
                                    İptal (Esc)
                                  </button>
                                  <button
                                    onClick={() => saveEditMessage(msg.id)}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all"
                                  >
                                    Kaydet (Enter)
                                  </button>
                                </div>
                              </div>
                            ) : (
                            <div className={`w-full px-4 py-3 rounded-2xl shadow-sm ${
                              isMe 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm' 
                                : 'bg-white text-neutral-800 rounded-bl-sm border border-neutral-200'
                            }`}>
                              {payload.type === 'file' ? (
                                <div className="space-y-3">
                                  {messageText && (
                                    <div className="message-content whitespace-pre-wrap break-words leading-relaxed">
                                      {messageText}
                                    </div>
                                  )}
                                  <div className={`rounded-xl border ${isMe ? 'border-white/30 bg-white/10' : 'border-blue-200 bg-blue-50/60'}`}>
                                    {isImageFile && fileUrl ? (
                                      <div className="group">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile({ filename: payload.filename, url: fileUrl, mimetype: payload.mimetype, size: payload.size })}
                                          className="block w-full overflow-hidden focus:outline-none"
                                        >
                                          <img
                                            src={fileUrl}
                                            alt={payload.filename}
                                            className="max-h-80 w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                                          />
                                        </button>
                                        <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${isMe ? 'bg-white/20 text-white' : 'bg-white text-neutral-800'}`}>
                                          <div className="min-w-0">
                                            <p className="font-semibold truncate">{payload.filename}</p>
                                            <p className="text-xs opacity-70">{fileSizeLabel}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => setPreviewFile({ filename: payload.filename, url: fileUrl, mimetype: payload.mimetype, size: payload.size })}
                                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/20'}`}
                                            >
                                              <Eye className="w-4 h-4" />
                                              Önizle
                                            </button>
                                            <button
                                              onClick={() => handleDownloadFile(fileUrl!, payload.filename)}
                                              className={`p-2 rounded-lg transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 hover:bg-blue-600/20'}`}
                                              title="İndir"
                                            >
                                              <Download className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-600'}`} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isMe ? 'bg-white/10 text-white' : 'bg-white text-neutral-800'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMe ? 'bg-white/15 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
                                            <FileText className="w-6 h-6" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-semibold truncate">{payload.filename}</p>
                                            <p className="text-xs opacity-70">{fileSizeLabel || payload.mimetype}</p>
                                          </div>
                                        </div>
                                        {fileUrl && (
                                          <button
                                            onClick={() => handleDownloadFile(fileUrl, payload.filename)}
                                            className={`p-2 rounded-lg transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 hover:bg-blue-600/20'}`}
                                            title="İndir"
                                          >
                                            <Download className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-600'}`} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="message-content whitespace-pre-wrap break-words leading-relaxed">
                                  {payload.text}
                                </div>
                              )}
                              
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
                                  <span>🎉 Sunucuya Katıl</span>
                                </button>
                              )}
                            </div>
                            )}
                            <div className={`text-xs mt-1 px-2 flex items-center gap-1 ${isMe ? 'text-neutral-500' : 'text-neutral-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              {msg.isEdited && <span className="text-xs opacity-70">(düzenlendi)</span>}
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
                            <span className="text-2xl">📎</span>
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
                        placeholder={`#${selectedChannel.name} kanalına mesaj gönder...`}
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
                          <span className="hidden sm:inline">Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span className="hidden sm:inline">Gönder</span>
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
                  <p className="text-neutral-500">Sol menüden sesli kanala katılın</p>
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
                  Üyeler — {serverMembers.length}
            </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {serverMembers.map((member) => (
                  <div key={member.userId} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-200 group">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                        {member.avatar ? (
                          <img src={resolveFileUrl(member.avatar)} alt={member.username} className="w-full h-full object-cover" />
                        ) : (
                          member.username?.charAt(0).toUpperCase() || 'U'
                        )}
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
                        {member.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
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
                  Arkadaşlar
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
              <span className="text-xs font-medium">Arkadaş</span>
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
                                
                                // 🔊 ÇIKIŞ SESİ ÇAL!
                                if (leaveSoundRef.current) {
                                  leaveSoundRef.current.currentTime = 0;
                                  leaveSoundRef.current.play().catch(e => console.log('Sound play failed:', e));
                                }
                              } else {
                                (async () => {
                                  setConnectedVoiceChannelId(channel.id);
                                  connectedVoiceChannelIdRef.current = channel.id;
                                  
                                  // Mikrofonu başlat ve BEKLE
                                  const success = await startAudioMonitoring();
                                  
                                  if (!success) {
                                    console.error('❌ Mikrofon başlatılamadı');
                                    setConnectedVoiceChannelId(null);
                                    connectedVoiceChannelIdRef.current = null;
                                    return;
                                  }
                                  
                                  // ✅ Mikrofon hazır, sesli kanala katıl
                                  if (voiceSocketRef.current && user && selectedServer) {
                                    voiceSocketRef.current.emit('join-voice', { 
                                      roomId: selectedServer.id,
                                      channelId: channel.id,
                                      userId: user.id,
                                      username: user.username
                                    });
                                    
                                    // 🔊 GİRİŞ SESİ ÇAL! (Mobil)
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
                                    {currentChannelUsers.length} kişi
                                  </p>
                                )}
                              </div>
                            </div>
                            {isConnected && (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">Bağlı</span>
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
                                          <span className="text-xs text-green-600 font-medium">Konuşuyor</span>
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
                                          title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
                                        >
                                          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        </button>
                                        
                                        {/* Ekran Paylaşımı - Yeni Ayarlar */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isScreenSharing) {
                                              handleStopScreenShare();
                                            } else {
                                              setShowScreenShareSettings(true);
                                            }
                                          }}
                                          className={`p-2 rounded-lg ${isScreenSharing ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 hover:from-blue-200 hover:to-purple-200'} transition-all`}
                                          title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş (720p-4K, Sistem Sesi)'}
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
                                                showToast('error', 'Kamera erişimi reddedildi');
                                              }
                                            }
                                          }}
                                          className={`p-2 rounded-lg ${isVideoOn ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-600'}`}
                                          title={isVideoOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
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


      {/* Minimal Sesli Kanal Kontrol Paneli - KALDIRILDI (Kontroller artık sol panelde) */}
      {false && connectedVoiceChannelId && !showTheaterMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-700 px-6 py-3 flex items-center gap-4">
            {/* Channel Info */}
            <div className="flex items-center gap-3 border-r border-neutral-700 pr-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-white">
                <p className="text-sm font-bold">
                  {channels.find(c => c.id === connectedVoiceChannelId)?.name || 'Müzik'}
                </p>
                <p className="text-xs text-neutral-400">{voiceUsers.length} kişi</p>
              </div>
            </div>

            {/* Ekran Paylaşımları (Multi-Presenter Dropdown) */}
            {(remoteUsers.some(u => u.isScreenSharing) || isScreenSharing) && (
              <div className="relative group">
                {(() => {
                  const presenters = [
                    ...(isScreenSharing ? [{ userId: user!.id, username: user!.username + ' (Sen)', stream: screenStreamRef.current || undefined, isScreenSharing: true }] : []),
                    ...remoteUsers.filter(u => u.isScreenSharing)
                  ];
                  const presenterCount = presenters.length;
                  
                  return (
                    <>
                      <button
                        onClick={() => {
                          if (showTheaterMode) {
                            setShowTheaterMode(false);
                            setTheaterPresenter(null);
                          } else if (presenterCount === 1) {
                            const presenter = presenters[0];
                            console.log('🎭 Opening theater for:', presenter.username, 'Stream:', presenter.stream);
                            setTheaterPresenter(presenter);
                            setShowTheaterMode(true);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                          showTheaterMode 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white animate-pulse'
                        }`}
                      >
                        <Monitor className="w-4 h-4" />
                        {showTheaterMode ? 'Kapat' : 'İzle'}
                        {presenterCount > 1 && <span className="text-xs ml-1">({presenterCount})</span>}
                      </button>
                      
                      {/* Dropdown (Birden fazla paylaşan varsa) */}
                      {presenterCount > 1 && !showTheaterMode && (
                        <div className="absolute bottom-full mb-2 left-0 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700 py-2 min-w-56 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                          <div className="px-3 py-1 text-xs text-neutral-400 font-semibold border-b border-neutral-700 mb-1">
                            {presenterCount} Ekran Paylaşımı:
                          </div>
                          {presenters.map(p => (
                            <button
                              key={p.userId}
                              onClick={() => {
                                console.log('🎭 Selected presenter from dropdown:', p.username, 'Stream:', p.stream);
                                setTheaterPresenter(p);
                                setShowTheaterMode(true);
                              }}
                              className="w-full px-4 py-2.5 text-left text-white hover:bg-neutral-700 transition-all flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                {p.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">{p.username}</p>
                                <p className="text-xs text-blue-400 flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  Ekran paylaşıyor
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Mikrofon (PTT Aware) */}
              <div className="relative group">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setIsPushToTalkMode(!isPushToTalkMode);
                    localStorage.setItem('pushToTalk', String(!isPushToTalkMode));
                    showToast('info', isPushToTalkMode ? '🎤 Normal mod' : '⌨️ Bas-Konuş modu');
                  }}
                  className={`p-3 rounded-xl transition-all hover:scale-110 relative ${
                    isMuted 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : pushToTalkActive && isPushToTalkMode
                      ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300'
                      : isPushToTalkMode
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  title={
                    isPushToTalkMode 
                      ? (isMuted ? 'Mikrofonu Aç' : pushToTalkActive ? 'Konuşuyor (PTT)' : 'PTT: Tuşa bas')
                      : (isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat')
                  }
                >
                  {isMuted ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className={`w-4 h-4 ${pushToTalkActive && isPushToTalkMode ? 'text-white' : 'text-green-400'}`} />
                  )}
                  {isPushToTalkMode && !isMuted && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-neutral-900"></div>
                  )}
                </button>
                {/* PTT Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {isPushToTalkMode ? '⌨️ PTT Modu (Sağ tık: Normal)' : 'Sağ tık: PTT modu'}
                </div>
              </div>
              
              {/* Kulaklık Kapat */}
              <button
                onClick={() => {
                  const newDeafened = !isDeafened;
                  setIsDeafened(newDeafened);
                  if (newDeafened && !isMuted) {
                    setIsMuted(true);
                  }
                  showToast(newDeafened ? 'info' : 'success', newDeafened ? '🎧 Kulaklık kapatıldı' : '🎧 Kulaklık açıldı');
                }}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${
                  isDeafened ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-700 hover:bg-neutral-600'
                }`}
                title={isDeafened ? 'Kulaklığı Aç' : 'Kulaklığı Kapat'}
              >
                <Headphones className={`w-4 h-4 ${isDeafened ? 'text-white' : 'text-neutral-400'}`} />
              </button>
              
              {/* Ekran Paylaşımı (Basit Tek Tık) */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (isScreenSharing) {
                    handleStopScreenShare();
                  } else {
                    try {
                      const displayOptions = getScreenConstraints(screenQuality, shareSystemAudio);
                      console.log('🎬 Starting screen share - Quality:', screenQuality, 'Audio:', shareSystemAudio);
                      const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
                      
                      if (shareSystemAudio && stream.getAudioTracks().length > 0) {
                        console.log('🔊 System audio track included!');
                        showToast('success', '🖥️🔊 Ekran + Ses paylaşımı başladı');
                      } else if (!shareSystemAudio) {
                        showToast('success', '🖥️ Ekran paylaşımı başladı');
                      }
                      
                      stream.getVideoTracks()[0].onended = () => handleStopScreenShare();
                      await handleStartScreenShare(stream);
                    } catch (err) {
                      showToast('error', 'Ekran paylaşımı reddedildi');
                    }
                  }
                }}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${
                  isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-neutral-700 hover:bg-neutral-600'
                }`}
                title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
              >
                {isScreenSharing ? <MonitorOff className="w-4 h-4 text-white" /> : <Monitor className="w-4 h-4 text-neutral-400" />}
              </button>
              
              {/* Ekran Paylaşımı Ayarları */}
              {!isScreenSharing && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQualityMenu(!showQualityMenu);
                    }}
                    className="p-3 rounded-xl transition-all hover:scale-110 bg-neutral-700 hover:bg-neutral-600"
                    title="Ekran Paylaşımı Ayarları"
                  >
                    <Settings className="w-4 h-4 text-neutral-400" />
                  </button>
                  
                  {/* Ayarlar Dropdown (İnce Kompakt) */}
                  {showQualityMenu && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setShowQualityMenu(false)}></div>
                      <div className="absolute bottom-full mb-2 left-0 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-600 w-56 z-[100]" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 rounded-t-xl">
                          <h3 className="text-white font-semibold text-xs">Ekran Paylaşımı</h3>
                        </div>
                        
                        <div className="p-3 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer p-2 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-all">
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
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setScreenQuality(option.value as any)}
                                  className={`w-full px-2 py-1.5 rounded-md text-left flex items-center justify-between transition-all ${
                                    screenQuality === option.value ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-white hover:bg-neutral-750'
                                  }`}
                                >
                                  <span className="font-medium text-xs">{option.label}</span>
                                  <span className="text-[10px] opacity-70">{option.sub}</span>
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
                </div>
              )}
              
              {/* Video */}
              <button
                onClick={async () => {
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
                      showToast('error', 'Kamera erişimi reddedildi');
                    }
                  }
                }}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${
                  isVideoOn ? 'bg-purple-500 hover:bg-purple-600' : 'bg-neutral-700 hover:bg-neutral-600'
                }`}
                title={isVideoOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
              >
                {isVideoOn ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-neutral-400" />}
              </button>
            </div>
            
            {/* Disconnect (Komple Ayrıl) */}
            <div className="border-l border-neutral-700 pl-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  
                  // Sesli kanaldan komple ayrıl
                  if (voiceSocketRef.current && connectedVoiceChannelId) {
                    voiceSocketRef.current.emit('leave-voice');
                  }
                  
                  setConnectedVoiceChannelId(null);
                  connectedVoiceChannelIdRef.current = null;
                  setVoiceUsers([]);
                  setChannelVoiceUsers({});
                  handleStopScreenShare();
                  handleStopVideo();
                  
                  // Audio monitoring durdur
                  if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                  }
                  if (audioLevelIntervalRef.current) {
                    clearInterval(audioLevelIntervalRef.current);
                    audioLevelIntervalRef.current = null;
                  }
                  if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => track.stop());
                    localStreamRef.current = null;
                  }
                  
                  // Tüm peer connections'ı temizle
                  peerConnectionsRef.current.forEach(pc => pc.close());
                  peerConnectionsRef.current.clear();
                  
                  showToast('info', '🚪 Sesli kanaldan ayrıldınız');
                }}
                className="p-3 bg-red-500 hover:bg-red-600 rounded-xl transition-all hover:scale-110"
                title="Sesli Kanaldan Tamamen Ayrıl"
              >
                <Phone className="w-4 h-4 text-white rotate-135" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Kullanıcı Sağ Tık Menüsü */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 via-white to-purple-50 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold shadow-md overflow-hidden">
                  {(() => {
                    const member = serverMembers.find(m => m.id === contextMenu.userId || m.userId === contextMenu.userId);
                    const avatarUrl = member?.avatar;
                    
                    if (avatarUrl) {
                      return <img src={resolveFileUrl(avatarUrl)} alt={contextMenu.username} className="w-full h-full object-cover" />;
                    }
                    return contextMenu.username?.charAt(0).toUpperCase();
                  })()}
                </div>
                <div>
                  <p className="font-bold text-neutral-900 text-sm">{contextMenu.username}</p>
                  <p className="text-[11px] text-neutral-500">Ses ayarları & yönetim</p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                  <span className="flex items-center gap-2 text-blue-600">
                    <Volume2 className="w-3.5 h-3.5" />
                    Ses Seviyesi
                  </span>
                  <span className="text-blue-600">
                    {Math.round((userVolumeSettings[contextMenu.userId] || 1) * 100)}%
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
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
                    className="flex-1 h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                  />
                  <div
                    className={`p-2 rounded-full border ${
                      (voiceUsers.find(u => u.userId === contextMenu.userId)?.isMuted ?? false)
                        ? 'bg-red-500/15 border-red-200 text-red-600'
                        : 'bg-emerald-500/15 border-emerald-200 text-emerald-600'
                    }`}
                  >
                    {(voiceUsers.find(u => u.userId === contextMenu.userId)?.isMuted ?? false)
                      ? <MicOff className="w-4 h-4" />
                      : <Mic className="w-4 h-4" />}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1.5">
                  <span>0%</span>
                  <span>200%</span>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-neutral-700">
                <button
                  onClick={() => {
                    showToast('info', 'Rol atama özelliği yakında burada olacak.');
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all"
                >
                  <Shield className="w-4 h-4 text-purple-500" />
                  Rol Ata
                </button>
                <button
                  onClick={() => {
                    showToast('info', 'Özel mesaj için arkadaş menüsünü kullanabilirsiniz.');
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Özel Mesaj Gönder
                </button>
                <button
                  onClick={() => {
                    showToast('info', 'Kullanıcıyı susturma özelliği yakında eklenecek.');
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all"
                >
                  <VolumeX className="w-4 h-4 text-red-500" />
                  Kanaldan Sustur
                </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setUserVolumeSettings(prev => ({ ...prev, [contextMenu.userId]: 1.0 }));
                  const audioEl = document.getElementById(`audio-${contextMenu.userId}`) as HTMLAudioElement;
                  if (audioEl) audioEl.volume = 1.0;
                  showToast('success', '🔊 Ses seviyesi sıfırlandı');
                  setContextMenu(null);
                }}
                className="px-3 py-2 rounded-lg bg-white border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-all"
              >
                Sıfırla (100%)
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mesaj Sağ Tık Menüsü */}
      {messageContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMessageContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-56 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
          >
            <div className="py-2">
              {messageContextMenu.isOwner && (
                <>
                  <button
                    onClick={() => {
                      const msg = messages.find(m => m.id === messageContextMenu.messageId);
                      if (msg) startEditMessage(msg.id, msg.content);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Mesajı Düzenle
                  </button>
                  <div className="h-px bg-neutral-200 my-1" />
                </>
              )}
              <button
                onClick={() => deleteMessage(messageContextMenu.messageId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Mesajı Sil
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sunucu Sağ Tık Menüsü */}
      {serverContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setServerContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-56 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ left: serverContextMenu.x, top: serverContextMenu.y }}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-neutral-200">
              <p className="font-bold text-neutral-900 text-sm truncate">{serverContextMenu.serverName}</p>
              <p className="text-xs text-neutral-500">Sunucu Ayarları</p>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  setShowAvatarUpload('server');
                  setServerContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-600 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Avatar Değiştir
              </button>
              <button
                onClick={() => {
                  loadMembersForManagement(serverContextMenu.serverId);
                  setServerContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-purple-50 hover:text-purple-600 transition-all"
              >
                <Users className="w-4 h-4" />
                Üyeleri Yönet
              </button>
              <button
                onClick={() => {
                  generateInvite();
                  setServerContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
              >
                <LinkIcon className="w-4 h-4" />
                Davet Linki Oluştur
              </button>
              <div className="h-px bg-neutral-200 my-1" />
              <button
                onClick={() => {
                  deleteServer(serverContextMenu.serverId);
                  setServerContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Sunucuyu Sil
              </button>
            </div>
          </div>
        </>
      )}

      {/* Kanal Sağ Tık Menüsü */}
      {channelContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setChannelContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-56 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ left: channelContextMenu.x, top: channelContextMenu.y }}
          >
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-neutral-200">
              <p className="font-bold text-neutral-900 text-sm truncate">#{channelContextMenu.channelName}</p>
              <p className="text-xs text-neutral-500">Kanal Ayarları</p>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  deleteChannel(channelContextMenu.channelId);
                  setChannelContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Kanalı Sil
              </button>
            </div>
          </div>
        </>
      )}

      {/* Üye Yönetim Modalı - Kapsamlı */}
      {showMembersModal && selectedServer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Crown className="w-7 h-7" />
                    Üye Yönetimi
                  </h2>
                  <p className="text-sm text-white/80 mt-1">{selectedServer.name} • {membersList.length} üye</p>
                </div>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Roller Açıklama */}
            <div className="px-6 py-4 bg-gradient-to-br from-purple-50 to-blue-50 border-b border-neutral-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="font-bold text-yellow-700">OWNER</p>
                    <p className="text-neutral-500">Tam yetki</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <Shield className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-bold text-red-700">ADMIN</p>
                    <p className="text-neutral-500">Yönetici</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="font-bold text-orange-700">MODERATOR</p>
                    <p className="text-neutral-500">Moderatör</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <Users className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="font-bold text-blue-700">MEMBER</p>
                    <p className="text-neutral-500">Üye</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="font-bold text-neutral-600">GUEST</p>
                    <p className="text-neutral-500">Misafir</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Üye Listesi */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {membersList.map((member) => {
                  const isCurrentUser = member.userId === user?.id;
                  const roleColors = {
                    OWNER: 'from-yellow-500 to-yellow-600',
                    ADMIN: 'from-red-500 to-red-600',
                    MODERATOR: 'from-orange-500 to-orange-600',
                    MEMBER: 'from-blue-500 to-blue-600',
                    GUEST: 'from-neutral-400 to-neutral-500',
                  };
                  const roleIcons = {
                    OWNER: <Crown className="w-4 h-4" />,
                    ADMIN: <Shield className="w-4 h-4" />,
                    MODERATOR: <UserCheck className="w-4 h-4" />,
                    MEMBER: <Users className="w-4 h-4" />,
                    GUEST: <Users className="w-4 h-4" />,
                  };

                  return (
                    <div
                      key={member.userId}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                          : 'bg-white border-neutral-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      {/* Kullanıcı Bilgisi */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${roleColors[member.role as keyof typeof roleColors] || roleColors.MEMBER} text-white flex items-center justify-center font-bold shadow-lg overflow-hidden`}>
                          {(() => {
                            const memberData = serverMembers.find(m => m.id === member.userId || m.userId === member.userId);
                            const avatarUrl = isCurrentUser ? user?.avatar : memberData?.avatar;
                            
                            if (avatarUrl) {
                              return <img src={resolveFileUrl(avatarUrl)} alt={member.username} className="w-full h-full object-cover" />;
                            }
                            return member.username.charAt(0).toUpperCase();
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-neutral-900">{member.username}</p>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                Sen
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            Katılma: {new Date(member.joinedAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      {/* Rol ve Aksiyonlar */}
                      <div className="flex items-center gap-3">
                        {/* Rol Seçici */}
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(selectedServer.id, member.userId, e.target.value)}
                          disabled={isCurrentUser || member.role === 'OWNER'}
                          className={`px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            member.role === 'OWNER'
                              ? 'bg-yellow-50 border-yellow-300 text-yellow-700 cursor-not-allowed'
                              : member.role === 'ADMIN'
                              ? 'bg-red-50 border-red-300 text-red-700 cursor-pointer hover:bg-red-100'
                              : member.role === 'MODERATOR'
                              ? 'bg-orange-50 border-orange-300 text-orange-700 cursor-pointer hover:bg-orange-100'
                              : member.role === 'MEMBER'
                              ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-pointer hover:bg-blue-100'
                              : 'bg-neutral-50 border-neutral-300 text-neutral-700 cursor-pointer hover:bg-neutral-100'
                          }`}
                        >
                          <option value="OWNER" disabled>👑 OWNER</option>
                          <option value="ADMIN">🛡️ ADMIN</option>
                          <option value="MODERATOR">⚔️ MODERATOR</option>
                          <option value="MEMBER">👤 MEMBER</option>
                          <option value="GUEST">🚶 GUEST</option>
                        </select>

                        {/* Rol İkonu */}
                        <div className="flex items-center gap-1">
                          {roleIcons[member.role as keyof typeof roleIcons]}
                        </div>

                        {/* At Butonu */}
                        {!isCurrentUser && member.role !== 'OWNER' && (
                          <button
                            onClick={() => kickMember(selectedServer.id, member.userId)}
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            title="Sunucudan At"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer - İstatistikler */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-neutral-600">Owner: {membersList.filter(m => m.role === 'OWNER').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-neutral-600">Admin: {membersList.filter(m => m.role === 'ADMIN').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-neutral-600">Mod: {membersList.filter(m => m.role === 'MODERATOR').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-neutral-600">Üye: {membersList.filter(m => m.role === 'MEMBER').length}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {showAvatarUpload === 'server' ? 'Sunucu Avatarı' : 'Profil Resmi'}
                  </h2>
                  <p className="text-sm text-white/80 mt-1">
                    JPG, PNG, GIF, WebP - Max 5MB
                  </p>
                </div>
                <button
                  onClick={() => setShowAvatarUpload(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                  disabled={uploadingAvatar}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <FileUpload
                onFileSelect={(file) => handleAvatarUpload(file, showAvatarUpload)}
                accept="image/*"
                disabled={uploadingAvatar}
              >
                <div className={`border-4 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  uploadingAvatar
                    ? 'border-neutral-300 bg-neutral-50 cursor-not-allowed'
                    : 'border-blue-300 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-500'
                }`}>
                  {uploadingAvatar ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-neutral-600 font-medium">Yükleniyor...</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-lg font-bold text-neutral-800 mb-2">
                        Avatar Seç
                      </p>
                      <p className="text-sm text-neutral-600 mb-4">
                        Tıklayın veya sürükleyin
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                        <span className="px-3 py-1 bg-white rounded-full border border-neutral-300">JPG</span>
                        <span className="px-3 py-1 bg-white rounded-full border border-neutral-300">PNG</span>
                        <span className="px-3 py-1 bg-white rounded-full border border-green-300 text-green-600 font-semibold">GIF ✨</span>
                        <span className="px-3 py-1 bg-white rounded-full border border-neutral-300">WebP</span>
                      </div>
                    </>
                  )}
                </div>
              </FileUpload>

              <button
                onClick={() => setShowAvatarUpload(null)}
                disabled={uploadingAvatar}
                className="w-full mt-4 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-semibold transition-all disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


