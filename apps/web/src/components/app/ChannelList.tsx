import React from 'react';
import { Hash, Volume2, Plus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  serverId: string;
}

interface ChannelListProps {
  textChannels: Channel[];
  voiceChannels: Channel[];
  selectedChannel: Channel | null;
  connectedVoiceChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onCreateChannel: () => void;
  voiceUsers: Array<{ userId: string; username: string }>;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  textChannels,
  voiceChannels,
  selectedChannel,
  connectedVoiceChannelId,
  onSelectChannel,
  onJoinVoice,
  onLeaveVoice,
  onCreateChannel,
  voiceUsers,
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Text Channels */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Metin Kanalları</h3>
          <button
            onClick={onCreateChannel}
            className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-neutral-800 transition-colors"
            title="Kanal Oluştur"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1 px-2">
          {textChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                selectedChannel?.id === channel.id
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Channels */}
      <div>
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Sesli Kanallar</h3>
        </div>
        <div className="space-y-1 px-2">
          {voiceChannels.map((channel) => {
            const isConnected = connectedVoiceChannelId === channel.id;
            const channelUsers = voiceUsers.filter(() => connectedVoiceChannelId === channel.id);

            return (
              <div key={channel.id} className="mb-1">
                <button
                  onClick={() => {
                    if (isConnected) {
                      onLeaveVoice();
                    } else {
                      onJoinVoice(channel.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
                    isConnected
                      ? 'bg-green-100 text-green-700'
                      : selectedChannel?.id === channel.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Volume2 className={`w-4 h-4 flex-shrink-0 ${isConnected ? 'text-green-600' : ''}`} />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  {channelUsers.length > 0 && (
                    <span className="text-xs bg-neutral-200 px-2 py-0.5 rounded-full">
                      {channelUsers.length}
                    </span>
                  )}
                </button>

                {/* Voice users in this channel */}
                {isConnected && channelUsers.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {channelUsers.map((vu) => (
                      <div key={vu.userId} className="flex items-center space-x-2 px-3 py-1 text-sm text-neutral-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="truncate">{vu.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};






