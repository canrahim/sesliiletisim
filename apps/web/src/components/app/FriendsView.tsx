import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Check, X, MessageSquare, Trash2, Shield } from 'lucide-react';
import { friendsApi } from '../../api/endpoints/friends';
import { useAuthStore } from '../../store/auth.store';
import { io, Socket } from 'socket.io-client';

interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
}

interface FriendRequest {
  id: string;
  user: Friend;
  createdAt: string;
}

interface FriendsViewProps {
  showToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onOpenDm?: (friendId: string) => void;
  onClose?: () => void;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' 
  ? 'https://asforces.com' 
  : 'http://localhost:3000';

export const FriendsView: React.FC<FriendsViewProps> = ({ showToast, onOpenDm, onClose }) => {
  
  const handleOpenDM = (friendId: string) => {
    console.log('Opening DM with friend:', friendId);
    if (onOpenDm) {
      onOpenDm(friendId);
    }
    if (onClose) {
      onClose(); // Arkadaşlar panelini kapat
    }
  };
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'add'>('all');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, []);

  // Initialize presence socket for friends (NO periodic checks - only real-time updates!)
  useEffect(() => {
    if (!accessToken) return;

    const presenceSocket = io(`${API_BASE}/presence`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    presenceSocketRef.current = presenceSocket;

    presenceSocket.on('connect', () => {
      // Silent connection - no spam
    });

    presenceSocket.on('presence-update', ({ userId, status }: { userId: string; status: string | { isOnline: boolean } }) => {
      // Silent update - no console spam
      const isOnline = typeof status === 'string' ? status === 'online' : status.isOnline;
      
      // Update friend list with new online status
      setFriends(prev => prev.map(friend => 
        friend.id === userId 
          ? { ...friend, isOnline }
          : friend
      ));
    });

    presenceSocket.on('connect_error', (error) => {
      // Silent error - only critical errors logged
    });

    return () => {
      presenceSocket.disconnect();
    };
  }, [accessToken]);

  const loadFriends = async () => {
    try {
      const response = await friendsApi.getAll();
      setFriends(response.data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const response = await friendsApi.getPendingRequests();
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      await friendsApi.sendRequest(newFriendUsername);
      setNewFriendUsername('');
      setError('');
      showToast?.('success', `✅ Arkadaşlık isteği gönderildi: ${newFriendUsername}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'İstek gönderilemedi';
      setError(errorMsg);
      showToast?.('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await friendsApi.acceptRequest(requestId);
      await loadFriends();
      await loadPendingRequests();
      showToast?.('success', '✅ Arkadaşlık isteği kabul edildi!');
    } catch (error) {
      console.error('Error accepting request:', error);
      showToast?.('error', 'İstek kabul edilemedi');
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await friendsApi.declineRequest(requestId);
      await loadPendingRequests();
      showToast?.('info', 'Arkadaşlık isteği reddedildi');
    } catch (error) {
      console.error('Error declining request:', error);
      showToast?.('error', 'İstek reddedilemedi');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await friendsApi.removeFriend(friendId);
      await loadFriends();
      showToast?.('info', 'Arkadaş kaldırıldı');
    } catch (error) {
      console.error('Error removing friend:', error);
      showToast?.('error', 'Arkadaş kaldırılamadı');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-14 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center px-6 shadow-md">
        <Users className="w-6 h-6 text-white mr-3" />
        <h1 className="text-xl font-bold text-white">Arkadaşlar</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-50">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Tümü ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 relative ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Bekleyen ({pendingRequests.length})
          {pendingRequests.length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'add'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          Arkadaş Ekle
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* All Friends Tab */}
        {activeTab === 'all' && (
          <div>
            {friends.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-700 mb-2">Henüz arkadaşınız yok</h3>
                <p className="text-neutral-500 mb-4">Arkadaş ekleyerek sohbete başlayın!</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Arkadaş Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-white border-2 border-neutral-200 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 hover:border-blue-300 group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {friend.username?.charAt(0).toUpperCase()}
                          </div>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-md animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg text-neutral-900 truncate">
                            {friend.displayName || friend.username}
                          </div>
                          <div className="text-sm text-neutral-600 font-medium">@{friend.username}</div>
                          <div className="flex items-center gap-2 mt-2">
                            {friend.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Çevrimiçi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">
                                <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                                Çevrimdışı
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenDM(friend.id)}
                        className="flex-shrink-0 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-md hover:scale-110 duration-200"
                        title="Mesaj Gönder"
                      >
                        <MessageSquare className="w-6 h-6" />
                      </button>
                    </div>

                    {removingFriendId === friend.id ? (
                      <div className="flex gap-3 pt-3 border-t border-neutral-200" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFriend(friend.id);
                            setRemovingFriendId(null);
                          }}
                          className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                        >
                          ✓ Eminim, Kaldır
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemovingFriendId(null);
                          }}
                          className="flex-1 px-5 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold rounded-xl transition-all"
                        >
                          ✕ İptal
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-3 border-t border-neutral-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemovingFriendId(friend.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all font-medium"
                          title="Arkadaşlıktan Çıkar"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Kaldır</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-700 mb-2">Bekleyen istek yok</h3>
                <p className="text-neutral-500">Yeni arkadaşlık istekleri burada görünecek</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl mx-auto">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {request.user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-800 text-lg">
                            {request.user.displayName || request.user.username}
                          </div>
                          <div className="text-neutral-600">@{request.user.username}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => acceptRequest(request.id)}
                          className="flex items-center space-x-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                        >
                          <Check className="w-5 h-5" />
                          <span>Kabul Et</span>
                        </button>
                        <button
                          onClick={() => declineRequest(request.id)}
                          className="flex items-center space-x-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                        >
                          <X className="w-5 h-5" />
                          <span>Reddet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Friend Tab */}
        {activeTab === 'add' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-8">
              <div className="text-center mb-6">
                <UserPlus className="w-16 h-16 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-blue-900 mb-2">Arkadaş Ekle</h2>
                <p className="text-blue-700">Kullanıcı adıyla arkadaşlarınızı bulun ve ekleyin</p>
              </div>

              <form onSubmit={sendRequest} className="space-y-4">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={newFriendUsername}
                    onChange={(e) => {
                      setNewFriendUsername(e.target.value);
                      setError('');
                    }}
                    placeholder="ornek_kullanici"
                    className="w-full px-5 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                    disabled={loading}
                  />
                  <p className="text-sm text-blue-600 mt-2">
                    💡 İpucu: Tam kullanıcı adını yazmalısınız (büyük/küçük harf duyarlı değil)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !newFriendUsername.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Gönderiliyor...' : 'Arkadaşlık İsteği Gönder'}
                </button>
              </form>

              <div className="mt-6 bg-white bg-opacity-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Nasıl Çalışır?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Arkadaş eklemek istediğiniz kişinin kullanıcı adını girin</li>
                  <li>✓ Kişi isteği "Bekleyen" sekmesinde görecek</li>
                  <li>✓ Kabul ettiğinde arkadaş listenize eklenecek</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

