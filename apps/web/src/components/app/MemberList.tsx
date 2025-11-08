import React from 'react';
import { Mic, MicOff, Headphones } from 'lucide-react';

interface Member {
  userId: string;
  username: string;
  displayName?: string;
  isOnline: boolean;
}

interface VoiceUser {
  userId: string;
  username: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

interface MemberListProps {
  members: Member[];
  voiceUsers: VoiceUser[];
  currentUserId?: string;
  myAudioLevel: number;
  isMuted: boolean;
  userActivities?: Record<string, { activity?: string }>;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  voiceUsers,
  currentUserId,
  myAudioLevel,
  isMuted,
  userActivities = {},
}) => {
  return (
    <div className="w-52 bg-neutral-50 border-l border-neutral-200 overflow-y-auto">
      <div className="p-3">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">
          Sunucu Üyeleri — {members.length}
        </h3>
        <div className="space-y-1">
          {members.map((member) => {
            const isInVoice = voiceUsers.some(vu => vu.userId === member.userId);
            const voiceUser = voiceUsers.find(vu => vu.userId === member.userId);
            const isSpeaking = voiceUser?.userId === currentUserId 
              ? (myAudioLevel > 0.01 && !isMuted)
              : voiceUser?.isSpeaking;

            return (
              <div
                key={member.userId}
                className={`flex items-center space-x-2 px-2 py-1.5 rounded transition-colors ${
                  isSpeaking ? 'bg-green-100' : 'hover:bg-neutral-100'
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {member.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {member.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-800 truncate">
                    {member.displayName || member.username}
                  </div>
                  {isInVoice ? (
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      {voiceUser?.isMuted ? (
                        <MicOff className="w-3 h-3 text-red-500" />
                      ) : isSpeaking ? (
                        <Mic className="w-3 h-3 text-green-500 animate-pulse" />
                      ) : (
                        <Headphones className="w-3 h-3" />
                      )}
                      <span className="text-green-600 text-xs">Ses kanalında</span>
                    </div>
                  ) : userActivities[member.userId]?.activity ? (
                    <div className="text-xs text-purple-600 font-medium truncate flex items-center gap-1">
                      🎮 {userActivities[member.userId].activity}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};



