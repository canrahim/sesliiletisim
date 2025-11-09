import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Smile, Image as ImageIcon, X, Download, FileText, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { io, Socket } from 'socket.io-client';
import { EmojiPicker } from '../ui/EmojiPicker';
import { FileUpload } from '../ui/FileUpload';
import { uploadApi } from '../../api/endpoints/upload';

interface Friend {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface DirectMessagesProps {
  friends: Friend[];
  onBack: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com'
  ? 'https://app.asforces.com'
  : 'http://localhost:3000';

type ParsedMessage =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'file';
      filename: string;
      url: string;
      mimetype?: string;
      size?: number;
      text?: string | null;
    };

const resolveFileUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  // Eski /api/uploads/ formatını yeni /api/upload/uploads/ formatına çevir
  const normalizedUrl = url.replace('/api/uploads/', '/api/upload/uploads/');
  return `${API_BASE}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
};

const parseMessageContent = (raw: string): ParsedMessage => {
  if (!raw) {
    return { type: 'text', text: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'file' && parsed.filename && parsed.url) {
      return {
        type: 'file',
        filename: parsed.filename,
        url: parsed.url,
        mimetype: parsed.mimetype,
        size: parsed.size,
        text: typeof parsed.text === 'string' ? parsed.text : null,
      };
    }
  } catch (error) {
    // JSON parse edilemezse düz metin olarak ele alınır
  }

  return { type: 'text', text: raw };
};

const formatFileSize = (bytes?: number) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const handleDownloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('❌ Download error:', error);
    alert('Dosya indirilemedi');
  }
};

export const DirectMessages: React.FC<DirectMessagesProps> = ({ 
  friends, 
  onBack,
  showToast 
}) => {
  const { user, accessToken } = useAuthStore();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ filename: string; url: string; mimetype?: string; size?: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [messageContextMenu, setMessageContextMenu] = useState<{ messageId: string; isOwner: boolean; x: number; y: number } | null>(null);
  
  const dmSocketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DM Socket
  useEffect(() => {
    if (!accessToken || !selectedFriend) return;

    const dmSocket = io(`${API_BASE}/dm`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    dmSocketRef.current = dmSocket;

    dmSocket.on('connect', () => {
      console.log('✅ DM Socket connected');
    });

    dmSocket.on('new-dm', (message: Message) => {
      if (
        (message.senderId === selectedFriend.id && message.receiverId === user?.id) ||
        (message.senderId === user?.id && message.receiverId === selectedFriend.id)
      ) {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
      }
    });

    return () => {
      dmSocket.disconnect();
    };
  }, [accessToken, selectedFriend]);

  useEffect(() => {
    if (!selectedFriend) return;
    const updated = friends.find(f => f.id === selectedFriend.id);
    if (updated && updated !== selectedFriend) {
      setSelectedFriend(updated);
    }
  }, [friends, selectedFriend]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (friendId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/dm/${friendId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedFriend) return;

    const messageContent = newMessage;
    const fileToUpload = selectedFile;
    setNewMessage('');
    setSelectedFile(null);

    try {
      let fileData = null;
      
      if (fileToUpload) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const uploadResponse = await uploadApi.uploadFile(fileToUpload, (progress) => {
          setUploadProgress(progress);
        });
        
        fileData = uploadResponse.data;
        setIsUploading(false);
        setUploadProgress(100);
      }

      let finalContent = messageContent.trim();

      if (fileData) {
        finalContent = JSON.stringify({
          type: 'file',
          filename: fileData.filename,
          url: fileData.url,
          mimetype: fileData.mimetype,
          size: fileData.size,
          text: messageContent.trim() || null,
        });
      }
      
      const response = await fetch(`${API_BASE}/api/dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          receiverId: selectedFriend.id,
          content: finalContent,
        }),
      });

      if (response.ok) {
        // Socket'ten gelecek, duplicate ekleme!
        if (fileData) {
          showToast('success', `✅ Dosya gönderildi: ${fileData.filename}`);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('error', 'Mesaj gönderilemedi');
      setNewMessage(messageContent);
      setSelectedFile(fileToUpload);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    try {
      const parsed = JSON.parse(currentContent);
      setEditingContent(parsed.text || '');
    } catch {
      setEditingContent(currentContent);
    }
    setMessageContextMenu(null);
  };

  const saveEditMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/dm/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, content: editingContent.trim() }
            : m
        ));
        setEditingMessageId(null);
        setEditingContent('');
        showToast('success', 'Mesaj düzenlendi');
      }
    } catch (error) {
      showToast('error', 'Mesaj düzenlenemedi');
    }
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/dm/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setMessageContextMenu(null);
        showToast('success', 'Mesaj silindi');
      }
    } catch (error) {
      showToast('error', 'Mesaj silinemedi');
    }
  };

  const selectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    loadConversation(friend.id);
  };

  return (
    <>
      {previewFile && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/70 text-white hover:bg-neutral-900 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 truncate">{previewFile.filename}</h3>
              <p className="text-sm text-neutral-500">
                {previewFile.mimetype || 'Dosya'}
                {previewFile.size ? ` • ${formatFileSize(previewFile.size)}` : ''}
              </p>
            </div>
            <div className="bg-neutral-100 flex items-center justify-center max-h-[65vh]">
              {previewFile.mimetype?.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-10 text-center text-neutral-600">
                  <p className="text-lg font-semibold mb-2">Önizleme desteklenmiyor</p>
                  <p className="text-sm">Bu dosyayı indirerek görüntüleyebilirsiniz.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-neutral-200 bg-white">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-all"
              >
                Kapat
              </button>
              <button
                onClick={() => handleDownloadFile(previewFile.url, previewFile.filename)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                İndir
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex">
      
      {/* Friends Sidebar - Modern */}
      <div className="w-80 bg-gradient-to-b from-neutral-50 to-white border-r border-neutral-200 flex flex-col">
        <div className="p-5 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-neutral-900">Mesajlar</h2>
            <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-xl transition-all">
              <X className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
          <p className="text-neutral-500 text-sm">{friends.length} arkadaş</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {friends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => selectFriend(friend)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                selectedFriend?.id === friend.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-neutral-100'
              }`}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-md overflow-hidden ${
                  selectedFriend?.id === friend.id
                    ? 'bg-white text-blue-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                }`}>
                  {friend.avatar ? (
                    <img src={resolveFileUrl(friend.avatar)} alt={friend.username} className="w-full h-full object-cover" />
                  ) : (
                    friend.username?.charAt(0).toUpperCase()
                  )}
                </div>
                {friend.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm truncate ${selectedFriend?.id === friend.id ? 'text-white' : 'text-neutral-800'}`}>
                  {friend.displayName || friend.username}
                </div>
                <div className={`text-xs ${selectedFriend?.id === friend.id ? 'text-white/80' : 'text-neutral-500'}`}>
                  {friend.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area - Mavi-beyaz */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedFriend ? (
          <>
            {/* Header - Modern */}
            <div className="bg-white border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                      {selectedFriend.avatar ? (
                        <img src={resolveFileUrl(selectedFriend.avatar)} alt={selectedFriend.username} className="w-full h-full object-cover" />
                      ) : (
                        selectedFriend.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    {selectedFriend.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900">
                      {selectedFriend.displayName || selectedFriend.username}
                    </h3>
                    <p className={`text-sm flex items-center gap-1 ${selectedFriend.isOnline ? 'text-green-600' : 'text-neutral-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${selectedFriend.isOnline ? 'bg-green-500' : 'bg-neutral-400'}`}></span>
                      {selectedFriend.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages - Profesyonel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50">
              {loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <Send className="w-20 h-20 text-blue-500 mb-4" />
                  <p className="font-bold text-xl text-neutral-800 mb-2">Sohbete Başlayın</p>
                  <p className="text-sm">İlk mesajı göndererek konuşmaya başlayın</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const payload = parseMessageContent(msg.content);
                  const messageText = payload.type === 'file' ? (payload.text || '') : payload.text;
                  const fileUrl = payload.type === 'file' ? resolveFileUrl(payload.url) : null;
                  const isImageFile = payload.type === 'file' && (payload.mimetype?.startsWith('image/') ?? false);
                  const fileSizeLabel = payload.type === 'file' ? formatFileSize(payload.size) : '';

                  return (
                    <div 
                      key={msg.id} 
                      className={`group flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} relative`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMessageContextMenu({
                          messageId: msg.id,
                          isOwner: isMe,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-md overflow-hidden ${
                          isMe
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                            : 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white'
                        }`}>
                          {isMe ? (
                            user?.avatar ? (
                              <img src={resolveFileUrl(user.avatar)} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                              user?.username?.charAt(0).toUpperCase()
                            )
                          ) : (
                            selectedFriend.avatar ? (
                              <img src={resolveFileUrl(selectedFriend.avatar)} alt={selectedFriend.username} className="w-full h-full object-cover" />
                            ) : (
                              selectedFriend.username?.charAt(0).toUpperCase()
                            )
                          )}
                        </div>
                      </div>
                      {/* Message Bubble */}
                      <div className={`max-w-lg ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Düzenleme Modu */}
                        {editingMessageId === msg.id ? (
                          <div className="w-full bg-white border-2 border-blue-500 rounded-xl p-3 shadow-lg">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                              rows={3}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  saveEditMessage(msg.id);
                                }
                                if (e.key === 'Escape') {
                                  cancelEditMessage();
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={cancelEditMessage}
                                className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
                              >
                                İptal (Esc)
                              </button>
                              <button
                                onClick={() => saveEditMessage(msg.id)}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all"
                              >
                                Kaydet (Enter)
                              </button>
                            </div>
                          </div>
                        ) : (
                        <div className={`w-full px-4 py-3 rounded-2xl shadow-sm ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-neutral-800 rounded-bl-sm border border-neutral-200'
                        }`}>
                          {payload.type === 'file' ? (
                            <div className="space-y-3">
                              {messageText && (
                                <p className="leading-relaxed whitespace-pre-wrap break-words">
                                  {messageText}
                                </p>
                              )}
                              <div className={`rounded-xl border ${isMe ? 'border-white/30 bg-white/10' : 'border-blue-200 bg-blue-50/60'}`}>
                                {isImageFile && fileUrl ? (
                                  <div className="group">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFile({ filename: payload.filename, url: fileUrl, mimetype: payload.mimetype, size: payload.size })}
                                      className="block w-full overflow-hidden focus:outline-none"
                                    >
                                      <img
                                        src={fileUrl}
                                        alt={payload.filename}
                                        className="max-h-80 w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                                      />
                                    </button>
                                    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${isMe ? 'bg-white/20 text-white' : 'bg-white text-neutral-800'}`}>
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">{payload.filename}</p>
                                        <p className="text-xs opacity-70">{fileSizeLabel}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile({ filename: payload.filename, url: fileUrl, mimetype: payload.mimetype, size: payload.size })}
                                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/20'}`}
                                        >
                                          <Eye className="w-4 h-4" />
                                          Önizle
                                        </button>
                                        <button
                                          onClick={() => handleDownloadFile(fileUrl!, payload.filename)}
                                          className={`p-2 rounded-lg transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 hover:bg-blue-600/20'}`}
                                          title="İndir"
                                        >
                                          <Download className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-600'}`} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isMe ? 'bg-white/10 text-white' : 'bg-white text-neutral-800'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMe ? 'bg-white/15 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
                                        <FileText className="w-6 h-6" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">{payload.filename}</p>
                                        <p className="text-xs opacity-70">{fileSizeLabel || payload.mimetype}</p>
                                      </div>
                                    </div>
                                    {fileUrl && (
                                      <button
                                        onClick={() => handleDownloadFile(fileUrl, payload.filename)}
                                        className={`p-2 rounded-lg transition-all ${isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-blue-600/10 hover:bg-blue-600/20'}`}
                                        title="İndir"
                                      >
                                        <Download className={`w-5 h-5 ${isMe ? 'text-white' : 'text-blue-600'}`} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {payload.text}
                            </p>
                          )}
                        </div>
                        )}
                        <p className={`text-xs mt-1 px-2 ${isMe ? 'text-neutral-500' : 'text-neutral-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Modern */}
            <div className="bg-white border-t border-neutral-200 p-4">
              {/* File Preview */}
              {selectedFile && (
                <div className="mb-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl relative">
                    {isUploading && uploadProgress > 0 && (
                      <div 
                        className="absolute inset-0 bg-blue-400/20 rounded-xl transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    )}
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-2xl relative z-10">
                      📄
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="font-semibold text-neutral-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-neutral-500">{(selectedFile.size / 1024).toFixed(1)} KB {isUploading && `• ${uploadProgress}%`}</p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-all relative z-10"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 text-neutral-600" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* File Upload */}
                <FileUpload
                  onFileSelect={(file) => setSelectedFile(file)}
                  disabled={isUploading}
                >
                  <button 
                    className="p-3 hover:bg-neutral-100 rounded-xl transition-all disabled:opacity-50"
                    disabled={isUploading}
                    title="Dosya Ekle"
                  >
                    <ImageIcon className="w-5 h-5 text-neutral-600" />
                  </button>
                </FileUpload>

                {/* Emoji Picker */}
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 hover:bg-neutral-100 rounded-xl transition-all"
                    title="Emoji Ekle"
                  >
                    <Smile className="w-5 h-5 text-neutral-600" />
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowEmojiPicker(false)}
                      />
                      <div className="absolute bottom-full mb-2 left-0 z-50">
                        <EmojiPicker
                          onSelect={(emoji) => {
                            setNewMessage(prev => prev + emoji.native);
                            setShowEmojiPicker(false);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Message Input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Mesaj yazın..."
                  disabled={isUploading}
                  className="flex-1 px-4 py-3 bg-neutral-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                />

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Gönder"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-blue-50/30">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Send className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Bir sohbet seçin</h3>
            <p className="text-blue-600">Soldan bir arkadaşınızı seçin</p>
          </div>
        )}
      </div>
      </div>

      {/* Mesaj Context Menüsü */}
      {messageContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMessageContextMenu(null)}
          />
          <div
            className="fixed z-[70] w-56 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            style={{ left: messageContextMenu.x, top: messageContextMenu.y }}
          >
            <div className="py-2">
              {messageContextMenu.isOwner && (
                <>
                  <button
                    onClick={() => {
                      const msg = messages.find(m => m.id === messageContextMenu.messageId);
                      if (msg) startEditMessage(msg.id, msg.content);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Mesajı Düzenle
                  </button>
                  <div className="h-px bg-neutral-200 my-1" />
                </>
              )}
              <button
                onClick={() => deleteMessage(messageContextMenu.messageId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Mesajı Sil
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};

