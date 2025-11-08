import React from 'react';
import { Hash, Volume2, Plus, X, MoreVertical } from 'lucide-react';
import { Channel, ServerMember, VoiceUser } from '../../../types';
import { VoiceControlPanel } from './VoiceControlPanel';

interface ChannelSidebarProps {
  selectedServer: any;
  channels: Channel[];
  selectedChannel: Channel | null;
  serverMembers: ServerMember[];
  voiceUsers: VoiceUser[];
  connectedVoiceChannelId: string | null;
  myAudioLevel: number;
  isMuted: boolean;
  isPushToTalkMode: boolean;
  pushToTalkActive: boolean;
  isDeafened: boolean;
  channelVoiceUsers: Record<string, any[]>;
  showMobileMenu: boolean;
  user: any;
  isVideoOn: boolean;
  onChannelSelect: (channel: Channel) => void;
  onVoiceChannelJoin: (channel: Channel) => void;
  onVoiceChannelLeave: () => void;
  onAddChannelClick: () => void;
  onChannelContextMenu: (channelId: string, channelName: string, x: number, y: number) => void;
  onUserContextMenu: (userId: string, username: string, x: number, y: number) => void;
  onCloseMobileMenu: () => void;
  onVideoToggle: () => void;
  showToast: (type: string, message: string) => void;
  resolveFileUrl: (url: string) => string;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  selectedServer,
  channels,
  selectedChannel,
  serverMembers,
  voiceUsers,
  connectedVoiceChannelId,
  myAudioLevel,
  isMuted,
  isPushToTalkMode,
  pushToTalkActive,
  isDeafened,
  channelVoiceUsers,
  showMobileMenu,
  user,
  isVideoOn,
  onChannelSelect,
  onVoiceChannelJoin,
  onVoiceChannelLeave,
  onAddChannelClick,
  onChannelContextMenu,
  onUserContextMenu,
  onCloseMobileMenu,
  onVideoToggle,
  showToast,
  resolveFileUrl,
}) => {
  const textChannels = channels.filter(ch => ch.type === 'TEXT');
  const voiceChannels = channels.filter(ch => ch.type === 'VOICE');
  
  return (
    <div className={`${showMobileMenu ? 'flex' : 'hidden lg:flex'} w-72 bg-white flex-col border-r border-neutral-200 shadow-lg fixed lg:static inset-y-0 left-0 z-40 lg:z-auto`}>
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md relative">
        <button 
          onClick={onCloseMobileMenu}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-xl truncate mb-1 pr-12 lg:pr-0">{selectedServer?.name || 'Sunucu Seç'}</h2>
        <p className="text-xs text-blue-100">{serverMembers.length} üye</p>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase">Metin Kanalları</h3>
            <button onClick={onAddChannelClick} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            {textChannels.map((channel) => (
              <div key={channel.id} className="relative group">
                <button
                  onClick={() => onChannelSelect(channel)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onChannelContextMenu(channel.id, channel.name, e.clientX, e.clientY);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    selectedChannel?.id === channel.id
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : 'text-neutral-700 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Hash className="w-5 h-5" />
                    <span className="font-medium truncate">{channel.name}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Channels */}
        {voiceChannels.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3">Sesli Kanallar</h3>
            <div className="space-y-2">
              {voiceChannels.map((channel) => {
                const isConnected = connectedVoiceChannelId === channel.id;
                const currentChannelUsers = isConnected 
                  ? voiceUsers.map(u => ({ 
                      id: u.userId, 
                      username: u.username, 
                      isMuted: u.isMuted, 
                      isSpeaking: u.isSpeaking,
                      hasScreenAudio: u.hasScreenAudio 
                    }))
                  : (channelVoiceUsers[channel.id] || []);
                
                return (
                  <div key={channel.id}>
                    <button
                      onClick={() => {
                        if (isConnected) {
                          onVoiceChannelLeave();
                        } else {
                          onVoiceChannelJoin(channel);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        isConnected ? 'bg-green-500 text-white shadow-lg' : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-5 h-5" />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {currentChannelUsers.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-white/20 rounded-full font-semibold">
                          {currentChannelUsers.length}
                        </span>
                      )}
                    </button>
                    
                    {/* Voice Users */}
                    {currentChannelUsers.length > 0 && (
                      <div className="ml-2 mt-2 space-y-1">
                        {currentChannelUsers.map((vu) => {
                          const isMe = vu.id === user?.id;
                          const voiceState = voiceUsers.find(u => u.userId === vu.id);
                          const currentIsSpeaking = isMe
                            ? (myAudioLevel > 0.01 && !isMuted && (!isPushToTalkMode || pushToTalkActive))
                            : (voiceState?.isSpeaking ?? vu.isSpeaking ?? false);
                          
                          return (
                            <div
                              key={vu.id}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onUserContextMenu(vu.id, vu.username, e.clientX, e.clientY);
                              }}
                              className={`group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all cursor-pointer ${
                                currentIsSpeaking ? 'bg-green-500/10' : 'hover:bg-neutral-100'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {(() => {
                                  const member = serverMembers.find(m => m.id === vu.id);
                                  const avatarUrl = isMe ? user?.avatar : member?.avatar;
                                  
                                  if (avatarUrl) {
                                    return <img src={resolveFileUrl(avatarUrl)} alt={vu.username} className="w-full h-full object-cover rounded-full" />;
                                  }
                                  return vu.username?.charAt(0).toUpperCase() || 'U';
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-neutral-800 truncate">
                                  {vu.username}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUserContextMenu(vu.id, vu.username, e.clientX, e.clientY);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200"
                              >
                                <MoreVertical className="w-4 h-4 text-neutral-600" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Voice Control Panel */}
      <VoiceControlPanel
        channels={channels}
        voiceUsers={voiceUsers}
        isVideoOn={isVideoOn}
        onVideoToggle={onVideoToggle}
        onLeaveChannel={onVoiceChannelLeave}
        showToast={showToast}
      />
      
      {/* User Profile Card */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
        <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
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
          <div className="flex-1 min-w-0">
            <div className="font-bold text-neutral-900 truncate">{user?.username}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
              <span className="text-xs text-green-600 font-medium">Çevrimiçi</span>
            </div>
          </div>
          <button
            onClick={onSettingsClick}
            className="p-2.5 bg-neutral-100 hover:bg-blue-500 text-neutral-600 hover:text-white rounded-xl transition-all hover:scale-110"
            title="Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

