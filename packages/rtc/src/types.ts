// packages/rtc/src/types.ts

export interface RTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  iceCandidatePoolSize?: number;
}

export interface RTCStats {
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  audioLevel: number;
}

export interface MediaStreamConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'peer-ready' | 'peer-left';
  from: string;
  to: string;
  data?: any;
}

export interface PTTKeybind {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

export interface VoiceCallOptions {
  pushToTalk?: boolean;
  vadEnabled?: boolean;
  vadSensitivity?: number;
  pttKeybind?: PTTKeybind;
  pttReleaseDelay?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

export type ConnectionState = 
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export type SignalingState = 
  | 'stable'
  | 'have-local-offer'
  | 'have-remote-offer'
  | 'have-local-pranswer'
  | 'have-remote-pranswer'
  | 'closed';

export interface PeerConnectionEvents {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onSignalingStateChange?: (state: SignalingState) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onTrack?: (track: MediaStreamTrack, stream: MediaStream) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onStats?: (stats: RTCStats) => void;
  onError?: (error: Error) => void;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
  groupId: string;
}

export interface AudioSettings {
  inputDeviceId?: string;
  outputDeviceId?: string;
  inputVolume?: number;
  outputVolume?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}
