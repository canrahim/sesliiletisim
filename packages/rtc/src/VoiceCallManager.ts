// packages/rtc/src/VoiceCallManager.ts

import { Socket } from 'socket.io-client';
import { PeerConnection } from './PeerConnection';
import { MediaManager } from './MediaManager';
import { PTTManager, PTTKeybind, PTTSettings } from './ptt/PTTManager';
import { VoiceActivityDetector } from './ptt/VoiceActivityDetector';
import { 
  RTCConfig, 
  VoiceCallOptions, 
  SignalingMessage,
  ConnectionState,
  RTCStats 
} from './types';

interface VoiceCallEvents {
  onPeerJoined?: (peerId: string) => void;
  onPeerLeft?: (peerId: string) => void;
  onConnectionStateChange?: (peerId: string, state: ConnectionState) => void;
  onStats?: (peerId: string, stats: RTCStats) => void;
  onError?: (error: Error) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onTransmitStart?: () => void;
  onTransmitStop?: () => void;
  onVADStateChange?: (active: boolean) => void;
  onAudioLevelUpdate?: (level: number) => void;
}

export class VoiceCallManager {
  private socket: Socket | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private mediaManager: MediaManager;
  private pttManager: PTTManager | null = null;
  private vadDetector: VoiceActivityDetector | null = null;
  private localStream: MediaStream | null = null;
  private rtcConfig: RTCConfig;
  private events: VoiceCallEvents = {};
  private roomId: string | null = null;
  private userId: string | null = null;
  private options: VoiceCallOptions;
  private isInitialized = false;
  private audioLevelInterval: number | null = null;

  constructor(options?: VoiceCallOptions) {
    this.options = {
      pushToTalk: false,
      vadEnabled: false,
      vadSensitivity: 50,
      pttKeybind: { key: 'Space' },
      pttReleaseDelay: 200,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2,
      ...options,
    };

    this.mediaManager = new MediaManager({
      echoCancellation: this.options.echoCancellation,
      noiseSuppression: this.options.noiseSuppression,
      autoGainControl: this.options.autoGainControl,
    });

    // Varsayılan RTC config (STUN sunucuları)
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
    };

    // PTT Manager başlat
    if (this.options.pushToTalk) {
      this.initializePTT();
    }
  }

  /**
   * PTT Manager'ı başlat
   */
  private initializePTT(): void {
    this.pttManager = new PTTManager({
      enabled: this.options.pushToTalk,
      keybind: this.options.pttKeybind || { key: 'Space' },
      releaseDelay: this.options.pttReleaseDelay || 200,
      vadEnabled: this.options.vadEnabled,
      vadSensitivity: this.options.vadSensitivity,
    });

    // PTT olaylarını dinle
    this.pttManager.on('transmitStart', () => {
      console.log('[VoiceCall] PTT transmit started');
      this.setMicrophoneEnabled(true);
      this.broadcastPTTState(true);
      this.events.onTransmitStart?.();
    });

    this.pttManager.on('transmitStop', () => {
      console.log('[VoiceCall] PTT transmit stopped');
      this.setMicrophoneEnabled(false);
      this.broadcastPTTState(false);
      this.events.onTransmitStop?.();
    });

    this.pttManager.on('vadStateChange', (active: boolean) => {
      console.log('[VoiceCall] VAD state:', active);
      this.events.onVADStateChange?.(active);
    });

    this.pttManager.start();
  }

  /**
   * VAD'yi başlat
   */
  private async initializeVAD(stream: MediaStream): Promise<void> {
    if (!this.options.vadEnabled) return;

    this.vadDetector = new VoiceActivityDetector({
      enabled: true,
      sensitivity: this.options.vadSensitivity || 50,
      debounceTime: 100,
      releaseTime: 300,
    });

    // VAD olaylarını dinle
    this.vadDetector.on('onVoiceStart', () => {
      if (this.pttManager) {
        this.pttManager.updateVADState(true);
      }
    });

    this.vadDetector.on('onVoiceEnd', () => {
      if (this.pttManager) {
        this.pttManager.updateVADState(false);
      }
    });

    this.vadDetector.on('onLevelUpdate', (level: number) => {
      this.events.onAudioLevelUpdate?.(level);
    });

    await this.vadDetector.start(stream);
  }

  /**
   * PTT durumunu yayınla
   */
  private broadcastPTTState(transmitting: boolean): void {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('ptt-state', {
      roomId: this.roomId,
      userId: this.userId,
      transmitting,
    });
  }

  /**
   * Socket.io bağlantısını başlat
   */
  async initialize(socket: Socket, userId: string): Promise<void> {
    if (this.isInitialized) {
      console.warn('[VoiceCall] Already initialized');
      return;
    }

    this.socket = socket;
    this.userId = userId;
    this.setupSocketHandlers();
    this.isInitialized = true;
    
    console.log('[VoiceCall] Initialized with user:', userId);
  }

  /**
   * Event handler ekle
   */
  on<K extends keyof VoiceCallEvents>(event: K, handler: VoiceCallEvents[K]): void {
    this.events[event] = handler;
  }

  /**
   * Socket.io event handler'ları
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Yeni peer katıldığında
    this.socket.on('peer-joined', async (data: { peerId: string; shouldOffer: boolean }) => {
      console.log('[VoiceCall] Peer joined:', data.peerId);
      
      // Yeni peer bağlantısı oluştur
      const pc = await this.createPeerConnection(data.peerId);
      
      // Offer göndereceksek
      if (data.shouldOffer) {
        const offer = await pc.createOffer();
        this.sendSignal({
          type: 'offer',
          from: this.userId!,
          to: data.peerId,
          data: offer,
        });
      }
      
      this.events.onPeerJoined?.(data.peerId);
    });

    // Peer ayrıldığında
    this.socket.on('peer-left', (data: { peerId: string }) => {
      console.log('[VoiceCall] Peer left:', data.peerId);
      this.removePeer(data.peerId);
      this.events.onPeerLeft?.(data.peerId);
    });

    // Signaling mesajı geldiğinde
    this.socket.on('signal', async (message: SignalingMessage) => {
      await this.handleSignal(message);
    });

    // ICE sunucuları güncellemesi
    this.socket.on('ice-servers', (servers: RTCIceServer[]) => {
      console.log('[VoiceCall] Updated ICE servers');
      this.rtcConfig.iceServers = servers;
    });

    // PTT durumu güncellemesi
    this.socket.on('peer-ptt-state', (data: { peerId: string; transmitting: boolean }) => {
      console.log(`[VoiceCall] Peer ${data.peerId} PTT state: ${data.transmitting}`);
      // Frontend'de görsel güncelleme için kullanılabilir
    });
  }

  /**
   * Signaling mesajını işle
   */
  private async handleSignal(message: SignalingMessage): Promise<void> {
    console.log(`[VoiceCall] Received ${message.type} from ${message.from}`);
    
    let pc = this.peers.get(message.from);
    
    // Peer yoksa ve offer/answer geliyorsa oluştur
    if (!pc && (message.type === 'offer' || message.type === 'answer')) {
      pc = await this.createPeerConnection(message.from);
    }
    
    if (!pc) {
      console.warn(`[VoiceCall] No peer connection for ${message.from}`);
      return;
    }

    try {
      switch (message.type) {
        case 'offer':
          await pc.setRemoteDescription(message.data);
          const answer = await pc.createAnswer();
          this.sendSignal({
            type: 'answer',
            from: this.userId!,
            to: message.from,
            data: answer,
          });
          break;
          
        case 'answer':
          await pc.setRemoteDescription(message.data);
          break;
          
        case 'ice-candidate':
          await pc.addIceCandidate(message.data);
          break;
      }
    } catch (error) {
      console.error('[VoiceCall] Error handling signal:', error);
      this.events.onError?.(error as Error);
    }
  }

  /**
   * Signaling mesajı gönder
   */
  private sendSignal(message: SignalingMessage): void {
    if (!this.socket) {
      console.error('[VoiceCall] Socket not initialized');
      return;
    }
    
    this.socket.emit('signal', message);
  }

  /**
   * Peer bağlantısı oluştur
   */
  private async createPeerConnection(peerId: string): Promise<PeerConnection> {
    console.log('[VoiceCall] Creating peer connection for:', peerId);
    
    const pc = new PeerConnection(peerId, this.rtcConfig, {
      onConnectionStateChange: (state) => {
        console.log(`[VoiceCall] Connection state for ${peerId}: ${state}`);
        this.events.onConnectionStateChange?.(peerId, state);
        
        // Bağlantı başarısız olursa yeniden dene
        if (state === 'failed') {
          this.handleConnectionFailure(peerId);
        }
      },
      onIceCandidate: (candidate) => {
        this.sendSignal({
          type: 'ice-candidate',
          from: this.userId!,
          to: peerId,
          data: candidate,
        });
      },
      onTrack: (track, stream) => {
        console.log(`[VoiceCall] Received ${track.kind} track from ${peerId}`);
        this.events.onRemoteStream?.(peerId, stream);
      },
      onStats: (stats) => {
        this.events.onStats?.(peerId, stats);
      },
      onError: (error) => {
        console.error(`[VoiceCall] Peer ${peerId} error:`, error);
        this.events.onError?.(error);
      },
    });
    
    // Yerel akışı ekle
    if (this.localStream) {
      await pc.addLocalStream(this.localStream);
    }
    
    // Data channel oluştur
    pc.createDataChannel('voice-data');
    
    this.peers.set(peerId, pc);
    return pc;
  }

  /**
   * Bağlantı hatası durumunda
   */
  private async handleConnectionFailure(peerId: string): Promise<void> {
    console.log(`[VoiceCall] Attempting to restart connection with ${peerId}`);
    
    const pc = this.peers.get(peerId);
    if (!pc) return;
    
    try {
      await pc.restart();
      
      // Yeni offer gönder
      const offer = await pc.createOffer();
      this.sendSignal({
        type: 'offer',
        from: this.userId!,
        to: peerId,
        data: offer,
      });
    } catch (error) {
      console.error('[VoiceCall] Failed to restart connection:', error);
      this.removePeer(peerId);
    }
  }

  /**
   * Ses odasına katıl
   */
  async joinVoiceChannel(roomId: string, channelId: string): Promise<void> {
    if (!this.socket || !this.userId) {
      throw new Error('Not initialized');
    }
    
    console.log(`[VoiceCall] Joining voice channel: ${channelId} in room: ${roomId}`);
    
    // Mikrofon iznini al ve akışı başlat
    try {
      this.localStream = await this.mediaManager.getMicrophoneStream();
      this.events.onLocalStream?.(this.localStream);
      
      // VAD'yi başlat
      if (this.options.vadEnabled) {
        await this.initializeVAD(this.localStream);
      }
      
      // Mevcut peer'lara akışı ekle
      for (const pc of this.peers.values()) {
        await pc.addLocalStream(this.localStream);
      }
      
      // Sunucuya katılım mesajı gönder
      this.socket.emit('join-voice', { roomId, channelId });
      this.roomId = roomId;
      
      // Push-to-talk modundaysa mikrofonu kapat
      if (this.options.pushToTalk) {
        this.setMicrophoneEnabled(false);
      }
      
      // Ses seviyesi izlemeyi başlat
      this.startAudioLevelMonitoring();
    } catch (error) {
      console.error('[VoiceCall] Failed to join voice channel:', error);
      throw error;
    }
  }

  /**
   * Ses odasından ayrıl
   */
  async leaveVoiceChannel(): Promise<void> {
    if (!this.socket || !this.roomId) return;
    
    console.log('[VoiceCall] Leaving voice channel');
    
    // Sunucuya ayrılma mesajı gönder
    this.socket.emit('leave-voice', { roomId: this.roomId });
    
    // Tüm peer bağlantılarını kapat
    for (const [_peerId, pc] of this.peers) {
      pc.close();
    }
    this.peers.clear();
    
    // VAD'yi durdur
    if (this.vadDetector) {
      this.vadDetector.stop();
    }
    
    // Ses seviyesi izlemeyi durdur
    this.stopAudioLevelMonitoring();
    
    // Yerel akışı durdur
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.roomId = null;
  }

  /**
   * Mikrofonu aç/kapat
   */
  setMicrophoneEnabled(enabled: boolean): void {
    this.mediaManager.toggleMicrophone(enabled);
  }

  /**
   * Push-to-talk tuşu basıldığında
   */
  startPushToTalk(): void {
    if (this.pttManager) {
      this.pttManager.setTransmitting(true);
    } else if (this.options.pushToTalk) {
      this.setMicrophoneEnabled(true);
      this.broadcastPTTState(true);
    }
  }

  /**
   * Push-to-talk tuşu bırakıldığında
   */
  stopPushToTalk(): void {
    if (this.pttManager) {
      this.pttManager.setTransmitting(false);
    } else if (this.options.pushToTalk) {
      this.setMicrophoneEnabled(false);
      this.broadcastPTTState(false);
    }
  }

  /**
   * Ses seviyesi izlemeyi başlat
   */
  private startAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) return;

    this.audioLevelInterval = setInterval(() => {
      const level = this.getAudioLevel();
      this.events.onAudioLevelUpdate?.(level);
    }, 100) as unknown as number;
  }

  /**
   * Ses seviyesi izlemeyi durdur
   */
  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }

  /**
   * Ses seviyesini al
   */
  getAudioLevel(): number {
    return this.mediaManager.getAudioLevel();
  }

  /**
   * Cihaz listesini al
   */
  async getDevices() {
    return this.mediaManager.getDevices();
  }

  /**
   * Ses giriş cihazını değiştir
   */
  async changeAudioInputDevice(deviceId: string): Promise<void> {
    const stream = await this.mediaManager.getMicrophoneStream(deviceId);
    this.localStream = stream;
    
    // Tüm peer'lara yeni akışı ekle
    for (const pc of this.peers.values()) {
      pc.removeLocalStream();
      await pc.addLocalStream(stream);
    }
    
    this.events.onLocalStream?.(stream);
  }

  /**
   * Ses çıkış cihazını değiştir
   */
  async changeAudioOutputDevice(deviceId: string, audioElement: HTMLAudioElement): Promise<void> {
    await this.mediaManager.setOutputDevice(deviceId, audioElement);
  }

  /**
   * Peer'ı kaldır
   */
  private removePeer(peerId: string): void {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
  }

  /**
   * Mevcut peer'ları al
   */
  getPeers(): string[] {
    return Array.from(this.peers.keys());
  }

  /**
   * Belirli bir peer'ın bağlantı durumunu al
   */
  getPeerConnectionState(peerId: string): ConnectionState | null {
    const pc = this.peers.get(peerId);
    return pc ? pc.getConnectionState() : null;
  }

  /**
   * Push-to-talk modunu değiştir
   */
  setPushToTalkMode(enabled: boolean): void {
    this.options.pushToTalk = enabled;
    
    // PTT Manager'ı güncelle veya oluştur
    if (enabled) {
      if (!this.pttManager) {
        this.initializePTT();
      } else {
        this.pttManager.updateSettings({ enabled: true });
      }
      this.setMicrophoneEnabled(false);
    } else {
      if (this.pttManager) {
        this.pttManager.updateSettings({ enabled: false });
      }
      this.setMicrophoneEnabled(true);
    }
  }

  /**
   * PTT keybind'ı güncelle
   */
  setPTTKeybind(keybind: PTTKeybind): void {
    this.options.pttKeybind = keybind;
    if (this.pttManager) {
      this.pttManager.updateSettings({ keybind });
    }
  }

  /**
   * PTT keybind kaydetme modunu başlat
   */
  async recordPTTKeybind(): Promise<PTTKeybind> {
    if (!this.pttManager) {
      this.pttManager = new PTTManager();
    }
    return this.pttManager.recordKeybind();
  }

  /**
   * VAD duyarlılığını güncelle
   */
  setVADSensitivity(sensitivity: number): void {
    this.options.vadSensitivity = sensitivity;
    if (this.vadDetector) {
      this.vadDetector.updateOptions({ sensitivity });
    }
    if (this.pttManager) {
      this.pttManager.updateSettings({ vadSensitivity: sensitivity });
    }
  }

  /**
   * VAD modunu değiştir
   */
  setVADEnabled(enabled: boolean): void {
    this.options.vadEnabled = enabled;
    
    if (enabled && this.localStream) {
      if (!this.vadDetector) {
        this.initializeVAD(this.localStream);
      }
    } else if (!enabled && this.vadDetector) {
      this.vadDetector.stop();
      this.vadDetector = null;
    }
    
    if (this.pttManager) {
      this.pttManager.updateSettings({ vadEnabled: enabled });
    }
  }

  /**
   * PTT durumunu al
   */
  getPTTState() {
    return this.pttManager?.getState() || {
      isTransmitting: false,
      isKeyPressed: false,
      vadActive: false,
      lastTransmitTime: 0,
      totalTransmitTime: 0,
    };
  }

  /**
   * PTT ayarlarını al
   */
  getPTTSettings(): PTTSettings | null {
    return this.pttManager?.getSettings() || null;
  }

  /**
   * Ses ayarlarını güncelle
   */
  updateAudioSettings(settings: Partial<VoiceCallOptions>): void {
    this.options = { ...this.options, ...settings };
    
    this.mediaManager.updateAudioSettings({
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
    });
  }

  /**
   * Temizle ve kapat
   */
  dispose(): void {
    // Tüm peer'ları kapat
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
    
    // Media manager'ı temizle
    this.mediaManager.dispose();
    
    // PTT Manager'ı temizle
    if (this.pttManager) {
      this.pttManager.dispose();
      this.pttManager = null;
    }
    
    // VAD'yi temizle
    if (this.vadDetector) {
      this.vadDetector.dispose();
      this.vadDetector = null;
    }
    
    // Ses seviyesi izlemeyi durdur
    this.stopAudioLevelMonitoring();
    
    // Socket handler'ları kaldır
    if (this.socket) {
      this.socket.off('peer-joined');
      this.socket.off('peer-left');
      this.socket.off('signal');
      this.socket.off('ice-servers');
      this.socket.off('peer-ptt-state');
    }
    
    this.socket = null;
    this.localStream = null;
    this.roomId = null;
    this.userId = null;
    this.isInitialized = false;
  }
}
