// ============================================
// GLOBAL TYPES - Tüm Uygulama İçin
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  createdAt?: string;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  ownerId?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId?: string;
  user?: {
    id?: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
  isEdited?: boolean;
}

// ============================================
// VOICE TYPES
// ============================================

export interface VoiceUser {
  userId: string;
  username: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}

export interface RemoteUser {
  userId: string;
  username: string;
  stream?: MediaStream;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasScreenAudio?: boolean;
}

export type ScreenQuality = '720p30' | '720p60' | '1080p30' | '1080p60' | '1440p30' | '1440p60' | '4k30';

export interface ScreenShareSettings {
  quality: ScreenQuality;
  systemAudio: boolean;
}

// ============================================
// PRESENCE TYPES
// ============================================

export interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
}

export interface ServerMember {
  userId: string;
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
  role?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | 'GUEST';
  joinedAt?: string;
}

// ============================================
// UI TYPES
// ============================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface ContextMenu {
  userId: string;
  username: string;
  x: number;
  y: number;
}

export interface MessageContextMenu {
  messageId: string;
  isOwner: boolean;
  x: number;
  y: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export interface PeerJoinedEvent {
  peerId: string;
  username: string;
  shouldOffer: boolean;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  hasScreenAudio?: boolean;
}

export interface ScreenShareEvent {
  userId: string;
  username: string;
  channelId: string;
  hasAudio?: boolean;
}

export interface VoiceStateUpdate {
  channelId: string;
  users: VoiceUser[];
}

// ============================================
// FILE TYPES
// ============================================

export interface FileData {
  filename: string;
  url: string;
  mimetype?: string;
  size?: number;
  thumbnail?: string;
}

export type ParsedMessage =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'file';
      filename: string;
      url: string;
      mimetype?: string;
      size?: number;
      text?: string | null;
    };

