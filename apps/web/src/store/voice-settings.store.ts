import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AudioQuality = 'auto' | 'low' | 'medium' | 'high'; // kbps: auto, 32, 64, 128

interface VoiceSettingsState {
  microphoneId: string | 'default';
  speakerId: string | 'default';
  inputVolume: number; // 0-100
  outputVolume: number; // 0-100
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  pushToTalk: boolean;
  pttKeybind: string; // e.g., 'Space'
  vadEnabled: boolean;
  vadSensitivity: number; // 0-100
  audioQuality: AudioQuality;
  bitrate: number; // Actual bitrate in kbps

  setMicrophoneId: (id: string) => void;
  setSpeakerId: (id: string) => void;
  setInputVolume: (volume: number) => void;
  setOutputVolume: (volume: number) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setAutoGainControl: (enabled: boolean) => void;
  setPushToTalk: (enabled: boolean) => void;
  setPttKeybind: (key: string) => void;
  setVadEnabled: (enabled: boolean) => void;
  setVadSensitivity: (sensitivity: number) => void;
  setAudioQuality: (quality: AudioQuality) => void;
  setBitrate: (bitrate: number) => void;
}

export const useVoiceSettingsStore = create<VoiceSettingsState>()(
  persist(
    (set, get) => ({
      microphoneId: 'default',
      speakerId: 'default',
      inputVolume: 100,
      outputVolume: 100,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      pushToTalk: false,
      pttKeybind: 'Space',
      vadEnabled: true,
      vadSensitivity: 50,
      audioQuality: 'auto',
      bitrate: 64, // Default to medium

      setMicrophoneId: (id) => set({ microphoneId: id }),
      setSpeakerId: (id) => set({ speakerId: id }),
      setInputVolume: (volume) => set({ inputVolume: volume }),
      setOutputVolume: (volume) => set({ outputVolume: volume }),
      setEchoCancellation: (enabled) => set({ echoCancellation: enabled }),
      setNoiseSuppression: (enabled) => set({ noiseSuppression: enabled }),
      setAutoGainControl: (enabled) => set({ autoGainControl: enabled }),
      setPushToTalk: (enabled) => set({ pushToTalk: enabled }),
      setPttKeybind: (key) => set({ pttKeybind: key }),
      setVadEnabled: (enabled) => set({ vadEnabled: enabled }),
      setVadSensitivity: (sensitivity) => set({ vadSensitivity: sensitivity }),
      setAudioQuality: (quality) => {
        let newBitrate = get().bitrate;
        switch (quality) {
          case 'low':
            newBitrate = 32;
            break;
          case 'medium':
            newBitrate = 64;
            break;
          case 'high':
            newBitrate = 128;
            break;
          case 'auto':
          default:
            newBitrate = 64; // Default for auto
            break;
        }
        set({ audioQuality: quality, bitrate: newBitrate });
      },
      setBitrate: (bitrate) => set({ bitrate: bitrate }),
    }),
    {
      name: 'asforces-voice-settings',
    }
  )
);
