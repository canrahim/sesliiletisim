import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Copy, X, Send, Check } from 'lucide-react';
import { friendsApi } from '../../api/endpoints/friends';

interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
}

interface ServerInviteModalProps {
  inviteCode: string;
  serverName: string;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const ServerInviteModal: React.FC<ServerInviteModalProps> = ({
  inviteCode,
  serverName,
  onClose,
  showToast,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🎨 ServerInviteModal mounted - inviteCode:', inviteCode, 'serverName:', serverName);
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      console.log('📡 Loading friends...');
      const response = await friendsApi.getAll();
      console.log('✅ Friends loaded:', response.data.length);
      setFriends(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Error loading friends:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Arkadaşlar yüklenemedi');
      setLoading(false);
      // Don't close modal on error - show empty state instead
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `https://app.asforces.com/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('success', '✅ Davet linki kopyalandı!');
  };

  const inviteFriend = async (friendId: string, friendName: string) => {
    const inviteLink = `https://app.asforces.com/invite/${inviteCode}`;
    
    try {
      // Send DM with invite link
      const dmContent = `🎉 ${serverName} sunucusuna davet edildiniz!\n\nDavet linki: ${inviteLink}\n\nBu linke tıklayarak sunucuya katılabilirsiniz!`;
      
      // Call DM API (we'll create this)
      await fetch(`${window.location.origin.replace('app.', '')}/api/dm/${friendId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('asforces-auth') ? JSON.parse(localStorage.getItem('asforces-auth')!).state?.accessToken : ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ content: dmContent }),
      });

      setInvitedFriends(prev => new Set([...prev, friendId]));
      showToast('success', `✅ ${friendName}'e davet mesajı gönderildi!`);
    } catch (error) {
      console.error('Error sending DM invite:', error);
      // Fallback - copy link
      navigator.clipboard.writeText(inviteLink);
      showToast('info', `📋 Davet linki kopyalandı - ${friendName}'e manuel gönderin`);
    }
  };

  const inviteUrl = `https://app.asforces.com/invite/${inviteCode}`;

  console.log('🎨 ServerInviteModal RENDERING - inviteCode:', inviteCode, 'serverName:', serverName);

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-md"
      onClick={(e) => {
        // Only close if clicking the backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          console.log('🚪 Backdrop clicked - closing modal');
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <LinkIcon className="w-6 h-6" />
                <span>{serverName} - Davet Et</span>
              </h2>
              <p className="text-blue-100 mt-1">Arkadaşlarınızı sunucunuza davet edin</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invite Link */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-5">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
              <LinkIcon className="w-5 h-5" />
              <span>Davet Linki</span>
            </h3>
            <div className="flex space-x-3">
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-white border-2 border-blue-300 rounded-lg font-mono text-sm text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.currentTarget.querySelector('input')?.select();
                }}
              >
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="w-full bg-transparent outline-none select-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.select();
                  }}
                />
              </a>
              <button
                onClick={copyInviteLink}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center space-x-2"
              >
                <Copy className="w-5 h-5" />
                <span>Kopyala</span>
              </button>
            </div>
            <p className="text-sm text-blue-700 mt-3 flex items-center space-x-2">
              <span>💡 Linke tıklayarak yeni sekmede açabilir veya kopyalayabilirsiniz</span>
            </p>
          </div>

          {/* Friends List */}
          <div>
            <h3 className="font-bold text-neutral-800 mb-3">Arkadaşlarınızı Davet Edin ({friends.length})</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-neutral-500">Yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 bg-red-50 rounded-xl">
                <p className="text-red-700">{error}</p>
                <p className="text-sm text-red-600 mt-1">Arkadaş listesi yüklenemedi</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 bg-neutral-50 rounded-xl">
                <p>Henüz arkadaşınız yok</p>
                <p className="text-sm mt-1">Arkadaş ekledikten sonra buradan davet edebilirsiniz</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {friends.map((friend) => {
                  const isInvited = invitedFriends.has(friend.id);
                  
                  return (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isInvited
                          ? 'bg-green-50 border-green-300'
                          : 'bg-neutral-50 border-neutral-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {friend.username?.charAt(0).toUpperCase()}
                          </div>
                          {friend.isOnline && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-800">
                            {friend.displayName || friend.username}
                          </div>
                          <div className="text-sm text-neutral-500 flex items-center space-x-2">
                            <span>@{friend.username}</span>
                            {friend.isOnline ? (
                              <span className="text-green-600 font-medium">● Çevrimiçi</span>
                            ) : (
                              <span className="text-neutral-400">○ Çevrimdışı</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isInvited ? (
                        <div className="flex items-center space-x-2 text-green-700 font-semibold">
                          <Check className="w-5 h-5" />
                          <span>Davet Edildi</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => inviteFriend(friend.id, friend.displayName || friend.username)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>Davet Et</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

