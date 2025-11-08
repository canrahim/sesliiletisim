import React, { useState } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';

interface ScreenShareButtonProps {
  onStartShare: (stream: MediaStream) => void;
  onStopShare: () => void;
  isSharing: boolean;
}

export const ScreenShareButton: React.FC<ScreenShareButtonProps> = ({
  onStartShare,
  onStopShare,
  isSharing,
}) => {
  const [error, setError] = useState<string>('');

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: false,
      });

      // Listen for user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        onStopShare();
      };

      onStartShare(stream);
      setError('');
    } catch (err: any) {
      console.error('Screen share error:', err);
      setError('Ekran paylaşımı başlatılamadı');
    }
  };

  const stopScreenShare = () => {
    onStopShare();
  };

  return (
    <div className="relative">
      <button
        onClick={isSharing ? stopScreenShare : startScreenShare}
        className={`p-3 rounded-xl transition-all shadow-md ${
          isSharing
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-neutral-100 hover:bg-blue-500 text-neutral-700 hover:text-white'
        }`}
        title={isSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
      >
        {isSharing ? (
          <MonitorOff className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </button>

      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};



