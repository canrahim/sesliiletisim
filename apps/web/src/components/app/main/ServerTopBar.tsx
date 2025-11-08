import React from 'react';
import { Users, MessageSquare, LogOut, Plus, Settings } from 'lucide-react';
import { Server } from '../../../types';

interface ServerTopBarProps {
  servers: Server[];
  selectedServer: Server | null;
  user: any;
  showFriendsPanel: boolean;
  showDMPanel: boolean;
  onServerSelect: (server: Server) => void;
  onAddServer: () => void;
  onFriendsClick: () => void;
  onDMClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  resolveFileUrl: (url: string) => string;
}

export const ServerTopBar: React.FC<ServerTopBarProps> = ({
  servers,
  selectedServer,
  user,
  showFriendsPanel,
  showDMPanel,
  onServerSelect,
  onAddServer,
  onFriendsClick,
  onDMClick,
  onSettingsClick,
  onLogout,
  resolveFileUrl,
}) => {
  return (
    <div className="hidden lg:flex bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 border-b-2 border-blue-800 shadow-xl w-full">
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto flex-1">
        {/* Logo */}
        <div className="flex items-center gap-3 pr-4 border-r border-white/20">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/30 rounded-xl blur-md group-hover:blur-lg transition-all"></div>
            <div className="relative w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-xl">
              <span className="font-black text-xl bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">A</span>
            </div>
          </div>
        </div>
        
        {/* Server List */}
        <div className="flex gap-2 flex-1">
          {servers.map((server) => (
            <button
              key={server.id}
              onClick={() => onServerSelect(server)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 ${
                selectedServer?.id === server.id
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-md overflow-hidden ${
                selectedServer?.id === server.id 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                  : 'bg-white/20 text-white'
              }`}>
                {server.icon ? (
                  <img 
                    src={resolveFileUrl(server.icon)} 
                    alt={server.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  server.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-semibold text-sm whitespace-nowrap max-w-[120px] truncate">{server.name}</span>
            </button>
          ))}
          
          {/* Add Server */}
          <button
            onClick={onAddServer}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 border-2 border-dashed border-white/30"
          >
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm whitespace-nowrap">Sunucu Ekle</span>
          </button>
        </div>
        
        {/* Hızlı Erişim */}
        <div className="flex items-center gap-2 pl-4 border-l border-white/20">
          <a
            href="/"
            target="_blank"
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all hover:scale-110"
            title="Portal"
          >
            <span className="text-lg">🏠</span>
          </a>
          <button
            onClick={onFriendsClick}
            className={`p-2 rounded-lg transition-all hover:scale-110 ${
              showFriendsPanel ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Arkadaşlar"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={onDMClick}
            className={`p-2 rounded-lg transition-all hover:scale-110 ${
              showDMPanel ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Direkt Mesajlar"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
        
        {/* User & Logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/20">
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl hover:bg-white/20 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user?.avatar ? (
                <img 
                  src={resolveFileUrl(user.avatar)} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.username?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-white font-semibold text-sm">{user?.username}</span>
          </button>
          <button
            onClick={onLogout}
            className="p-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-lg transition-all duration-200 hover:scale-110"
            title="Çıkış Yap"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

