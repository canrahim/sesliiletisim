import { useRef, useCallback } from 'react';
import { useVoice } from '../context/VoiceContext';

export const useAudioMonitoring = () => {
  const {
    voiceSocketRef,
    localStreamRef,
    audioContextRef,
    audioAnalyserRef,
    isMuted,
    isPushToTalkMode,
    pushToTalkActive,
    setMyAudioLevel,
    setVoiceUsers,
  } = useVoice();
  
  const audioLevelIntervalRef = useRef<number | null>(null);
  const previousEffectiveMuteRef = useRef<boolean | null>(null);
  
  const startAudioMonitoring = useCallback(async (user: any): Promise<boolean> => {
    try {
      console.log('🎙️ Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      const effectiveMuted = isMuted || (isPushToTalkMode && !pushToTalkActive);
      const shouldEnableTrack = !effectiveMuted;
      
      stream.getTracks().forEach(track => track.enabled = shouldEnableTrack);
      localStreamRef.current = stream;
      previousEffectiveMuteRef.current = effectiveMuted;
      
      if (user) {
        setVoiceUsers(prev =>
          prev.map(u => (u.userId === user.id ? { ...u, isMuted: effectiveMuted } : u)),
        );
      }
      
      if (voiceSocketRef.current?.connected) {
        voiceSocketRef.current.emit('toggle-mute', { muted: effectiveMuted });
        console.log('🎛️ Initial toggle-mute sent:', effectiveMuted);
      }
      
      console.log('✅ Microphone stream acquired');
      
      // Audio context setup
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioAnalyserRef.current = audioContextRef.current.createAnalyser();
      
      audioAnalyserRef.current.fftSize = 512;
      audioAnalyserRef.current.minDecibels = -100;
      audioAnalyserRef.current.maxDecibels = -10;
      audioAnalyserRef.current.smoothingTimeConstant = 0.2;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(audioAnalyserRef.current);
      
      const dataArray = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
      let lastSpeakingState = false;
      
      audioLevelIntervalRef.current = window.setInterval(() => {
        if (!audioAnalyserRef.current || isMuted || (isPushToTalkMode && !pushToTalkActive)) {
          if (lastSpeakingState && voiceSocketRef.current) {
            voiceSocketRef.current.emit('speaking', { isSpeaking: false });
            if (user) {
              setVoiceUsers(prev =>
                prev.map(u => (u.userId === user.id ? { ...u, isSpeaking: false } : u)),
              );
            }
            lastSpeakingState = false;
          }
          setMyAudioLevel(0);
          return;
        }
        
        audioAnalyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        let count = 0;
        for (let i = 1; i < Math.min(48, dataArray.length); i++) {
          sum += dataArray[i];
          count++;
        }
        const average = count > 0 ? sum / count : 0;
        const level = average / 255;
        
        setMyAudioLevel(level);
        
        const isSpeaking = level > 0.01;
        if (isSpeaking !== lastSpeakingState && voiceSocketRef.current) {
          voiceSocketRef.current.emit('speaking', { isSpeaking });
          
          if (user) {
            setVoiceUsers(prev => prev.map(u => 
              u.userId === user.id ? { ...u, isSpeaking } : u
            ));
          }
          
          lastSpeakingState = isSpeaking;
        }
      }, 80);
      
      console.log('✅ Audio monitoring started');
      return true;
    } catch (error) {
      console.error('❌ Mikrofon erişim hatası:', error);
      return false;
    }
  }, [isMuted, isPushToTalkMode, pushToTalkActive, voiceSocketRef, localStreamRef, audioContextRef, audioAnalyserRef, setMyAudioLevel, setVoiceUsers]);
  
  const stopAudioMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn('AudioContext close failed:', e));
      audioContextRef.current = null;
    }
    
    audioAnalyserRef.current = null;
    setMyAudioLevel(0);
    previousEffectiveMuteRef.current = null;
    
    console.log('🧹 Audio monitoring stopped');
  }, [localStreamRef, audioContextRef, audioAnalyserRef, setMyAudioLevel]);
  
  return {
    startAudioMonitoring,
    stopAudioMonitoring,
  };
};

