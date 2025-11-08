// packages/rtc/src/PeerConnection.ts

import { 
  RTCConfig, 
  RTCStats, 
  ConnectionState, 
  SignalingState,
  PeerConnectionEvents 
} from './types';

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private events: PeerConnectionEvents = {};
  private statsInterval: number | null = null;
  private remoteStream: MediaStream | null = null;
  private localStream: MediaStream | null = null;
  private config: RTCConfig;
  private peerId: string;

  constructor(peerId: string, config: RTCConfig, events?: PeerConnectionEvents) {
    this.peerId = peerId;
    this.config = config;
    this.events = events || {};
    
    // RTCPeerConnection oluştur
    this.pc = new RTCPeerConnection(config);
    this.setupEventHandlers();
  }

  /**
   * Event handler'ları kur
   */
  private setupEventHandlers(): void {
    // Bağlantı durumu değişiklikleri
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState as ConnectionState;
      console.log(`[RTC] Connection state: ${state}`);
      this.events.onConnectionStateChange?.(state);
      
      if (state === 'connected') {
        this.startStatsCollection();
      } else if (state === 'failed' || state === 'closed') {
        this.stopStatsCollection();
      }
    };

    // Signaling durumu değişiklikleri
    this.pc.onsignalingstatechange = () => {
      const state = this.pc.signalingState as SignalingState;
      console.log(`[RTC] Signaling state: ${state}`);
      this.events.onSignalingStateChange?.(state);
    };

    // ICE candidate'leri
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[RTC] New ICE candidate');
        this.events.onIceCandidate?.(event.candidate.toJSON());
      }
    };

    // Uzak track'ler (ses/video akışı)
    this.pc.ontrack = (event) => {
      console.log('[RTC] Remote track received:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      this.events.onTrack?.(event.track, this.remoteStream);
    };

    // Data channel
    this.pc.ondatachannel = (event) => {
      console.log('[RTC] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel();
      this.events.onDataChannel?.(this.dataChannel);
    };

    // ICE bağlantı durumu
    this.pc.oniceconnectionstatechange = () => {
      console.log(`[RTC] ICE connection state: ${this.pc.iceConnectionState}`);
    };
  }

  /**
   * Yerel akışı ekle
   */
  async addLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    stream.getTracks().forEach(track => {
      console.log(`[RTC] Adding local track: ${track.kind}`);
      this.pc.addTrack(track, stream);
    });
  }

  /**
   * Yerel akışı kaldır
   */
  removeLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        const sender = this.pc.getSenders().find(s => s.track === track);
        if (sender) {
          this.pc.removeTrack(sender);
        }
      });
      this.localStream = null;
    }
  }

  /**
   * SDP Offer oluştur (arayan taraf)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * SDP Answer oluştur (aranan taraf)
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Uzak SDP'yi ayarla
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(description);
  }

  /**
   * ICE candidate ekle
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
      console.log('[RTC] ICE candidate added successfully');
    } catch (error) {
      console.error('[RTC] Error adding ICE candidate:', error);
      this.events.onError?.(error as Error);
    }
  }

  /**
   * Data channel oluştur
   */
  createDataChannel(label = 'data'): RTCDataChannel {
    this.dataChannel = this.pc.createDataChannel(label, {
      ordered: true,
      maxRetransmits: 3,
    });
    
    this.setupDataChannel();
    return this.dataChannel;
  }

  /**
   * Data channel event handler'ları
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[RTC] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[RTC] Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('[RTC] Data channel error:', error);
    };
  }

  /**
   * Data gönder
   */
  sendData(data: string | ArrayBuffer): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
    } else {
      console.warn('[RTC] Data channel is not open');
    }
  }

  /**
   * İstatistikleri toplamaya başla
   */
  private startStatsCollection(): void {
    if (this.statsInterval) return;

    this.statsInterval = setInterval(async () => {
      const stats = await this.getStats();
      if (stats) {
        this.events.onStats?.(stats);
      }
    }, 1000);
  }

  /**
   * İstatistik toplamayı durdur
   */
  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Bağlantı istatistiklerini al
   */
  async getStats(): Promise<RTCStats | null> {
    try {
      const stats = await this.pc.getStats();
      let result: RTCStats = {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        jitter: 0,
        roundTripTime: 0,
        audioLevel: 0,
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          result.bytesReceived = report.bytesReceived || 0;
          result.packetsLost = report.packetsLost || 0;
          result.jitter = report.jitter || 0;
          result.audioLevel = report.audioLevel || 0;
        }
        
        if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          result.bytesSent = report.bytesSent || 0;
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          result.roundTripTime = report.currentRoundTripTime || 0;
        }
      });

      return result;
    } catch (error) {
      console.error('[RTC] Error getting stats:', error);
      return null;
    }
  }

  /**
   * Mevcut bağlantı durumunu al
   */
  getConnectionState(): ConnectionState {
    return this.pc.connectionState as ConnectionState;
  }

  /**
   * ICE bağlantı durumunu al
   */
  getIceConnectionState(): RTCIceConnectionState {
    return this.pc.iceConnectionState;
  }

  /**
   * Signaling durumunu al
   */
  getSignalingState(): SignalingState {
    return this.pc.signalingState as SignalingState;
  }

  /**
   * Uzak akışı al
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Yerel akışı al
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Peer ID'yi al
   */
  getPeerId(): string {
    return this.peerId;
  }

  /**
   * Bağlantıyı kapat ve temizle
   */
  close(): void {
    console.log('[RTC] Closing peer connection');
    
    this.stopStatsCollection();
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream = null;
    }
    
    this.pc.close();
  }

  /**
   * Bağlantıyı yeniden başlat
   */
  async restart(): Promise<void> {
    console.log('[RTC] Restarting connection');
    
    // Mevcut bağlantıyı kapat
    this.pc.close();
    
    // Yeni bağlantı oluştur
    this.pc = new RTCPeerConnection(this.config);
    this.setupEventHandlers();
    
    // Yerel akışı tekrar ekle
    if (this.localStream) {
      await this.addLocalStream(this.localStream);
    }
  }
}
