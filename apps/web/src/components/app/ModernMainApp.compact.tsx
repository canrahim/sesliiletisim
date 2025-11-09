import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Settings, Users, LogOut, Link as LinkIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';
import { serversApi } from '../../api/endpoints/servers';
import { channelsApi } from '../../api/endpoints/channels';
import { messagesApi } from '../../api/endpoints/messages';
import { ServerList } from './ServerList';
import { ChannelList } from './ChannelList';
import { MessageArea } from './MessageArea';
import { MemberList } from './MemberList';
import { CreateChannelModal } from './CreateChannelModal';
import { CreateServerModal } from './CreateServerModal';
import { FriendsSidebar } from './FriendsSidebar';
import { FriendsView } from './FriendsView';
import { DirectMessagesView } from './DirectMessagesView';
import { ToastContainer } from '../ui/Toast';
import { ServerInviteModal } from './ServerInviteModal';

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
  
  // Voice state
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [voiceUsers, setVoiceUsers] = useState<Array<{ userId: string; username: string; isMuted?: boolean; isSpeaking?: boolean }>>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [myAudioLevel, setMyAudioLevel] = useState(0);
  const [serverMembers, setServerMembers] = useState<Array<{ userId: string; username: string; displayName?: string; isOnline: boolean }>>([]);
  
  // Modals
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDescription, setNewServerDescription] = useState('');
  const [showFriendsSidebar, setShowFriendsSidebar] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const voiceSocketRef = useRef<Socket | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChannelIdRef = useRef<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      loadChannels(selectedServer.id);
      loadServerMembers(selectedServer.id);
    }
  }, [selectedServer]);

  // Initialize WebSocket
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${API_BASE}/messages`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to message gateway');
      if (currentChannelIdRef.current) {
        socket.emit('join-channel', { channelId: currentChannelIdRef.current });
      }
    });

    socket.on('new-message', (message: Message) => {
      if (currentChannelIdRef.current === message.channelId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    });

    socket.on('message-deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  // Initialize Presence
  useEffect(() => {
    if (!accessToken || !selectedServer) return;

    const presenceSocket = io(`${API_BASE}/presence`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      withCredentials: true,
    });

    presenceSocketRef.current = presenceSocket;

    presenceSocket.on('connect', () => {
      console.log('✅ Connected to presence gateway');
    });

    presenceSocket.on('presence-update', ({ userId, status }: any) => {
      const isOnline = typeof status === 'string' ? status === 'online' : status.isOnline;
      setServerMembers(prev => prev.map(m => m.userId === userId ? { ...m, isOnline } : m));
    });

    return () => {
      presenceSocket.disconnect();
    };
  }, [accessToken, selectedServer]);

  // Channel selection
  useEffect(() => {
    if (!socketRef.current || !selectedChannel || selectedChannel.type !== 'TEXT') return;
    
    const socket = socketRef.current;
    if (currentChannelIdRef.current && currentChannelIdRef.current !== selectedChannel.id) {
      socket.emit('leave-channel', { channelId: currentChannelIdRef.current });
    }
    currentChannelIdRef.current = selectedChannel.id;
    socket.emit('join-channel', { channelId: selectedChannel.id });
    loadMessages(selectedChannel.id);
  }, [selectedChannel]);

  // API calls
  const loadServers = async () => {
    try {
      const response = await serversApi.getAll();
      setServers(response.data);
      if (response.data.length > 0) setSelectedServer(response.data[0]);
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  const loadChannels = async (serverId: string) => {
    try {
      const response = await channelsApi.getByServer(serverId);
      setChannels(response.data);
      if (response.data.length > 0) setSelectedChannel(response.data[0]);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadServerMembers = async (serverId: string) => {
    try {
      const response = await serversApi.getMembers(serverId);
      setServerMembers(response.data.map((m: any) => ({
        userId: m.userId || m.user?.id,
        username: m.user?.username || 'Unknown',
        displayName: m.user?.displayName,
        isOnline: false,
      })));
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      setLoading(true);
      const response = await messagesApi.getChannelMessages(channelId, 50);
      const data = response.data;
      const messageList = Array.isArray(data) ? data : (data.messages || []);
      setMessages(messageList.sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
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
      showToast('success', `${newChannelType === 'TEXT' ? 'Metin' : 'Sesli'} kanal oluşturuldu!`);
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

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const textChannels = channels.filter(ch => ch.type === 'TEXT');
  const voiceChannels = channels.filter(ch => ch.type === 'VOICE');

  return (
    <div className="h-screen flex bg-white">
      {/* Modals */}
      {showFriendsSidebar && <FriendsSidebar onClose={() => setShowFriendsSidebar(false)} />}
      {showInviteModal && inviteCode && selectedServer && (
        <ServerInviteModal
          inviteCode={inviteCode}
          serverName={selectedServer.name}
          onClose={() => setShowInviteModal(false)}
          showToast={showToast}
        />
      )}
      <CreateChannelModal
        isOpen={showNewChannelModal}
        channelName={newChannelName}
        channelType={newChannelType}
        onNameChange={setNewChannelName}
        onTypeChange={setNewChannelType}
        onCreate={createChannel}
        onClose={() => setShowNewChannelModal(false)}
      />
      <CreateServerModal
        isOpen={showNewServerModal}
        serverName={newServerName}
        serverDescription={newServerDescription}
        onNameChange={setNewServerName}
        onDescriptionChange={setNewServerDescription}
        onCreate={createServer}
        onClose={() => setShowNewServerModal(false)}
      />

      {/* Main Layout */}
      {view === 'servers' && selectedServer ? (
        <>
          {/* Server List */}
          <ServerList
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            onCreateServer={() => setShowNewServerModal(true)}
          />

          {/* Channel Sidebar */}
          <div className="w-60 bg-neutral-100 flex flex-col border-r border-neutral-200">
            <div className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shadow-sm">
              <h2 className="font-bold text-neutral-800 truncate">{selectedServer.name}</h2>
              <button
                onClick={generateInvite}
                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 hover:text-blue-600 transition-colors"
                title="Davet Linki Oluştur"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>

            <ChannelList
              textChannels={textChannels}
              voiceChannels={voiceChannels}
              selectedChannel={selectedChannel}
              connectedVoiceChannelId={connectedVoiceChannelId}
              onSelectChannel={setSelectedChannel}
              onJoinVoice={(id) => setConnectedVoiceChannelId(id)}
              onLeaveVoice={() => setConnectedVoiceChannelId(null)}
              onCreateChannel={() => setShowNewChannelModal(true)}
              voiceUsers={voiceUsers}
            />

            {/* Bottom User Bar */}
            <div className="h-14 bg-neutral-200 border-t border-neutral-300 px-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-neutral-800 truncate">{user?.username}</div>
                  <div className="text-xs text-neutral-500">Çevrimiçi</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-neutral-300 rounded-lg text-neutral-600 hover:text-red-600 transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                {selectedChannel && (
                  <>
                    {selectedChannel.type === 'TEXT' ? (
                      <Hash className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-neutral-500" />
                    )}
                    <span className="font-semibold text-neutral-800">{selectedChannel.name}</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('friends')}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 hover:text-blue-600 transition-colors"
                  title="Arkadaşlar"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView('dm')}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600 hover:text-blue-600 transition-colors"
                  title="Direkt Mesajlar"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedChannel?.type === 'TEXT' ? (
              <MessageArea
                channelName={selectedChannel.name}
                messages={messages}
                loading={loading}
                newMessage={newMessage}
                onMessageChange={setNewMessage}
                onSendMessage={sendMessage}
                messagesEndRef={messagesEndRef}
              />
            ) : selectedChannel?.type === 'VOICE' ? (
              <div className="flex-1 flex items-center justify-center bg-neutral-50">
                <div className="text-center text-neutral-500">
                  <Volume2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-bold mb-2">Sesli Kanal</h3>
                  <p>Sol taraftaki sesli kanal butonuna tıklayarak katılın.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-neutral-50">
                <div className="text-center text-neutral-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Bir kanal seçin</p>
                </div>
              </div>
            )}
          </div>

          {/* Member List */}
          <MemberList
            members={serverMembers}
            voiceUsers={voiceUsers}
            currentUserId={user?.id}
            myAudioLevel={myAudioLevel}
            isMuted={isMuted}
          />
        </>
      ) : view === 'friends' ? (
        <FriendsView onClose={() => setView('servers')} showToast={showToast} />
      ) : view === 'dm' ? (
        <DirectMessagesView showToast={showToast} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-20 h-20 mx-auto mb-4 text-neutral-300" />
            <h2 className="text-2xl font-bold text-neutral-700 mb-2">AsforceS Voice</h2>
            <p className="text-neutral-500">Bir sunucu seçin veya oluşturun</p>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};






