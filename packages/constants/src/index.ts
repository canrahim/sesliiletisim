// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.asforces.com',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.asforces.com',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// App Configuration
export const APP_CONFIG = {
  NAME: 'AsforceS Voice',
  VERSION: '2.0.0',
  DESCRIPTION: 'Enterprise Voice Communication Platform',
  DEFAULT_LANGUAGE: 'tr',
  SUPPORTED_LANGUAGES: ['tr', 'en'],
  THEME: {
    DEFAULT: 'dark',
    OPTIONS: ['light', 'dark', 'auto'],
  },
} as const;

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  ICE_SERVERS: [
    { urls: 'stun:stun.asforces.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
  ICE_TRANSPORT_POLICY: 'all',
  BUNDLE_POLICY: 'max-bundle',
  RTCP_MUX_POLICY: 'require',
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  VIDEO_CONSTRAINTS: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
} as const;

// Voice Settings
export const VOICE_SETTINGS = {
  DEFAULT_INPUT_VOLUME: 100,
  DEFAULT_OUTPUT_VOLUME: 100,
  VAD_SENSITIVITY_DEFAULT: 50,
  PTT_RELEASE_DELAY: 250,
  AUDIO_BITRATE: 64000,
  OPUS_SETTINGS: {
    stereo: false,
    maxAverageBitrate: 96000,
    maxPlaybackRate: 48000,
    ptime: 20,
    useinbandfec: true,
    usedtx: true,
  },
} as const;

// Limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_USERNAME_LENGTH: 32,
  MIN_USERNAME_LENGTH: 3,
  MAX_SERVER_NAME_LENGTH: 100,
  MAX_CHANNEL_NAME_LENGTH: 50,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_SERVERS_PER_USER: 100,
  MAX_CHANNELS_PER_SERVER: 500,
  MAX_USERS_PER_VOICE_CHANNEL: 99,
  MAX_MESSAGES_PER_FETCH: 50,
} as const;

// Timeouts
export const TIMEOUTS = {
  CONNECTION_TIMEOUT: 10000,
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_DELAY: 30000,
  TYPING_INDICATOR_DURATION: 3000,
  MESSAGE_EDIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  SESSION_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
} as const;

// Regex Patterns
export const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,32}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  INVITE_CODE: /^[A-Za-z0-9]{6,10}$/,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Auth Errors (1xxx)
  INVALID_CREDENTIALS: 'AUTH_1001',
  EMAIL_NOT_VERIFIED: 'AUTH_1002',
  ACCOUNT_LOCKED: 'AUTH_1003',
  INVALID_TOKEN: 'AUTH_1004',
  SESSION_EXPIRED: 'AUTH_1005',
  
  // Validation Errors (2xxx)
  VALIDATION_ERROR: 'VAL_2001',
  INVALID_EMAIL: 'VAL_2002',
  INVALID_USERNAME: 'VAL_2003',
  INVALID_PASSWORD: 'VAL_2004',
  
  // Server Errors (3xxx)
  SERVER_NOT_FOUND: 'SRV_3001',
  NO_PERMISSION: 'SRV_3002',
  SERVER_FULL: 'SRV_3003',
  
  // Channel Errors (4xxx)
  CHANNEL_NOT_FOUND: 'CHN_4001',
  CHANNEL_FULL: 'CHN_4002',
  ALREADY_IN_CHANNEL: 'CHN_4003',
  
  // WebRTC Errors (5xxx)
  WEBRTC_ERROR: 'RTC_5001',
  MEDIA_ACCESS_DENIED: 'RTC_5002',
  CONNECTION_FAILED: 'RTC_5003',
  TURN_SERVER_ERROR: 'RTC_5004',
  
  // General Errors (9xxx)
  INTERNAL_ERROR: 'GEN_9001',
  RATE_LIMITED: 'GEN_9002',
  MAINTENANCE: 'GEN_9003',
} as const;

// Events
export const EVENTS = {
  // Auth Events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_REGISTER: 'auth:register',
  AUTH_VERIFY: 'auth:verify',
  
  // User Events
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_STATUS_CHANGE: 'user:status-change',
  
  // Server Events
  SERVER_CREATE: 'server:create',
  SERVER_UPDATE: 'server:update',
  SERVER_DELETE: 'server:delete',
  SERVER_JOIN: 'server:join',
  SERVER_LEAVE: 'server:leave',
  
  // Channel Events
  CHANNEL_CREATE: 'channel:create',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',
  
  // Message Events
  MESSAGE_CREATE: 'message:create',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_PIN: 'message:pin',
  
  // Voice Events
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_MUTE: 'voice:mute',
  VOICE_UNMUTE: 'voice:unmute',
  VOICE_DEAFEN: 'voice:deafen',
  VOICE_UNDEAFEN: 'voice:undeafen',
  
  // WebRTC Events
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice-candidate',
  WEBRTC_CONNECTED: 'webrtc:connected',
  WEBRTC_DISCONNECTED: 'webrtc:disconnected',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  SERVERS: '/servers',
  CHANNELS: '/channels',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  INVITE: '/invite',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'asforces_access_token',
  REFRESH_TOKEN: 'asforces_refresh_token',
  USER_SETTINGS: 'asforces_user_settings',
  THEME: 'asforces_theme',
  LANGUAGE: 'asforces_language',
  DEVICE_ID: 'asforces_device_id',
} as const;

// Permissions
export const PERMISSIONS = {
  // Server Permissions
  SERVER_CREATE: 'server.create',
  SERVER_DELETE: 'server.delete',
  SERVER_UPDATE: 'server.update',
  SERVER_INVITE: 'server.invite',
  
  // Channel Permissions
  CHANNEL_CREATE: 'channel.create',
  CHANNEL_DELETE: 'channel.delete',
  CHANNEL_UPDATE: 'channel.update',
  CHANNEL_VIEW: 'channel.view',
  
  // Message Permissions
  MESSAGE_SEND: 'message.send',
  MESSAGE_DELETE_OWN: 'message.delete.own',
  MESSAGE_DELETE_ALL: 'message.delete.all',
  MESSAGE_PIN: 'message.pin',
  
  // Voice Permissions
  VOICE_SPEAK: 'voice.speak',
  VOICE_VIDEO: 'voice.video',
  VOICE_SCREENSHARE: 'voice.screenshare',
  VOICE_PRIORITY: 'voice.priority',
  
  // User Management
  USER_KICK: 'user.kick',
  USER_BAN: 'user.ban',
  USER_MUTE: 'user.mute',
  USER_TIMEOUT: 'user.timeout',
  
  // Admin Permissions
  ADMIN_DASHBOARD: 'admin.dashboard',
  ADMIN_LOGS: 'admin.logs',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_SETTINGS: 'admin.settings',
} as const;
