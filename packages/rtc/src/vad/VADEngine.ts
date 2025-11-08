/**
 * Voice Activity Detection (VAD) Engine
 * Detects speech in audio stream using energy-based detection
 */

export interface VADConfig {
  // Sensitivity (0-1, higher = more sensitive)
  sensitivity: number;
  // Sample rate (Hz)
  sampleRate: number;
  // Frame size (samples)
  frameSize: number;
  // Minimum speech duration (ms)
  minSpeechDuration: number;
  // Minimum silence duration (ms)
  minSilenceDuration: number;
  // Energy threshold multiplier
  energyThreshold: number;
}

export interface VADResult {
  isSpeaking: boolean;
  energy: number;
  confidence: number;
}

export class VADEngine {
  private config: VADConfig;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  
  private isSpeaking = false;
  private speechStartTime = 0;
  private silenceStartTime = 0;
  private energyHistory: number[] = [];
  private readonly historySize = 30;
  
  private callback: ((result: VADResult) => void) | null = null;

  constructor(config: Partial<VADConfig> = {}) {
    this.config = {
      sensitivity: config.sensitivity ?? 0.5,
      sampleRate: config.sampleRate ?? 16000,
      frameSize: config.frameSize ?? 512,
      minSpeechDuration: config.minSpeechDuration ?? 250,
      minSilenceDuration: config.minSilenceDuration ?? 200,
      energyThreshold: config.energyThreshold ?? 0.02,
    };
  }

  /**
   * Initialize VAD with audio stream
   */
  async init(stream: MediaStream, callback: (result: VADResult) => void): Promise<void> {
    this.callback = callback;
    this.mediaStream = stream;

    // Create audio context
    this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
    
    // Create analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;

    // Create script processor for audio processing
    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.config.frameSize,
      1,
      1
    );

    // Connect audio stream
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    // Process audio
    this.scriptProcessor.onaudioprocess = (event) => {
      this.processAudioFrame(event.inputBuffer);
    };
  }

  /**
   * Process audio frame for VAD
   */
  private processAudioFrame(buffer: AudioBuffer): void {
    const channelData = buffer.getChannelData(0);
    
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      const sample = channelData[i] ?? 0;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / channelData.length);
    
    // Normalize energy (0-1)
    const energy = Math.min(1, rms * 10);
    
    // Update energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Calculate adaptive threshold
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const threshold = this.config.energyThreshold * (1 - this.config.sensitivity) + avgEnergy * this.config.sensitivity;

    // Detect speech
    const now = Date.now();
    const wasSpeaking = this.isSpeaking;

    if (energy > threshold) {
      // Speech detected
      if (!this.isSpeaking) {
        if (this.speechStartTime === 0) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime >= this.config.minSpeechDuration) {
          this.isSpeaking = true;
          this.silenceStartTime = 0;
        }
      } else {
        // Continue speaking
        this.silenceStartTime = 0;
      }
    } else {
      // Silence detected
      if (this.isSpeaking) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= this.config.minSilenceDuration) {
          this.isSpeaking = false;
          this.speechStartTime = 0;
        }
      } else {
        // Reset speech start time
        this.speechStartTime = 0;
      }
    }

    // Calculate confidence
    const confidence = Math.min(1, Math.max(0, (energy - threshold) / threshold));

    // Emit result if state changed
    if (wasSpeaking !== this.isSpeaking || Math.abs(energy - (this.energyHistory[this.energyHistory.length - 2] || 0)) > 0.1) {
      this.callback?.({
        isSpeaking: this.isSpeaking,
        energy,
        confidence,
      });
    }
  }

  /**
   * Update VAD configuration
   */
  updateConfig(config: Partial<VADConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current VAD state
   */
  getState(): { isSpeaking: boolean; energy: number } {
    const currentEnergy = this.energyHistory[this.energyHistory.length - 1] || 0;
    return {
      isSpeaking: this.isSpeaking,
      energy: currentEnergy,
    };
  }

  /**
   * Cleanup VAD
   */
  destroy(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.callback = null;
    this.energyHistory = [];
    this.isSpeaking = false;
  }
}


