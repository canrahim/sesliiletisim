import { useCallback, useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';
import { useAudioMonitoring } from './useAudioMonitoring';

interface UseVoiceChannelOptions {
  user: any;
  selectedServer: any;
  onSuccess?: (channelId: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceChannel = ({ user, selectedServer, onSuccess, onError }: UseVoiceChannelOptions) => {
  const {
    connectedVoiceChannelId,
    voiceSocketRef,
    setConnectedVoiceChannelId,
    setVoiceUsers,
    peerConnectionsRef,
  } = useVoice();
  
  const { startAudioMonitoring, stopAudioMonitoring } = useAudioMonitoring();
  
  const joinChannel = useCallback(async (channelId: string) => {
    if (!user || !selectedServer || !voiceSocketRef.current) {
      onError?.('Gerekli bilgiler eksik');
      return;
    }
    
    try {
      setConnectedVoiceChannelId(channelId);
      
      // Mikrofonu başlat
      const success = await startAudioMonitoring(user);
      if (!success) {
        console.error('❌ Mikrofon başlatılamadı');
        setConnectedVoiceChannelId(null);
        onError?.('Mikrofon erişimi reddedildi');
        return;
      }
      
      // Sesli kanala katıl
      voiceSocketRef.current.emit('join-voice', {
        roomId: selectedServer.id,
        channelId: channelId,
        userId: user.id,
        username: user.username
      });
      
      // Kendini voice users'a ekle
      setVoiceUsers([{
        userId: user.id,
        username: user.username,
        isMuted: false,
        isSpeaking: false,
        hasScreenAudio: false,
      }]);
      
      // LocalStorage'a kaydet
      localStorage.setItem('lastVoiceChannel', JSON.stringify({
        channelId,
        serverId: selectedServer.id,
        timestamp: Date.now()
      }));
      
      console.log('✅ Joined voice channel:', channelId);
      onSuccess?.(channelId);
    } catch (error) {
      console.error('❌ Voice channel join error:', error);
      setConnectedVoiceChannelId(null);
      onError?.('Sesli kanala katılınamadı');
    }
  }, [user, selectedServer, voiceSocketRef, setConnectedVoiceChannelId, startAudioMonitoring, setVoiceUsers, onSuccess, onError]);
  
  const leaveChannel = useCallback(() => {
    if (!voiceSocketRef.current) return;
    
    stopAudioMonitoring();
    voiceSocketRef.current.emit('leave-voice');
    setConnectedVoiceChannelId(null);
    setVoiceUsers([]);
    
    // Peer connections'ı temizle
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    localStorage.removeItem('lastVoiceChannel');
    
    console.log('🚪 Left voice channel');
  }, [voiceSocketRef, stopAudioMonitoring, setConnectedVoiceChannelId, setVoiceUsers, peerConnectionsRef]);
  
  return {
    connectedVoiceChannelId,
    joinChannel,
    leaveChannel,
    isConnected: !!connectedVoiceChannelId,
  };
};

