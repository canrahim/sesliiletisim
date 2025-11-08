// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

// Server & Channel Types
export interface Server {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  inviteCode: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  position: number;
  topic?: string;
  createdAt: Date;
}

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  STAGE = 'STAGE',
}

// Message Types
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: Date;
  editedAt?: Date;
  attachments?: Attachment[];
  mentions?: Mention[];
  replyTo?: string;
  pinned: boolean;
  type: MessageType;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
  JOIN = 'JOIN',
  LEAVE = 'LEAVE',
  PIN = 'PIN',
  CALL = 'CALL',
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  type: string;
  thumbnail?: string;
}

export interface Mention {
  id: string;
  type: 'user' | 'role' | 'everyone';
  position: [number, number];
}

// WebRTC Types
export interface RTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface TurnCredentials {
  username: string;
  password: string;
  ttl: number;
  urls: string[];
}

// WebSocket Events
export interface SocketEvents {
  // Client to Server
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: { channelId: string; content: string }) => void;
  'typing:start': (channelId: string) => void;
  'typing:stop': (channelId: string) => void;
  'voice:join': (channelId: string) => void;
  'voice:leave': () => void;
  'webrtc:offer': (data: { to: string; sdp: string }) => void;
  'webrtc:answer': (data: { to: string; sdp: string }) => void;
  'webrtc:ice-candidate': (data: { to: string; candidate: RTCIceCandidate }) => void;

  // Server to Client
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'message:received': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (messageId: string) => void;
  'typing:user': (data: { userId: string; channelId: string }) => void;
  'voice:user-joined': (userId: string) => void;
  'voice:user-left': (userId: string) => void;
  'webrtc:offer': (data: { from: string; sdp: string }) => void;
  'webrtc:answer': (data: { from: string; sdp: string }) => void;
  'webrtc:ice-candidate': (data: { from: string; candidate: RTCIceCandidate }) => void;
  'error': (error: { code: string; message: string }) => void;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Settings Types
export interface UserSettings {
  voiceSettings: VoiceSettings;
  notificationSettings: NotificationSettings;
  appearanceSettings: AppearanceSettings;
  privacySettings: PrivacySettings;
}

export interface VoiceSettings {
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  pushToTalk: boolean;
  pttKey: string;
  voiceActivation: boolean;
  vadSensitivity: number;
}

export interface NotificationSettings {
  desktopEnabled: boolean;
  messageNotifications: 'all' | 'mentions' | 'none';
  callNotifications: boolean;
  systemSounds: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  language: 'tr' | 'en';
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  allowDirectMessages: 'everyone' | 'friends' | 'none';
  readReceipts: boolean;
}
