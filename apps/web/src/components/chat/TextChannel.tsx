import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Edit2, 
  Trash2, 
  X, 
  Image as ImageIcon, 
  File, 
  Video as VideoIcon,
  Download,
  Reply,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui';
import { messagesApi } from '../../api/endpoints/messages';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useDropzone } from 'react-dropzone';

interface TextChannelProps {
  channelId: string;
  channelName: string;
  serverId: string;
}

interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  attachments?: Attachment[];
  replyTo?: {
    id: string;
    content: string;
    author: {
      username: string;
    };
  };
  status?: 'sending' | 'sent' | 'failed';
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  type: 'image' | 'video' | 'file';
}

interface TypingUser {
  userId: string;
  username: string;
}

export const TextChannel: React.FC<TextChannelProps> = ({
  channelId,
  channelName,
  serverId,
}) => {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(`${import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'app.asforces.com' ? 'https://asforces.com' : 'http://localhost:3000')}/messages`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to message gateway');
      socket.emit('join-channel', { channelId });
    });

    socket.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on('message-updated', (message: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, ...message } : m))
      );
    });

    socket.on('message-deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on('user-typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === user.id) return;

      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.find((u) => u.userId === userId)) {
            return [...prev, { userId, username: 'User' }];
          }
        } else {
          return prev.filter((u) => u.userId !== userId);
        }
        return prev;
      });
    });

    return () => {
      socket.emit('leave-channel', { channelId });
      socket.disconnect();
    };
  }, [token, user, channelId]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const response = await messagesApi.getChannelMessages(channelId, 50);
        // Handle both { messages: [...] } and direct array responses
        const messageList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.messages || []);
        setMessages(messageList);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [channelId]);

  // Dropzone for file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadingFiles(acceptedFiles);
    
    // Create previews for images and videos
    const previews = acceptedFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      return { file, preview };
    });
    setPreviewFiles(previews);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  // Send typing indicator
  const handleTyping = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit('typing', { channelId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { channelId, isTyping: false });
    }, 3000);
  }, [channelId]);

  // Handle file upload
  const uploadFiles = async (files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // TODO: Replace with actual upload endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL}/messages/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      return data.attachments;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && uploadingFiles.length === 0) || isSending || !socketRef.current) return;

    try {
      setIsSending(true);

      let attachments: Attachment[] = [];
      
      // Upload files if any
      if (uploadingFiles.length > 0) {
        try {
          attachments = await uploadFiles(uploadingFiles);
        } catch (error) {
          console.error('Failed to upload files:', error);
          alert('Dosya yükleme başarısız oldu');
          return;
        }
      }

      socketRef.current.emit('send-message', {
        channelId,
        message: {
          content: newMessage,
          replyToId: replyTo?.id,
          attachments,
        },
      });

      setNewMessage('');
      setReplyTo(null);
      setUploadingFiles([]);
      setPreviewFiles([]);

      // Stop typing indicator
      socketRef.current.emit('typing', { channelId, isTyping: false });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editingContent.trim() || !socketRef.current) return;

    socketRef.current.emit('edit-message', {
      messageId,
      content: editingContent,
    });

    setEditingMessageId(null);
    setEditingContent('');
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;

    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
      socketRef.current.emit('delete-message', { messageId });
    }
  };

  // Start editing
  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // Remove file from upload
  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}sa önce`;

    return date.toLocaleDateString('tr-TR');
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Render attachment
  const renderAttachment = (attachment: Attachment) => {
    if (attachment.type === 'image') {
      return (
        <div className="max-w-md mt-2 rounded-lg overflow-hidden bg-white border border-neutral-200 shadow-sm">
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
          />
          <div className="p-2 flex items-center justify-between text-xs text-neutral-600 bg-neutral-50">
            <span className="truncate">{attachment.filename}</span>
            <a
              href={attachment.url}
              download
              className="ml-2 hover:text-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      );
    }

    if (attachment.type === 'video') {
      return (
        <div className="max-w-md mt-2 rounded-lg overflow-hidden bg-white border border-neutral-200 shadow-sm">
          <video
            src={attachment.url}
            controls
            className="w-full h-auto"
          />
          <div className="p-2 flex items-center justify-between text-xs text-neutral-600 bg-neutral-50">
            <span className="truncate">{attachment.filename}</span>
            <a
              href={attachment.url}
              download
              className="ml-2 hover:text-neutral-900"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 p-3 bg-white border border-neutral-200 rounded-lg flex items-center gap-3 max-w-md hover:bg-neutral-50 hover:shadow-sm transition-all">
        <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
          <File className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-neutral-900 truncate">{attachment.filename}</div>
          <div className="text-xs text-neutral-500">{formatFileSize(attachment.size)}</div>
        </div>
        <a
          href={attachment.url}
          download
          className="text-neutral-500 hover:text-neutral-900"
        >
          <Download className="w-5 h-5" />
        </a>
      </div>
    );
  };

  return (
    <div {...getRootProps()} className="flex-1 flex flex-col bg-white relative">
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-100 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Paperclip className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <p className="text-2xl font-semibold text-blue-900">Dosyaları buraya bırakın</p>
          </div>
        </div>
      )}

      {/* Channel Header */}
      <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-xl">#</span>
          <h2 className="font-semibold text-neutral-800 text-lg">{channelName}</h2>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-neutral-500 animate-pulse">Mesajlar yükleniyor...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <span className="text-6xl mb-4 text-neutral-300">#</span>
            <p className="text-center text-lg">
              <span className="text-neutral-800 font-semibold">#{channelName}</span> kanalına hoş geldiniz!
            </p>
            <p className="text-sm mt-2 text-neutral-500">Bu kanalın başlangıcı.</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className="group hover:bg-white p-3 rounded-lg transition-colors border border-transparent hover:border-neutral-200 hover:shadow-sm"
              >
                {/* Reply indicator */}
                {message.replyTo && (
                  <div className="text-xs text-neutral-500 mb-2 ml-12 flex items-center gap-1">
                    <Reply className="w-3 h-3 text-neutral-400" />
                    <span>
                      <span className="text-blue-600 font-medium">{message.replyTo?.author?.username || 'Kullanıcı'}</span> yanıtlandı:{' '}
                      {message.replyTo.content.slice(0, 50)}
                      {message.replyTo.content.length > 50 && '...'}
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm font-bold">
                      {(message.author?.username || 'U')[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-neutral-800">
                        {message.author?.displayName || message.author?.username || 'Kullanıcı'}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatDate(message.createdAt)}
                      </span>
                      {message.updatedAt !== message.createdAt && (
                        <span className="text-xs text-neutral-400">(düzenlendi)</span>
                      )}
                      {message.status === 'sending' && (
                        <Check className="w-3 h-3 text-neutral-400" />
                      )}
                      {message.status === 'sent' && (
                        <CheckCheck className="w-3 h-3 text-blue-500" />
                      )}
                    </div>

                    {editingMessageId === message.id ? (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-white border border-neutral-300 text-neutral-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditMessage(message.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditMessage(message.id)}
                            className="text-xs"
                          >
                            Kaydet
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={cancelEditing}
                            className="text-xs"
                          >
                            İptal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-neutral-700 break-words leading-relaxed">{message.content}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="space-y-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id}>
                                {renderAttachment(attachment)}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message actions */}
                  {message.authorId === user?.id && editingMessageId !== message.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={() => startEditing(message)}
                        className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-neutral-500 hover:text-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-900 transition-colors"
                        title="Yanıtla"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-neutral-500 bg-white border-t border-neutral-200">
          <span className="inline-flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typingUsers.map((u) => u.username).join(', ')} yazıyor...
          </span>
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 flex items-center justify-between border-t border-blue-200">
          <div className="text-sm text-neutral-700 flex items-center gap-2">
            <Reply className="w-4 h-4 text-blue-600" />
            <span>
              <span className="text-blue-600 font-semibold">{replyTo.author?.username || 'Kullanıcı'}</span> kullanıcısına yanıt veriliyor
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File previews */}
      {previewFiles.length > 0 && (
        <div className="px-4 py-3 bg-white border-t border-neutral-200">
          <div className="flex gap-2 overflow-x-auto">
            {previewFiles.map((item, index) => (
              <div key={index} className="relative flex-shrink-0">
                {item.file.type.startsWith('image/') ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                  />
                ) : item.file.type.startsWith('video/') ? (
                  <div className="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200">
                    <VideoIcon className="w-8 h-8 text-neutral-500" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200">
                    <File className="w-8 h-8 text-neutral-500" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <div className="text-xs text-neutral-600 mt-1 truncate max-w-[80px]">
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-neutral-100 rounded-xl flex flex-col border border-neutral-200">
            <div className="flex items-center px-4 py-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={`#${channelName} kanalına mesaj gönder`}
                className="flex-1 bg-transparent text-neutral-900 placeholder-neutral-500 outline-none text-sm"
                disabled={isSending}
              />
              <div className="flex gap-1 ml-2 relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-all"
                  title="Emoji ekle"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-all"
                  title="Dosya ekle"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      onDrop(Array.from(e.target.files));
                    }
                  }}
                  {...getInputProps()}
                />

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl"
                  >
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={(!newMessage.trim() && uploadingFiles.length === 0) || isSending}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors text-white"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

