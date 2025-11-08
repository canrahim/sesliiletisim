import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, MessageCircle, Trash2, Search } from 'lucide-react';
import { friendsApi } from '../../api/endpoints/friends';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' 
  ? 'https://asforces.com' 
  : 'http://localhost:3000';

const resolveFileUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  const normalizedUrl = url.replace('/api/uploads/', '/api/upload/uploads/');
  return `${API_BASE}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
};

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
}

interface FriendsPanelProps {
  friends: Friend[];
  onFriendsUpdate: () => void;
  onOpenDM: (friend: Friend) => void;
  onClose: () => void;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({ 
  friends, 
  onFriendsUpdate,
  onOpenDM,
  onClose 
}) => {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const filteredFriends = friends.filter(f =>
    !searchQuery.trim() ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadPendingRequests = async () => {
    try {
      const response = await friendsApi.getPendingRequests();
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const sendRequest = async () => {
    if (!newFriendUsername.trim()) return;
    setLoading(true);
    try {
      await friendsApi.sendRequest(newFriendUsername);
      setNewFriendUsername('');
      alert('Arkadaşlık isteği gönderildi!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await friendsApi.acceptRequest(requestId);
      onFriendsUpdate();
      loadPendingRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await friendsApi.declineRequest(requestId);
      loadPendingRequests();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm('Arkadaşlıktan çıkarmak istediğinize emin misiniz?')) return;
    try {
      await friendsApi.removeFriend(friendId);
      onFriendsUpdate();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur rounded-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Arkadaşlarım</h2>
                <p className="text-blue-100">{friends.length} arkadaş</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all group"
            >
              <X className="w-7 h-7 text-white group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Add Friend */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-blue-900 text-lg">Yeni Arkadaş Ekle</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newFriendUsername}
                onChange={(e) => setNewFriendUsername(e.target.value)}
                placeholder="Kullanıcı adı..."
                className="flex-1 px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onKeyPress={(e) => e.key === 'Enter' && sendRequest()}
              />
              <button
                onClick={sendRequest}
                disabled={loading || !newFriendUsername.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 transform hover:scale-105"
              >
                Gönder
              </button>
            </div>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                Bekleyen İstekler ({pendingRequests.length})
              </h3>
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {request.user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{request.user.displayName || request.user.username}</div>
                      <div className="text-sm text-gray-600">@{request.user.username}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(request.id)} className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all transform hover:scale-110">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => declineRequest(request.id)} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all transform hover:scale-110">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Arkadaş ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Friends List */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700">Tüm Arkadaşlar</h3>
            {filteredFriends.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="font-semibold text-lg">
                  {searchQuery ? 'Arkadaş bulunamadı' : 'Henüz arkadaşınız yok'}
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="group bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-300 rounded-2xl p-4 flex items-center justify-between transition-all shadow-sm hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg overflow-hidden">
                        {friend.avatar ? (
                          <img src={resolveFileUrl(friend.avatar)} alt={friend.username} className="w-full h-full object-cover" />
                        ) : (
                          friend.username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* Üye listesi gibi online badge */}
                      {friend.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-lg">
                        {friend.displayName || friend.username}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {friend.isOnline ? (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Çevrimiçi
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Çevrimdışı
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onOpenDM(friend)}
                      className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all transform hover:scale-110 shadow-lg"
                      title="Mesaj Gönder"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all transform hover:scale-110 shadow-lg"
                      title="Arkadaşlıktan Çıkar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

