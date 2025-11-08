// packages/rtc/src/MediaManager.ts

import { DeviceInfo, AudioSettings, MediaStreamConstraints } from './types';

export class MediaManager {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioSettings: AudioSettings = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  constructor(settings?: Partial<AudioSettings>) {
    if (settings) {
      this.audioSettings = { ...this.audioSettings, ...settings };
    }
  }

  /**
   * Cihazları listele
   */
  async getDevices(): Promise<{
    audioInputs: DeviceInfo[];
    audioOutputs: DeviceInfo[];
    videoInputs: DeviceInfo[];
  }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    const audioInputs = devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
        kind: 'audioinput' as const,
        groupId: device.groupId,
      }));

    const audioOutputs = devices
      .filter(device => device.kind === 'audiooutput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Speaker ${device.deviceId.slice(0, 5)}`,
        kind: 'audiooutput' as const,
        groupId: device.groupId,
      }));

    const videoInputs = devices
      .filter(device => device.kind === 'videoinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        kind: 'videoinput' as const,
        groupId: device.groupId,
      }));

    return { audioInputs, audioOutputs, videoInputs };
  }

  /**
   * Mikrofon akışını al
   */
  async getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: this.audioSettings.echoCancellation,
        noiseSuppression: this.audioSettings.noiseSuppression,
        autoGainControl: this.audioSettings.autoGainControl,
        sampleRate: 48000, // Opus için ideal
        channelCount: 2,
      },
      video: false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setupAudioAnalyser(this.localStream);
      return this.localStream;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Mikrofon erişimi başarısız: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Kamera akışını al
   */
  async getCameraStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Kamera erişimi başarısız: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ekran paylaşım akışını al
   */
  async getScreenStream(withAudio = false): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: withAudio,
      } as any);
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ekran paylaşımı başarısız: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ses seviyesi analizi için setup
   */
  private setupAudioAnalyser(stream: MediaStream): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    this.audioAnalyser = this.audioContext.createAnalyser();
    this.audioAnalyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.audioAnalyser);
  }

  /**
   * Ses seviyesini al (0-100 arası)
   */
  getAudioLevel(): number {
    if (!this.audioAnalyser) return 0;

    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return Math.min(100, Math.round((average / 255) * 100));
  }

  /**
   * Push-to-talk için mikrofonu aç/kapat
   */
  toggleMicrophone(enabled: boolean): void {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Kamerayı aç/kapat
   */
  toggleCamera(enabled: boolean): void {
    if (!this.localStream) return;

    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /**
   * Ses çıkış cihazını değiştir (sadece Chrome/Edge)
   */
  async setOutputDevice(deviceId: string, audioElement: HTMLAudioElement): Promise<void> {
    if ('setSinkId' in audioElement) {
      try {
        await (audioElement as any).setSinkId(deviceId);
      } catch (error) {
        console.error('Ses çıkış cihazı değiştirilemedi:', error);
        throw error;
      }
    } else {
      console.warn('Bu tarayıcı ses çıkış cihazı seçimini desteklemiyor');
    }
  }

  /**
   * Akışları temizle
   */
  dispose(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioAnalyser = null;
  }

  /**
   * Ses ayarlarını güncelle
   */
  updateAudioSettings(settings: Partial<AudioSettings>): void {
    this.audioSettings = { ...this.audioSettings, ...settings };
    
    // Mevcut akış varsa ayarları uygula
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.applyConstraints({
          echoCancellation: this.audioSettings.echoCancellation,
          noiseSuppression: this.audioSettings.noiseSuppression,
          autoGainControl: this.audioSettings.autoGainControl,
        });
      }
    }
  }

  /**
   * Mevcut akışı al
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Ses ayarlarını al
   */
  getAudioSettings(): AudioSettings {
    return { ...this.audioSettings };
  }
}
