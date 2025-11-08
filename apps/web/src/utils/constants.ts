// API Configuration
export const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' 
  ? 'https://asforces.com' 
  : 'http://localhost:3000';

// WebRTC Configuration
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
};

// Audio Settings
export const AUDIO_MONITORING_CONFIG = {
  fftSize: 512,
  minDecibels: -100,
  maxDecibels: -10,
  smoothingTimeConstant: 0.2,
  updateInterval: 80, // ms
  speakingThreshold: 0.01,
};

// Screen Share Quality Settings
export const SCREEN_QUALITY_PRESETS = {
  '720p30': { width: 1280, height: 720, frameRate: 30, bitrate: 1500000 },
  '720p60': { width: 1280, height: 720, frameRate: 60, bitrate: 2500000 },
  '1080p30': { width: 1920, height: 1080, frameRate: 30, bitrate: 3000000 },
  '1080p60': { width: 1920, height: 1080, frameRate: 60, bitrate: 4500000 },
  '1440p30': { width: 2560, height: 1440, frameRate: 30, bitrate: 5000000 },
  '1440p60': { width: 2560, height: 1440, frameRate: 60, bitrate: 8000000 },
  '4k30': { width: 3840, height: 2160, frameRate: 30, bitrate: 12000000 },
};

// LocalStorage Keys
export const STORAGE_KEYS = {
  PUSH_TO_TALK: 'pushToTalk',
  PTT_KEY: 'pttKey',
  LAST_VOICE_CHANNEL: 'lastVoiceChannel',
  USER_VOLUME_SETTINGS: 'userVolumeSettings',
};

// Timeouts
export const TIMEOUTS = {
  VOICE_RECONNECT_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  TOAST_AUTO_DISMISS: 5000, // 5 seconds
};

