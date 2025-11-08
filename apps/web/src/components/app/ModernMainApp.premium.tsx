import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Settings, Users, LogOut, Link as LinkIcon, Hash, Volume2, Send, Plus, Menu, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';
import { serversApi } from '../../api/endpoints/servers';
import { channelsApi } from '../../api/endpoints/channels';
import { messagesApi } from '../../api/endpoints/messages';
import { FriendsSidebar } from './FriendsSidebar';
import { FriendsView } from './FriendsView';
import { DirectMessagesView } from './DirectMessagesView';
import { ToastContainer } from '../ui/Toast';
import { ServerInviteModal } from './ServerInviteModal';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateServerModal } from './CreateServerModal';

interface Server {
  id: string;
  name: string;
  icon?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  channelId?: string;
  user: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' 
  ? 'https://asforces.com' 
  : 'http://localhost:3000';

export const ModernMainApp: React.FC = () => {
  const { user, logout, accessToken } = useAuthStore();
  const [view, setView] = useState<'servers' | 'friends' | 'dm'>('servers');
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Voice & Members
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<Array<{ userId: string; username: string }>>([]);
  const [serverMembers, setServerMembers] = useState<Array<{ userId: string; username: string; displayName?: string; isOnline: boolean }>>([]);
  
  // Modals
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDescription, setNewServerDescription] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChannelIdRef = useRef<string | null>(null);

  useEffect(() => { loadServers(); }, []);
  useEffect(() => { if (selectedServer) { loadChannels(selectedServer.id); loadServerMembers(selectedServer.id); } }, [selectedServer]);

  // WebSocket initialization
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${API_BASE}/messages`, { auth: { token: accessToken }, transports: ['websocket'], withCredentials: true });
    socketRef.current = socket;
    socket.on('connect', () => { console.log('✅ Connected'); if (currentChannelIdRef.current) socket.emit('join-channel', { channelId: currentChannelIdRef.current }); });
    socket.on('new-message', (message: Message) => { if (currentChannelIdRef.current === message.channelId) setMessages((prev) => prev.some(m => m.id === message.id) ? prev : [...prev, message]); });
    socket.on('message-deleted', ({ messageId }: { messageId: string }) => setMessages((prev) => prev.filter((m) => m.id !== messageId)));
    return () => { socket.disconnect(); };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedServer) return;
    const presenceSocket = io(`${API_BASE}/presence`, { auth: { token: accessToken }, transports: ['websocket'], withCredentials: true });
    presenceSocketRef.current = presenceSocket;
    presenceSocket.on('presence-update', ({ userId, status }: any) => {
      const isOnline = typeof status === 'string' ? status === 'online' : status.isOnline;
      setServerMembers(prev => prev.map(m => m.userId === userId ? { ...m, isOnline } : m));
    });
    return () => { presenceSocket.disconnect(); };
  }, [accessToken, selectedServer]);

  useEffect(() => {
    if (!socketRef.current || !selectedChannel || selectedChannel.type !== 'TEXT') return;
    if (currentChannelIdRef.current && currentChannelIdRef.current !== selectedChannel.id) {
      socketRef.current.emit('leave-channel', { channelId: currentChannelIdRef.current });
    }
    currentChannelIdRef.current = selectedChannel.id;
    socketRef.current.emit('join-channel', { channelId: selectedChannel.id });
    loadMessages(selectedChannel.id);
  }, [selectedChannel]);

  const loadServers = async () => { try { const response = await serversApi.getAll(); setServers(response.data); if (response.data.length > 0) setSelectedServer(response.data[0]); } catch (error) { console.error('Error:', error); } };
  const loadChannels = async (serverId: string) => { try { const response = await channelsApi.getByServer(serverId); setChannels(response.data); if (response.data.length > 0) setSelectedChannel(response.data[0]); } catch (error) { console.error('Error:', error); } };
  const loadServerMembers = async (serverId: string) => { try { const response = await serversApi.getMembers(serverId); setServerMembers(response.data.map((m: any) => ({ userId: m.userId || m.user?.id, username: m.user?.username || 'Unknown', displayName: m.user?.displayName, isOnline: false }))); } catch (error) { console.error('Error:', error); } };
  
  const loadMessages = async (channelId: string) => {
    try {
      setLoading(true);
      const response = await messagesApi.getChannelMessages(channelId, 50);
      const data = response.data;
      const messageList = Array.isArray(data) ? data : (data.messages || []);
      setMessages(messageList.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel) return;
    try {
      await messagesApi.sendMessage(selectedChannel.id, newMessage);
      setNewMessage('');
    } catch (error) {
      showToast('error', 'Mesaj gönderilemedi');
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !selectedServer) return;
    try {
      await channelsApi.create(selectedServer.id, { name: newChannelName, type: newChannelType });
      setNewChannelName('');
      setShowNewChannelModal(false);
      loadChannels(selectedServer.id);
      showToast('success', 'Kanal oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Kanal oluşturulamadı');
    }
  };

  const createServer = async () => {
    if (!newServerName.trim()) return;
    try {
      await serversApi.create({ name: newServerName, description: newServerDescription });
      setNewServerName('');
      setNewServerDescription('');
      setShowNewServerModal(false);
      loadServers();
      showToast('success', 'Sunucu oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Sunucu oluşturulamadı');
    }
  };

  const generateInvite = async () => {
    if (!selectedServer) return;
    try {
      const response = await serversApi.createInvite(selectedServer.id);
      const code = response.data.inviteCode || response.data.code;
      setInviteCode(code);
      setShowInviteModal(true);
      showToast('success', 'Davet linki oluşturuldu!');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Davet linki oluşturulamadı');
    }
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  const textChannels = channels.filter(ch => ch.type === 'TEXT');
  const voiceChannels = channels.filter(ch => ch.type === 'VOICE');

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Modals */}
      {showInviteModal && inviteCode && selectedServer && (
        <ServerInviteModal inviteCode={inviteCode} serverName={selectedServer.name} onClose={() => setShowInviteModal(false)} showToast={showToast} />
      )}
      <CreateChannelModal isOpen={showNewChannelModal} channelName={newChannelName} channelType={newChannelType} onNameChange={setNewChannelName} onTypeChange={setNewChannelType} onCreate={createChannel} onClose={() => setShowNewChannelModal(false)} />
      <CreateServerModal isOpen={showNewServerModal} serverName={newServerName} serverDescription={newServerDescription} onNameChange={setNewServerName} onDescriptionChange={setNewServerDescription} onCreate={createServer} onClose={() => setShowNewServerModal(false)} />

      {view === 'friends' ? (
        <FriendsView onClose={() => setView('servers')} showToast={showToast} />
      ) : view === 'dm' ? (
        <DirectMessagesView showToast={showToast} />
      ) : (
        <>
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 hover:bg-neutral-100 rounded-xl">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">AsforceS</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('friends')} className="p-2 hover:bg-neutral-100 rounded-xl"><Users className="w-5 h-5" /></button>
              <button onClick={() => setView('dm')} className="p-2 hover:bg-neutral-100 rounded-xl"><MessageSquare className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Server List - Desktop + Mobile Sidebar */}
          <div className={`${showMobileMenu ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex lg:static w-20 bg-gradient-to-b from-purple-900 via-purple-800 to-blue-900 flex-col items-center py-4 space-y-3 shadow-2xl`}>
            <button className="lg:hidden absolute top-4 right-4 text-white" onClick={() => setShowMobileMenu(false)}>
              <X className="w-5 h-5" />
            </button>
            
            {/* Logo */}
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-black text-xl shadow-lg mb-2">
              A
            </div>
            
            <div className="w-full border-t border-white/20 my-2"></div>
            
            {servers.map((server) => (
              <button
                key={server.id}
                onClick={() => { setSelectedServer(server); setShowMobileMenu(false); }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg transition-all duration-300 hover:rounded-xl group relative ${
                  selectedServer?.id === server.id
                    ? 'bg-white text-purple-600 shadow-xl scale-110'
                    : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                }`}
                title={server.name}
              >
                {server.icon || server.name.charAt(0).toUpperCase()}
                {selectedServer?.id === server.id && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
              </button>
            ))}
            
            <button
              onClick={() => setShowNewServerModal(true)}
              className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-green-500 hover:rounded-xl flex items-center justify-center text-green-400 hover:text-white transition-all duration-300 backdrop-blur-sm shadow-lg"
            >
              <Plus className="w-6 h-6" />
            </button>

            <div className="flex-1"></div>
            
            <button onClick={logout} className="w-14 h-14 rounded-2xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition-all duration-300">
              <LogOut className="w-5 h-5 mx-auto" />
            </button>
          </div>

          {/* Channel Sidebar - Modern Card Style */}
          <div className="hidden lg:flex w-72 bg-white/80 backdrop-blur-xl flex-col border-r border-neutral-200/50 shadow-xl">
            <div className="px-6 py-5 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              <h2 className="font-bold text-xl truncate mb-1">{selectedServer?.name || 'Sunucu Seç'}</h2>
              <p className="text-xs text-white/70">{serverMembers.length} üye</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Text Channels */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Metin Kanalları</h3>
                  <button onClick={() => setShowNewChannelModal(true)} className="p-1.5 hover:bg-purple-100 rounded-lg text-purple-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {textChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        selectedChannel?.id === channel.id
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg scale-105'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:scale-102'
                      }`}
                    >
                      <Hash className="w-5 h-5" />
                      <span className="font-medium truncate">{channel.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Channels */}
              {voiceChannels.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Sesli Kanallar</h3>
                  <div className="space-y-1.5">
                    {voiceChannels.map((channel) => {
                      const isConnected = connectedVoiceChannelId === channel.id;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => isConnected ? setConnectedVoiceChannelId(null) : setConnectedVoiceChannelId(channel.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                            isConnected
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Volume2 className="w-5 h-5" />
                            <span className="font-medium">{channel.name}</span>
                          </div>
                          {voiceUsers.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-white/20 rounded-full">{voiceUsers.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Card */}
            <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 border-t border-neutral-200">
              <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-xl p-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-neutral-800 truncate">{user?.username}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-neutral-600">Çevrimiçi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-white/50 backdrop-blur-sm">
            {/* Channel Header */}
            <div className="h-16 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 px-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                {selectedChannel && (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedChannel.type === 'TEXT' 
                        ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                        : 'bg-gradient-to-br from-green-500 to-emerald-500'
                    } shadow-lg`}>
                      {selectedChannel.type === 'TEXT' ? <Hash className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <span className="font-bold text-neutral-800 text-lg">{selectedChannel.name}</span>
                      <p className="text-xs text-neutral-500">{selectedChannel.type === 'TEXT' ? 'Metin Kanalı' : 'Sesli Kanal'}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <button onClick={generateInvite} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Davet</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {selectedChannel?.type === 'TEXT' ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-neutral-500">Yükleniyor...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-10 h-10 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-800 mb-2">#{selectedChannel.name}</h3>
                        <p className="text-neutral-500">İlk mesajı siz gönderin! 🚀</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="flex items-start space-x-4 hover:bg-white/80 p-4 rounded-2xl transition-all duration-200 group backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                          {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3 mb-1">
                            <span className="font-bold text-neutral-900">
                              {msg.user?.displayName || msg.user?.username || 'Kullanıcı'}
                            </span>
                            <span className="text-xs text-neutral-400 font-medium">
                              {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-neutral-700 leading-relaxed break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Premium Design */}
                <div className="p-4 lg:p-6 bg-white/80 backdrop-blur-xl border-t border-neutral-200/50">
                  <form onSubmit={sendMessage} className="flex items-center gap-3">
                    <div className="flex-1 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200 focus-within:border-purple-500 transition-all duration-200 shadow-sm">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`#${selectedChannel.name} kanalına mesaj gönder...`}
                        className="w-full px-5 py-4 bg-transparent text-neutral-900 placeholder-neutral-500 outline-none font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 font-semibold flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Gönder</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mx-auto mb-6">
                    <Volume2 className="w-12 h-12 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800 mb-2">Sesli Kanal</h3>
                  <p className="text-neutral-500">Sol menüden sesli kanala katılın</p>
                </div>
              </div>
            )}
          </div>

          {/* Members Sidebar - Desktop Only */}
          <div className="hidden xl:flex w-64 bg-white/80 backdrop-blur-xl border-l border-neutral-200/50 flex-col shadow-xl">
            <div className="px-5 py-5 border-b border-neutral-200/50">
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Üyeler — {serverMembers.length}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {serverMembers.map((member) => (
                <div key={member.userId} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white transition-all duration-200 group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {member.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    {member.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-neutral-800 truncate text-sm">
                      {member.displayName || member.username}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {member.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-neutral-200 px-4 py-3 flex justify-around shadow-2xl">
            <button onClick={() => setView('servers')} className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all ${view === 'servers' ? 'bg-purple-100 text-purple-600' : 'text-neutral-600'}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium">Sohbet</span>
            </button>
            <button onClick={() => setView('friends')} className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all ${view === 'friends' ? 'bg-purple-100 text-purple-600' : 'text-neutral-600'}`}>
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">Arkadaşlar</span>
            </button>
            <button onClick={() => setView('dm')} className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all ${view === 'dm' ? 'bg-purple-100 text-purple-600' : 'text-neutral-600'}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium">DM</span>
            </button>
            <button onClick={generateInvite} className="flex flex-col items-center space-y-1 px-4 py-2 rounded-xl text-neutral-600 hover:text-purple-600 transition-all">
              <LinkIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Davet</span>
            </button>
          </div>
        </>
      )}

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};




