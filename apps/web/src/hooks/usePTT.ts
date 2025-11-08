import { useEffect } from 'react';
import { useVoice } from '../context/VoiceContext';

export const usePTT = (connectedVoiceChannelId: string | null) => {
  const {
    isPushToTalkMode,
    pushToTalkActive,
    setPushToTalkActive,
    isMuted,
    setIsMuted,
  } = useVoice();
  
  useEffect(() => {
    if (!isPushToTalkMode || !connectedVoiceChannelId) return;
    
    const pttKey = localStorage.getItem('pttKey') || 'Space';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const parts = pttKey.split('+');
      const key = parts[parts.length - 1];
      const needsCtrl = parts.includes('Ctrl');
      const needsAlt = parts.includes('Alt');
      const needsShift = parts.includes('Shift');
      
      const keyMatch = e.code === key || e.key === key || (key === 'Space' && e.key === ' ');
      const modMatch = e.ctrlKey === needsCtrl && e.altKey === needsAlt && e.shiftKey === needsShift;
      
      if (keyMatch && modMatch) {
        e.preventDefault();
        if (!pushToTalkActive) {
          setPushToTalkActive(true);
          if (isMuted) setIsMuted(false);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const parts = pttKey.split('+');
      const key = parts[parts.length - 1];
      const keyMatch = e.code === key || e.key === key || (key === 'Space' && e.key === ' ');
      
      if (keyMatch && pushToTalkActive) {
        e.preventDefault();
        setPushToTalkActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPushToTalkMode, connectedVoiceChannelId, pushToTalkActive, isMuted, setPushToTalkActive, setIsMuted]);
  
  const togglePTTMode = () => {
    const newMode = !isPushToTalkMode;
    useVoice().setIsPushToTalkMode(newMode);
    localStorage.setItem('pushToTalk', String(newMode));
    return newMode;
  };
  
  return {
    isPushToTalkMode,
    pushToTalkActive,
    togglePTTMode,
  };
};

