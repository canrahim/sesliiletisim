import React, { useState } from 'react';
import { Video, VideoOff } from 'lucide-react';

interface VideoButtonProps {
  onStartVideo: (stream: MediaStream) => void;
  onStopVideo: () => void;
  isVideoOn: boolean;
}

export const VideoButton: React.FC<VideoButtonProps> = ({
  onStartVideo,
  onStopVideo,
  isVideoOn,
}) => {
  const [error, setError] = useState<string>('');

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false, // Sadece video, ses ayrı
      });

      onStartVideo(stream);
      setError('');
    } catch (err: any) {
      console.error('Video start error:', err);
      setError('Kamera erişimi reddedildi');
    }
  };

  const stopVideo = () => {
    onStopVideo();
  };

  return (
    <div className="relative">
      <button
        onClick={isVideoOn ? stopVideo : startVideo}
        className={`p-3 rounded-xl transition-all shadow-md ${
          isVideoOn
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-neutral-100 hover:bg-green-500 text-neutral-700 hover:text-white'
        }`}
        title={isVideoOn ? 'Kamerayı Kapat' : 'Kamera Aç'}
      >
        {isVideoOn ? (
          <VideoOff className="w-5 h-5" />
        ) : (
          <Video className="w-5 h-5" />
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



