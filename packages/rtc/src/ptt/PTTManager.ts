// packages/rtc/src/ptt/PTTManager.ts

import EventEmitter from 'eventemitter3';
import { VADEngine, VADResult } from '../vad/VADEngine';

/**
 * PTT (Push-to-Talk) tuş kombinasyonu
 */
export interface PTTKeybind {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

/**
 * PTT ayarları
 */
export interface PTTSettings {
  enabled: boolean;
  keybind: PTTKeybind;
  releaseDelay?: number; // ms - tuş bırakıldıktan sonra beklenecek süre
  vadEnabled?: boolean; // Voice Activity Detection
  vadSensitivity?: number; // 0-100
  holdTime?: number; // Minimum basılı tutma süresi (ms)
}

/**
 * PTT durumu
 */
export interface PTTState {
  isTransmitting: boolean;
  isKeyPressed: boolean;
  vadActive: boolean;
  lastTransmitTime: number;
  totalTransmitTime: number;
}

/**
 * PTT olayları
 */
export interface PTTEvents {
  transmitStart: () => void;
  transmitStop: () => void;
  vadStateChange: (active: boolean) => void;
  keybindChange: (keybind: PTTKeybind) => void;
  error: (error: Error) => void;
}

/**
 * Push-to-Talk yöneticisi
 */
export class PTTManager extends EventEmitter {
  private settings: PTTSettings;
  private state: PTTState;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private mousedownHandler: ((e: MouseEvent) => void) | null = null;
  private mouseupHandler: ((e: MouseEvent) => void) | null = null;
  private releaseTimer: number | null = null;
  private holdTimer: number | null = null;
  private transmitStartTime: number = 0;
  private isListening: boolean = false;
  private vadEngine: VADEngine | null = null;
  private audioStream: MediaStream | null = null;

  // Varsayılan ayarlar
  static readonly DEFAULT_SETTINGS: PTTSettings = {
    enabled: true,
    keybind: {
      key: 'Space',
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    },
    releaseDelay: 200,
    vadEnabled: false,
    vadSensitivity: 50,
    holdTime: 100,
  };

  constructor(settings?: Partial<PTTSettings>) {
    super();
    this.settings = { ...PTTManager.DEFAULT_SETTINGS, ...settings };
    this.state = {
      isTransmitting: false,
      isKeyPressed: false,
      vadActive: false,
      lastTransmitTime: 0,
      totalTransmitTime: 0,
    };
  }

  /**
   * PTT dinlemeyi başlat
   */
  start(): void {
    if (this.isListening) {
      console.warn('[PTTManager] Already listening');
      return;
    }

    this.setupEventListeners();
    this.isListening = true;
    console.log('[PTTManager] Started listening');
  }

  /**
   * PTT dinlemeyi durdur
   */
  stop(): void {
    if (!this.isListening) {
      return;
    }

    this.removeEventListeners();
    this.stopTransmitting();
    this.isListening = false;
    console.log('[PTTManager] Stopped listening');
  }

  /**
   * Olay dinleyicilerini kur
   */
  private setupEventListeners(): void {
    // Keyboard handlers
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.settings.enabled) return;
      if (this.isKeybindMatch(e)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleKeyDown();
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (!this.settings.enabled) return;
      if (this.isKeybindMatch(e)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleKeyUp();
      }
    };

    // Mouse button support (optional)
    this.mousedownHandler = (e: MouseEvent) => {
      if (!this.settings.enabled) return;
      if (this.isMouseButtonMatch(e)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleKeyDown();
      }
    };

    this.mouseupHandler = (e: MouseEvent) => {
      if (!this.settings.enabled) return;
      if (this.isMouseButtonMatch(e)) {
        e.preventDefault();
        e.stopPropagation();
        this.handleKeyUp();
      }
    };

    // Global olarak dinle (window veya document)
    window.addEventListener('keydown', this.keydownHandler, true);
    window.addEventListener('keyup', this.keyupHandler, true);

    // Mouse button desteği
    if (this.settings.keybind.key.startsWith('Mouse')) {
      window.addEventListener('mousedown', this.mousedownHandler, true);
      window.addEventListener('mouseup', this.mouseupHandler, true);
    }

    // Focus kaybı durumunda transmit'i durdur
    window.addEventListener('blur', () => this.handleWindowBlur());
  }

  /**
   * Olay dinleyicilerini kaldır
   */
  private removeEventListeners(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }

    if (this.keyupHandler) {
      window.removeEventListener('keyup', this.keyupHandler, true);
      this.keyupHandler = null;
    }

    if (this.mousedownHandler) {
      window.removeEventListener('mousedown', this.mousedownHandler, true);
      this.mousedownHandler = null;
    }

    if (this.mouseupHandler) {
      window.removeEventListener('mouseup', this.mouseupHandler, true);
      this.mouseupHandler = null;
    }
  }

  /**
   * Klavye olayının keybind ile eşleşip eşleşmediğini kontrol et
   */
  private isKeybindMatch(e: KeyboardEvent): boolean {
    const keybind = this.settings.keybind;
    
    // Ana tuş kontrolü
    const keyMatch = e.code === keybind.key || e.key === keybind.key;
    
    // Modifier tuş kontrolü
    const modifiersMatch = 
      (!!keybind.ctrlKey === e.ctrlKey) &&
      (!!keybind.altKey === e.altKey) &&
      (!!keybind.shiftKey === e.shiftKey) &&
      (!!keybind.metaKey === e.metaKey);

    return keyMatch && modifiersMatch;
  }

  /**
   * Mouse olayının keybind ile eşleşip eşleşmediğini kontrol et
   */
  private isMouseButtonMatch(e: MouseEvent): boolean {
    const keybind = this.settings.keybind;
    
    // Mouse button mapping
    const buttonMap: { [key: string]: number } = {
      'Mouse1': 0, // Sol tık
      'Mouse2': 2, // Sağ tık
      'Mouse3': 1, // Orta tık
      'Mouse4': 3, // İleri
      'Mouse5': 4, // Geri
    };

    return keybind.key in buttonMap && e.button === buttonMap[keybind.key];
  }

  /**
   * Tuş basıldığında
   */
  private handleKeyDown(): void {
    if (this.state.isKeyPressed) {
      return; // Zaten basılı
    }

    console.log('[PTTManager] Key pressed');
    this.state.isKeyPressed = true;

    // Release timer'ı temizle
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    // Hold time kontrolü
    if (this.settings.holdTime && this.settings.holdTime > 0) {
      this.holdTimer = setTimeout(() => {
        this.startTransmitting();
        this.holdTimer = null;
      }, this.settings.holdTime) as unknown as number;
    } else {
      this.startTransmitting();
    }
  }

  /**
   * Tuş bırakıldığında
   */
  private handleKeyUp(): void {
    if (!this.state.isKeyPressed) {
      return;
    }

    console.log('[PTTManager] Key released');
    this.state.isKeyPressed = false;

    // Hold timer'ı temizle (henüz başlamamışsa)
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
      return; // Minimum süre dolmadı, transmit başlamadı
    }

    // Release delay varsa bekle
    if (this.settings.releaseDelay && this.settings.releaseDelay > 0) {
      this.releaseTimer = setTimeout(() => {
        if (!this.state.isKeyPressed) {
          this.stopTransmitting();
        }
        this.releaseTimer = null;
      }, this.settings.releaseDelay) as unknown as number;
    } else {
      this.stopTransmitting();
    }
  }

  /**
   * Pencere focus kaybettiğinde
   */
  private handleWindowBlur(): void {
    if (this.state.isKeyPressed) {
      console.log('[PTTManager] Window blur, stopping transmission');
      this.state.isKeyPressed = false;
      this.stopTransmitting();
    }
  }

  /**
   * İletimi başlat
   */
  private startTransmitting(): void {
    if (this.state.isTransmitting) {
      return;
    }

    console.log('[PTTManager] Starting transmission');
    this.state.isTransmitting = true;
    this.transmitStartTime = Date.now();
    this.emit('transmitStart');
  }

  /**
   * İletimi durdur
   */
  private stopTransmitting(): void {
    if (!this.state.isTransmitting) {
      return;
    }

    console.log('[PTTManager] Stopping transmission');
    this.state.isTransmitting = false;
    
    // İletim süresini kaydet
    if (this.transmitStartTime > 0) {
      const duration = Date.now() - this.transmitStartTime;
      this.state.totalTransmitTime += duration;
      this.state.lastTransmitTime = Date.now();
      this.transmitStartTime = 0;
    }

    this.emit('transmitStop');
  }

  /**
   * VAD durumunu güncelle
   */
  updateVADState(active: boolean): void {
    if (!this.settings.vadEnabled) {
      return;
    }

    const wasActive = this.state.vadActive;
    this.state.vadActive = active;

    if (wasActive !== active) {
      this.emit('vadStateChange', active);

      // VAD ile otomatik transmit kontrolü
      if (active && !this.state.isTransmitting && !this.state.isKeyPressed) {
        this.startTransmitting();
      } else if (!active && this.state.isTransmitting && !this.state.isKeyPressed) {
        // VAD deaktif ve tuş basılı değilse durdur
        this.stopTransmitting();
      }
    }
  }

  /**
   * Ayarları güncelle
   */
  updateSettings(settings: Partial<PTTSettings>): void {
    // const oldKeybind = this.settings.keybind; // TODO: Use this for rebinding check
    this.settings = { ...this.settings, ...settings };

    // Keybind değiştiyse listener'ları güncelle
    if (settings.keybind && this.isListening) {
      this.removeEventListeners();
      this.setupEventListeners();
      this.emit('keybindChange', this.settings.keybind);
    }

    console.log('[PTTManager] Settings updated:', this.settings);
  }

  /**
   * Mevcut ayarları al
   */
  getSettings(): PTTSettings {
    return { ...this.settings };
  }

  /**
   * Mevcut durumu al
   */
  getState(): PTTState {
    return { ...this.state };
  }

  /**
   * İletim durumunu al
   */
  isTransmitting(): boolean {
    return this.state.isTransmitting;
  }

  /**
   * Manuel olarak iletimi başlat/durdur
   */
  setTransmitting(transmit: boolean): void {
    if (transmit) {
      this.startTransmitting();
    } else {
      this.stopTransmitting();
    }
  }

  /**
   * Keybind'i metin olarak formatla
   */
  static formatKeybind(keybind: PTTKeybind): string {
    const parts: string[] = [];
    
    if (keybind.ctrlKey) parts.push('Ctrl');
    if (keybind.altKey) parts.push('Alt');
    if (keybind.shiftKey) parts.push('Shift');
    if (keybind.metaKey) parts.push('Meta');
    
    // Ana tuşu ekle
    let key = keybind.key;
    if (key === ' ') key = 'Space';
    parts.push(key);

    return parts.join('+');
  }

  /**
   * Keybind kaydetme modu
   */
  async recordKeybind(): Promise<PTTKeybind> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Recording timeout'));
      }, 10000); // 10 saniye timeout

      const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Modifier tuşları yoksay
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
          return;
        }

        const keybind: PTTKeybind = {
          key: e.code,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
        };

        cleanup();
        resolve(keybind);
      };

      const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Sadece yan tuşları kaydet (orta, ileri, geri)
        if (e.button > 0) {
          const buttonNames = ['', '', 'Mouse2', 'Mouse3', 'Mouse4', 'Mouse5'];
          const keybind: PTTKeybind = {
            key: buttonNames[e.button] || `Mouse${e.button}`,
          };

          cleanup();
          resolve(keybind);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('mousedown', handleMouseDown, true);
      };

      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('mousedown', handleMouseDown, true);
    });
  }

  /**
   * VAD başlat
   */
  async startVAD(stream: MediaStream): Promise<void> {
    if (!this.settings.vadEnabled) {
      console.log('[PTTManager] VAD is disabled');
      return;
    }

    if (this.vadEngine) {
      console.log('[PTTManager] VAD already running');
      return;
    }

    try {
      this.audioStream = stream;
      this.vadEngine = new VADEngine({
        sensitivity: (this.settings.vadSensitivity || 50) / 100,
        sampleRate: 16000,
        frameSize: 512,
        minSpeechDuration: 250,
        minSilenceDuration: 200,
        energyThreshold: 0.02,
      });

      await this.vadEngine.init(stream, (result: VADResult) => {
        this.updateVADState(result.isSpeaking);
      });

      console.log('[PTTManager] VAD started');
    } catch (error) {
      console.error('[PTTManager] Failed to start VAD:', error);
      this.emit('error', error instanceof Error ? error : new Error('Failed to start VAD'));
    }
  }

  /**
   * VAD durdur
   */
  stopVAD(): void {
    if (this.vadEngine) {
      this.vadEngine.destroy();
      this.vadEngine = null;
      this.audioStream = null;
      this.state.vadActive = false;
      console.log('[PTTManager] VAD stopped');
    }
  }

  /**
   * VAD sensitivity güncelle
   */
  updateVADSensitivity(sensitivity: number): void {
    if (this.vadEngine) {
      this.vadEngine.updateConfig({
        sensitivity: sensitivity / 100,
      });
    }
    this.settings.vadSensitivity = sensitivity;
  }

  /**
   * Temizleme
   */
  dispose(): void {
    this.stop();
    this.stopVAD();
    this.removeAllListeners();
    
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
}
