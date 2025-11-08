import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Settings,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '../ui';
import { VideoStreamManager } from '@asforces/rtc';

interface VideoControlsProps {
  channelId: string;
  onVideoStateChange?: (enabled: boolean) => void;
  onScreenShareStateChange?: (enabled: boolean) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  channelId,
  onVideoStateChange,
  onScreenShareStateChange,
}) => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenAudioOn, setIsScreenAudioOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoManagerRef = useRef<VideoStreamManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize video manager
  useEffect(() => {
    videoManagerRef.current = new VideoStreamManager();

    // Load video devices
    loadVideoDevices();

    // Listen to events
    const manager = videoManagerRef.current;
    
    manager.on('camera-started', (info: any) => {
      console.log('Camera started:', info);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = info.stream;
      }
    });

    manager.on('camera-stopped', () => {
      console.log('Camera stopped');
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    });

    manager.on('screen-started', (info: any) => {
      console.log('Screen share started:', info);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = info.stream;
      }
    });

    manager.on('screen-stopped', () => {
      console.log('Screen share stopped');
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
      onScreenShareStateChange?.(false);
    });

    return () => {
      manager.dispose();
    };
  }, []);

  const loadVideoDevices = async () => {
    try {
      const devices = await videoManagerRef.current?.getVideoDevices();
      if (devices) {
        setVideoDevices(
          devices.map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
          }))
        );
        if (devices.length > 0 && !selectedDevice) {
          setSelectedDevice(devices[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Failed to load video devices:', err);
    }
  };

  const toggleCamera = async () => {
    if (!videoManagerRef.current) return;

    try {
      setError(null);
      
      if (isCameraOn) {
        videoManagerRef.current.stopCamera();
        setIsCameraOn(false);
        onVideoStateChange?.(false);
      } else {
        await videoManagerRef.current.startCamera({
          video: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        setIsCameraOn(true);
        onVideoStateChange?.(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Failed to access camera');
      setIsCameraOn(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!videoManagerRef.current) return;

    try {
      setError(null);
      
      if (isScreenSharing) {
        videoManagerRef.current.stopScreenShare();
        setIsScreenSharing(false);
        onScreenShareStateChange?.(false);
      } else {
        await videoManagerRef.current.startScreenShare({
          audio: true,
          systemAudio: true,
        });
        setIsScreenSharing(true);
        onScreenShareStateChange?.(true);
      }
    } catch (err: any) {
      console.error('Screen share error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing permission denied');
      } else {
        setError(err.message || 'Failed to share screen');
      }
      setIsScreenSharing(false);
    }
  };

  const toggleScreenAudio = () => {
    if (videoManagerRef.current && isScreenSharing) {
      const newState = !isScreenAudioOn;
      videoManagerRef.current.toggleScreenAudio(newState);
      setIsScreenAudioOn(newState);
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!videoManagerRef.current || !isCameraOn) return;

    try {
      await videoManagerRef.current.switchCamera(deviceId);
      setSelectedDevice(deviceId);
    } catch (err: any) {
      console.error('Failed to switch camera:', err);
      setError(err.message || 'Failed to switch camera');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        <Button
          onClick={toggleCamera}
          variant={isCameraOn ? 'primary' : 'secondary'}
          className="flex-1"
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          <span className="ml-2">{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
        </Button>

        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? 'primary' : 'secondary'}
          className="flex-1"
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
          <span className="ml-2">{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
        </Button>

        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="secondary"
          title="Video settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Screen audio toggle (only when sharing) */}
      {isScreenSharing && (
        <Button
          onClick={toggleScreenAudio}
          variant={isScreenAudioOn ? 'primary' : 'secondary'}
          size="sm"
        >
          {isScreenAudioOn ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          <span className="ml-2">System Audio</span>
        </Button>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Video Settings</h3>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Camera</label>
            <select
              value={selectedDevice}
              onChange={(e) => switchCamera(e.target.value)}
              disabled={!isCameraOn}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={loadVideoDevices} size="sm" variant="secondary" fullWidth>
            Refresh Devices
          </Button>
        </div>
      )}

      {/* Video previews */}
      <div className="grid grid-cols-2 gap-2">
        {/* Local camera preview */}
        {isCameraOn && (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
              You (Camera)
            </div>
          </div>
        )}

        {/* Screen share preview */}
        {isScreenSharing && (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
              Your Screen
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

