import { useCallback } from 'react';
import { useVoice } from '../context/VoiceContext';
import { RTC_CONFIG } from '../utils/constants';

export const useWebRTC = (username: string) => {
  const {
    peerConnectionsRef,
    voiceSocketRef,
    localStreamRef,
    setRemoteUsers,
  } = useVoice();
  
  const createPeerConnection = useCallback((peerId: string, peerUsername: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      console.warn('⚠️ Peer already exists:', peerId);
      return null;
    }
    
    const pc = new RTCPeerConnection(RTC_CONFIG);
    
    // Connection monitoring
    pc.onconnectionstatechange = () => {
      console.log(`📡 Connection state for ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log(`✅ Successfully connected to ${peerUsername}`);
      } else if (pc.connectionState === 'failed') {
        console.error(`❌ Connection failed to ${peerUsername}`);
        setTimeout(() => {
          pc.close();
          peerConnectionsRef.current.delete(peerId);
        }, 1000);
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE state for ${peerId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };
    
    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && voiceSocketRef.current) {
        voiceSocketRef.current.emit('signal', {
          type: 'ice-candidate',
          to: peerId,
          data: event.candidate
        });
      }
    };
    
    // Remote tracks
    pc.ontrack = (event) => {
      console.log('🎧 Received track from:', peerUsername, 'Kind:', event.track.kind, 'Label:', event.track.label);
      const [remoteStream] = event.streams;
      
      if (remoteStream) {
        setRemoteUsers(prev => {
          const existing = prev.find(u => u.userId === peerId);
          if (existing) {
            return prev.map(u => u.userId === peerId ? { ...u, stream: remoteStream } : u);
          }
          return [...prev, { userId: peerId, username: peerUsername, stream: remoteStream }];
        });
        
        // Handle audio tracks (mikrofon only, sistem sesi via video element)
        if (event.track.kind === 'audio') {
          const trackLabel = (event.track.label || '').toLowerCase();
          const isSystemAudio = trackLabel.includes('tab') || trackLabel.includes('screen');
          
          if (isSystemAudio) {
            console.log('🔈 System audio track - will play via video element');
            return;
          }
          
          // Create audio element for microphone
          const audio = document.createElement('audio');
          audio.srcObject = new MediaStream([event.track]);
          audio.autoplay = true;
          audio.id = `audio-${peerId}-${event.track.id}`;
          audio.style.display = 'none';
          document.body.appendChild(audio);
          
          audio.play().catch(err => {
            console.error('❌ Audio play failed:', err);
          });
          
          event.track.onended = () => {
            const el = document.getElementById(audio.id);
            if (el) el.remove();
          };
        }
      }
    };
    
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    
    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [peerId, voiceSocketRef, localStreamRef, peerConnectionsRef, setRemoteUsers]);
  
  const closePeerConnection = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    
    // Remove audio elements
    document.querySelectorAll(`audio[id^="audio-${peerId}"]`).forEach(el => el.remove());
    
    setRemoteUsers(prev => prev.filter(u => u.userId !== peerId));
  }, [peerConnectionsRef, setRemoteUsers]);
  
  return {
    createPeerConnection,
    closePeerConnection,
  };
};

