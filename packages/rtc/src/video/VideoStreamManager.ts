/**
 * Video Stream Manager
 * Manages camera and screen sharing streams
 */

import EventEmitter from 'eventemitter3';

export interface VideoStreamOptions {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
  maxWidth?: number;
  maxHeight?: number;
  maxFrameRate?: number;
}

export interface ScreenShareOptions {
  audio?: boolean;
  video?: boolean | MediaTrackConstraints;
  systemAudio?: boolean; // Chrome/Edge only
}

export interface StreamInfo {
  id: string;
  type: 'camera' | 'screen';
  stream: MediaStream;
  active: boolean;
  deviceId?: string;
}

export class VideoStreamManager extends EventEmitter {
  private cameraStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private streams = new Map<string, StreamInfo>();

  /**
   * Get available video devices
   */
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('[VideoStreamManager] Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Start camera stream
   */
  async startCamera(options: VideoStreamOptions = {}): Promise<MediaStream> {
    try {
      if (this.cameraStream) {
        console.log('[VideoStreamManager] Camera already active');
        return this.cameraStream;
      }

      const constraints: MediaStreamConstraints = {
        video: options.video ?? {
          width: { ideal: options.maxWidth ?? 1280 },
          height: { ideal: options.maxHeight ?? 720 },
          frameRate: { ideal: options.maxFrameRate ?? 30 },
        },
        audio: options.audio ?? false,
      };

      this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

      const streamInfo: StreamInfo = {
        id: this.cameraStream.id,
        type: 'camera',
        stream: this.cameraStream,
        active: true,
      };

      this.streams.set(this.cameraStream.id, streamInfo);

      // Listen for track ended
      this.cameraStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          this.handleTrackEnded(this.cameraStream!.id, track);
        });
      });

      this.emit('camera-started', streamInfo);
      console.log('[VideoStreamManager] Camera started:', this.cameraStream.id);

      return this.cameraStream;
    } catch (error) {
      console.error('[VideoStreamManager] Failed to start camera:', error);
      throw error;
    }
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.streams.delete(this.cameraStream.id);
      
      this.emit('camera-stopped', this.cameraStream.id);
      console.log('[VideoStreamManager] Camera stopped');
      
      this.cameraStream = null;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(options: ScreenShareOptions = {}): Promise<MediaStream> {
    try {
      if (this.screenStream) {
        console.log('[VideoStreamManager] Screen share already active');
        return this.screenStream;
      }

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }

      const constraints: MediaStreamConstraints = {
        video: options.video ?? {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: options.audio ?? false,
      };

      // Chrome/Edge: Add system audio if requested
      if (options.systemAudio && 'audio' in constraints) {
        (constraints.audio as any) = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          systemAudio: 'include',
          surfaceSwitching: 'include',
          selfBrowserSurface: 'exclude',
        };
      }

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      const streamInfo: StreamInfo = {
        id: this.screenStream.id,
        type: 'screen',
        stream: this.screenStream,
        active: true,
      };

      this.streams.set(this.screenStream.id, streamInfo);

      // Listen for track ended (user clicked "Stop sharing")
      this.screenStream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
          this.stopScreenShare();
        });
      });

      this.emit('screen-started', streamInfo);
      console.log('[VideoStreamManager] Screen share started:', this.screenStream.id);

      return this.screenStream;
    } catch (error) {
      console.error('[VideoStreamManager] Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.streams.delete(this.screenStream.id);
      
      this.emit('screen-stopped', this.screenStream.id);
      console.log('[VideoStreamManager] Screen share stopped');
      
      this.screenStream = null;
    }
  }

  /**
   * Switch camera device
   */
  async switchCamera(deviceId: string): Promise<MediaStream> {
    const wasActive = !!this.cameraStream;
    
    if (wasActive) {
      this.stopCamera();
    }

    const stream = await this.startCamera({
      video: { deviceId: { exact: deviceId } },
    });

    return stream;
  }

  /**
   * Toggle camera on/off
   */
  toggleCamera(enabled: boolean): void {
    if (this.cameraStream) {
      this.cameraStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });

      this.emit('camera-toggled', enabled);
      console.log('[VideoStreamManager] Camera toggled:', enabled);
    }
  }

  /**
   * Toggle screen share audio
   */
  toggleScreenAudio(enabled: boolean): void {
    if (this.screenStream) {
      this.screenStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });

      this.emit('screen-audio-toggled', enabled);
      console.log('[VideoStreamManager] Screen audio toggled:', enabled);
    }
  }

  /**
   * Get current camera stream
   */
  getCameraStream(): MediaStream | null {
    return this.cameraStream;
  }

  /**
   * Get current screen stream
   */
  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Get all active streams
   */
  getAllStreams(): StreamInfo[] {
    return Array.from(this.streams.values());
  }

  /**
   * Get stream by ID
   */
  getStream(streamId: string): StreamInfo | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Check if camera is active
   */
  isCameraActive(): boolean {
    return this.cameraStream !== null && this.cameraStream.active;
  }

  /**
   * Check if screen share is active
   */
  isScreenShareActive(): boolean {
    return this.screenStream !== null && this.screenStream.active;
  }

  /**
   * Handle track ended event
   */
  private handleTrackEnded(streamId: string, track: MediaStreamTrack): void {
    console.log('[VideoStreamManager] Track ended:', track.kind, streamId);
    
    const streamInfo = this.streams.get(streamId);
    if (streamInfo) {
      streamInfo.active = false;
      this.emit('track-ended', { streamId, track: track.kind });
    }
  }

  /**
   * Apply video constraints (resolution, framerate)
   */
  async applyVideoConstraints(
    streamType: 'camera' | 'screen',
    constraints: MediaTrackConstraints
  ): Promise<void> {
    const stream = streamType === 'camera' ? this.cameraStream : this.screenStream;
    
    if (!stream) {
      throw new Error(`${streamType} stream is not active`);
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints(constraints);
      console.log('[VideoStreamManager] Applied constraints to', streamType);
    }
  }

  /**
   * Get current video settings
   */
  getVideoSettings(streamType: 'camera' | 'screen'): MediaTrackSettings | null {
    const stream = streamType === 'camera' ? this.cameraStream : this.screenStream;
    
    if (!stream) {
      return null;
    }

    const videoTrack = stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.getSettings() : null;
  }

  /**
   * Cleanup all streams
   */
  dispose(): void {
    this.stopCamera();
    this.stopScreenShare();
    this.streams.clear();
    this.removeAllListeners();
    console.log('[VideoStreamManager] Disposed');
  }
}


