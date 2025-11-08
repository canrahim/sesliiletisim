import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

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

interface MessageAreaProps {
  channelName: string;
  messages: Message[];
  loading: boolean;
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
  channelName,
  messages,
  loading,
  newMessage,
  onMessageChange,
  onSendMessage,
  messagesEndRef,
}) => {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-neutral-500">Yükleniyor...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-neutral-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start space-x-3 hover:bg-white p-2 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline space-x-2">
                  <span className="font-semibold text-neutral-800">
                    {msg.user?.displayName || msg.user?.username || 'Kullanıcı'}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-neutral-700 break-words">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <form onSubmit={onSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={`#${channelName} kanalına mesaj gönder...`}
            className="flex-1 px-4 py-3 bg-neutral-100 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-neutral-900"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
          >
            <Send className="w-4 h-4" />
            <span>Gönder</span>
          </button>
        </form>
      </div>
    </>
  );
};




