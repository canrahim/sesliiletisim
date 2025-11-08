import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';

interface UserPresenceProps {
  userId: string;
  className?: string;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface PresenceData {
  userId: string;
  status: PresenceStatus;
  lastSeen?: string;
}

// Global presence manager to share socket connection
class PresenceManager {
  private static instance: PresenceManager;
  private socket: Socket | null = null;
  private presenceCache = new Map<string, PresenceData>();
  private listeners = new Map<string, Set<(data: PresenceData) => void>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  connect(token: string, userId: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' ? 'https://asforces.com' : 'http://localhost:3000')}/presence`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to presence gateway');
      this.updatePresence(userId, 'online');
      this.startHeartbeat(userId);
    });

    this.socket.on('presence-update', (data: PresenceData) => {
      this.presenceCache.set(data.userId, data);
      this.notifyListeners(data.userId, data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from presence gateway');
      this.stopHeartbeat();
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  private startHeartbeat(userId: string) {
    this.heartbeatInterval = setInterval(() => {
      this.updatePresence(userId, 'online');
    }, 60000); // Every minute
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  updatePresence(userId: string, status: PresenceStatus) {
    if (!this.socket?.connected) return;

    this.socket.emit('update-presence', { status });
    
    const data: PresenceData = { userId, status };
    this.presenceCache.set(userId, data);
    this.notifyListeners(userId, data);
  }

  subscribe(userId: string, callback: (data: PresenceData) => void) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(callback);

    // Request presence for this user
    if (this.socket?.connected) {
      this.socket.emit('get-presence', { userIds: [userId] });
    }

    // Return cached data immediately if available
    const cached = this.presenceCache.get(userId);
    if (cached) {
      callback(cached);
    }
  }

  unsubscribe(userId: string, callback: (data: PresenceData) => void) {
    const listeners = this.listeners.get(userId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(userId);
      }
    }
  }

  private notifyListeners(userId: string, data: PresenceData) {
    const listeners = this.listeners.get(userId);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  getPresence(userId: string): PresenceData | undefined {
    return this.presenceCache.get(userId);
  }
}

export const UserPresence: React.FC<UserPresenceProps> = ({ userId, className = '' }) => {
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const { token, user } = useAuthStore();
  const managerRef = useRef<PresenceManager>(PresenceManager.getInstance());

  useEffect(() => {
    if (!token || !user) return;

    const manager = managerRef.current;
    manager.connect(token, user.id);

    const handlePresenceUpdate = (data: PresenceData) => {
      setPresence(data);
    };

    manager.subscribe(userId, handlePresenceUpdate);

    return () => {
      manager.unsubscribe(userId, handlePresenceUpdate);
    };
  }, [token, user, userId]);

  if (!presence) {
    return <div className={`w-3 h-3 rounded-full bg-gray-600 ${className}`} />;
  }

  const statusColors: Record<PresenceStatus, string> = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-600',
  };

  return (
    <div
      className={`w-3 h-3 rounded-full ${statusColors[presence.status]} ${className}`}
      title={presence.status}
    />
  );
};

// Hook for managing current user's presence
export const usePresence = () => {
  const { token, user } = useAuthStore();
  const managerRef = useRef<PresenceManager>(PresenceManager.getInstance());

  useEffect(() => {
    if (!token || !user) return;

    const manager = managerRef.current;
    manager.connect(token, user.id);

    // Set initial presence
    manager.updatePresence(user.id, 'online');

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        manager.updatePresence(user.id, 'away');
      } else {
        manager.updatePresence(user.id, 'online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      manager.updatePresence(user.id, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [token, user]);

  const updatePresence = (status: PresenceStatus) => {
    if (!user) return;
    managerRef.current.updatePresence(user.id, status);
  };

  return { updatePresence };
};


