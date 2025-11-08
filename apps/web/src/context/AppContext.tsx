import React, { createContext, useContext, useState } from 'react';

// Types
export interface Server {
  id: string;
  name: string;
  icon?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  // State
  view: 'servers' | 'friends' | 'dm';
  servers: Server[];
  selectedServer: Server | null;
  channels: Channel[];
  selectedChannel: Channel | null;
  toasts: Toast[];
  showMobileMenu: boolean;
  showFriendsPanel: boolean;
  showDMPanel: boolean;
  showSettingsModal: boolean;
  
  // Actions
  setView: (view: 'servers' | 'friends' | 'dm') => void;
  setServers: React.Dispatch<React.SetStateAction<Server[]>>;
  setSelectedServer: (server: Server | null) => void;
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  setSelectedChannel: (channel: Channel | null) => void;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  setShowMobileMenu: (show: boolean) => void;
  setShowFriendsPanel: (show: boolean) => void;
  setShowDMPanel: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  
  // Methods
  showToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // State
  const [view, setView] = useState<'servers' | 'friends' | 'dm'>('servers');
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showDMPanel, setShowDMPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Methods
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const value: AppContextType = {
    // State
    view,
    servers,
    selectedServer,
    channels,
    selectedChannel,
    toasts,
    showMobileMenu,
    showFriendsPanel,
    showDMPanel,
    showSettingsModal,
    
    // Actions
    setView,
    setServers,
    setSelectedServer,
    setChannels,
    setSelectedChannel,
    setToasts,
    setShowMobileMenu,
    setShowFriendsPanel,
    setShowDMPanel,
    setShowSettingsModal,
    
    // Methods
    showToast,
    removeToast,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

