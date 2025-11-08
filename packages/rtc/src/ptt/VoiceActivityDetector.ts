// packages/rtc/src/ptt/VoiceActivityDetector.ts

/**
 * Voice Activity Detection (VAD) ayarları
 */
export interface VADOptions {
  enabled: boolean;
  sensitivity: number; // 0-100 (0: çok hassas, 100: az hassas)
  debounceTime: number; // ms - ses algılama için bekleme süresi
  releaseTime: number; // ms - sessizlik algılama için bekleme süresi
  minDecibels: number; // Minimum ses seviyesi (dB)
  smoothingTimeConstant: number; // 0-1 arası, ses analizi yumuşatma
}

/**
 * VAD olayları
 */
export interface VADEvents {
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onLevelUpdate?: (level: number) => void;
}

/**
 * Voice Activity Detector
 */
export class VoiceActivityDetector {
  private options: VADOptions;
  private events: VADEvents = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isActive: boolean = false;
  private voiceDetected: boolean = false;
  private silenceTimer: number | null = null;
  private voiceTimer: number | null = null;
  private animationFrame: number | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;

  // Varsayılan ayarlar
  static readonly DEFAULT_OPTIONS: VADOptions = {
    enabled: true,
    sensitivity: 50,
    debounceTime: 100,
    releaseTime: 300,
    minDecibels: -60,
    smoothingTimeConstant: 0.8,
  };

  constructor(options?: Partial<VADOptions>) {
    this.options = { ...VoiceActivityDetector.DEFAULT_OPTIONS, ...options };
  }

  /**
   * VAD'yi başlat
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.isActive) {
      console.warn('[VAD] Already active');
      return;
    }

    if (!this.options.enabled) {
      console.log('[VAD] Disabled');
      return;
    }

    try {
      // Audio context oluştur
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Analyser node oluştur
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.minDecibels = this.options.minDecibels;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;

      // Source node oluştur
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Frequency ve time data buffer'ları
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);

      // Script processor (deprecated ama hala çalışıyor)
      // TODO: AudioWorklet'e geç
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      this.processor.onaudioprocess = () => this.processAudio();
      
      // Bağlantıları kur
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isActive = true;
      this.startMonitoring();

      console.log('[VAD] Started');
    } catch (error) {
      console.error('[VAD] Failed to start:', error);
      throw error;
    }
  }

  /**
   * VAD'yi durdur
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.stopMonitoring();

    // Timer'ları temizle
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.voiceTimer) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = null;
    }

    // Audio node'ları kapat
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyData = null;
    this.timeData = null;
    this.isActive = false;
    this.voiceDetected = false;

    console.log('[VAD] Stopped');
  }

  /**
   * Ses işleme
   */
  private processAudio(): void {
    if (!this.analyser || !this.frequencyData) {
      return;
    }

    // Frequency data'yı al
    this.analyser.getByteFrequencyData(this.frequencyData);

    // Ses seviyesini hesapla
    const level = this.calculateAudioLevel();

    // Ses algılama eşiği
    const threshold = this.getThreshold();

    // Ses algılama
    if (level > threshold) {
      this.handleVoiceDetected();
    } else {
      this.handleSilenceDetected();
    }

    // Seviye güncelleme event'i
    this.events.onLevelUpdate?.(level);
  }

  /**
   * Ses seviyesini hesapla (0-100)
   */
  private calculateAudioLevel(): number {
    if (!this.frequencyData) {
      return 0;
    }

    // İnsan sesi frekans aralığı (85 Hz - 3000 Hz)
    // FFT bin hesabı: bin = frequency * fftSize / sampleRate
    const sampleRate = this.audioContext?.sampleRate || 48000;
    const binSize = sampleRate / (this.analyser?.fftSize || 2048);
    
    const minBin = Math.floor(85 / binSize);
    const maxBin = Math.ceil(3000 / binSize);

    let sum = 0;
    let count = 0;

    for (let i = minBin; i < maxBin && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
      count++;
    }

    if (count === 0) {
      return 0;
    }

    // Ortalama al ve 0-100 arasına normalize et
    const average = sum / count;
    return (average / 255) * 100;
  }

  /**
   * Hassasiyet eşiğini hesapla
   */
  private getThreshold(): number {
    // Sensitivity 0-100 arası (0: çok hassas, 100: az hassas)
    // Threshold 5-50 arası olacak
    return 5 + (this.options.sensitivity / 100) * 45;
  }

  /**
   * Ses algılandığında
   */
  private handleVoiceDetected(): void {
    // Silence timer'ı temizle
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Henüz ses algılanmadıysa ve debounce süresi dolmadıysa
    if (!this.voiceDetected && !this.voiceTimer) {
      this.voiceTimer = setTimeout(() => {
        if (!this.voiceDetected) {
          this.voiceDetected = true;
          this.events.onVoiceStart?.();
          console.log('[VAD] Voice detected');
        }
        this.voiceTimer = null;
      }, this.options.debounceTime);
    }
  }

  /**
   * Sessizlik algılandığında
   */
  private handleSilenceDetected(): void {
    // Voice timer'ı temizle
    if (this.voiceTimer) {
      clearTimeout(this.voiceTimer);
      this.voiceTimer = null;
    }

    // Ses algılandıysa ve release süresi dolmadıysa
    if (this.voiceDetected && !this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        if (this.voiceDetected) {
          this.voiceDetected = false;
          this.events.onVoiceEnd?.();
          console.log('[VAD] Voice ended');
        }
        this.silenceTimer = null;
      }, this.options.releaseTime);
    }
  }

  /**
   * Görsel monitoring başlat (opsiyonel)
   */
  private startMonitoring(): void {
    const monitor = () => {
      if (!this.isActive) {
        return;
      }

      // Analiz için time domain data kullanabilirsin
      if (this.analyser && this.timeData) {
        this.analyser.getByteTimeDomainData(this.timeData);
        // Time domain verisi ile ek analizler yapılabilir
      }

      this.animationFrame = requestAnimationFrame(monitor);
    };

    monitor();
  }

  /**
   * Görsel monitoring durdur
   */
  private stopMonitoring(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Event handler ekle
   */
  on<K extends keyof VADEvents>(event: K, handler: VADEvents[K]): void {
    this.events[event] = handler;
  }

  /**
   * Event handler kaldır
   */
  off<K extends keyof VADEvents>(event: K): void {
    delete this.events[event];
  }

  /**
   * Ayarları güncelle
   */
  updateOptions(options: Partial<VADOptions>): void {
    this.options = { ...this.options, ...options };

    // Analyser ayarlarını güncelle
    if (this.analyser) {
      this.analyser.minDecibels = this.options.minDecibels;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
    }

    console.log('[VAD] Options updated:', this.options);
  }

  /**
   * Mevcut ayarları al
   */
  getOptions(): VADOptions {
    return { ...this.options };
  }

  /**
   * Ses algılama durumu
   */
  isVoiceDetected(): boolean {
    return this.voiceDetected;
  }

  /**
   * VAD aktif mi?
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Temizleme
   */
  dispose(): void {
    this.stop();
    this.events = {};
  }
}

/**
 * Basit VAD alternatifi (Web Audio API olmadan)
 */
export class SimpleVAD {
  private threshold: number;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isActive: boolean = false;
  private callback: (active: boolean) => void;

  constructor(threshold: number = 10, callback: (active: boolean) => void) {
    this.threshold = threshold;
    this.callback = callback;
  }

  start(stream: MediaStream): void {
    if (this.isActive) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    source.connect(this.analyser);
    this.isActive = true;

    this.monitor();
  }

  private monitor(): void {
    if (!this.isActive || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
    this.callback(average > this.threshold);

    requestAnimationFrame(() => this.monitor());
  }

  stop(): void {
    this.isActive = false;
    this.analyser = null;
    this.dataArray = null;
  }
}
