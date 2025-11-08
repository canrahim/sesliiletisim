import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

// Types
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
  role?: string;
}

interface PresenceContextType {
  // State
  friends: Friend[];
  serverMembers: ServerMember[];
  
  // Refs
  presenceSocketRef: React.MutableRefObject<Socket | null>;
  hasRequestedInitialPresenceRef: React.MutableRefObject<boolean>;
  
  // Actions
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  setServerMembers: React.Dispatch<React.SetStateAction<ServerMember[]>>;
  
  // Methods
  loadFriends: () => Promise<void>;
  loadServerMembers: (serverId: string) => Promise<void>;
  requestPresenceForFriends: (friendList: Array<{ id: string }>) => void;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within PresenceProvider');
  }
  return context;
};

interface PresenceProviderProps {
  children: React.ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children }) => {
  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  
  // Refs
  const presenceSocketRef = useRef<Socket | null>(null);
  const hasRequestedInitialPresenceRef = useRef<boolean>(false);
  
  // Methods
  const loadFriends = useCallback(async () => {
    // Implementation will be in custom hook
    console.log('📦 Loading friends...');
  }, []);
  
  const loadServerMembers = useCallback(async (serverId: string) => {
    // Implementation will be in custom hook
    console.log('👥 Loading server members for:', serverId);
  }, []);
  
  const requestPresenceForFriends = useCallback((friendList: Array<{ id: string }>) => {
    // Implementation will be in custom hook
    console.log('⏳ Requesting presence for:', friendList.length, 'friends');
  }, []);
  
  const value: PresenceContextType = {
    // State
    friends,
    serverMembers,
    
    // Refs
    presenceSocketRef,
    hasRequestedInitialPresenceRef,
    
    // Actions
    setFriends,
    setServerMembers,
    
    // Methods
    loadFriends,
    loadServerMembers,
    requestPresenceForFriends,
  };
  
  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};

