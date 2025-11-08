import React, { useEffect, useRef } from 'react';
import { Monitor, Video, X, Maximize2, Minimize2 } from 'lucide-react';

interface RemoteUser {
  userId: string;
  username: string;
  stream?: MediaStream;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
}

interface RemoteMediaPanelProps {
  remoteUsers: RemoteUser[];
  layout: 'grid' | 'speaker';
  onLayoutChange: (layout: 'grid' | 'speaker') => void;
  onClose?: () => void;
}

export const RemoteMediaPanel: React.FC<RemoteMediaPanelProps> = ({
  remoteUsers,
  layout,
  onLayoutChange,
  onClose,
}) => {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Attach streams to video elements
    remoteUsers.forEach(user => {
      if (user.stream) {
        const videoEl = videoRefs.current.get(user.userId);
        if (videoEl) {
          videoEl.srcObject = user.stream;
        }
      }
    });
  }, [remoteUsers]);

  const gridCols = Math.ceil(Math.sqrt(remoteUsers.length));
  
  return (
    <div className="fixed top-0 right-0 bottom-20 w-[400px] bg-neutral-900 z-40 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5" />
          <div>
            <p className="font-bold">Paylaşımlar</p>
            <p className="text-xs text-blue-100">{remoteUsers.length} kişi</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layout Toggle */}
          <button
            onClick={() => onLayoutChange(layout === 'grid' ? 'speaker' : 'grid')}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            title={layout === 'grid' ? 'Speaker View' : 'Grid View'}
          >
            {layout === 'grid' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Video Grid/Speaker View */}
      <div className={`flex-1 overflow-y-auto p-4 ${
        layout === 'grid' 
          ? `grid gap-4` 
          : 'flex flex-col gap-4'
      }`} style={layout === 'grid' ? { gridTemplateColumns: `repeat(${gridCols}, 1fr)` } : {}}>
        {remoteUsers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <Monitor className="w-16 h-16 mx-auto mb-3 text-neutral-600" />
              <p className="font-medium">Henüz paylaşım yok</p>
              <p className="text-sm mt-1">Birisi ekran veya kamera paylaşınca burada görünecek</p>
            </div>
          </div>
        ) : (
          remoteUsers.map(user => (
            <div
              key={user.userId}
              className={`relative bg-black rounded-xl overflow-hidden ${
                layout === 'speaker' && remoteUsers.length > 1 ? 'aspect-video' : ''
              }`}
            >
              {/* Video Element */}
              <video
                ref={(el) => {
                  if (el) videoRefs.current.set(user.userId, el);
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              
              {/* User Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{user.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {user.isScreenSharing && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <Monitor className="w-3 h-3" />
                            Ekran
                          </span>
                        )}
                        {user.isVideoOn && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Video className="w-3 h-3" />
                            Kamera
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* PiP Button */}
                  <button
                    onClick={() => {
                      const videoEl = videoRefs.current.get(user.userId);
                      if (videoEl && 'pictureInPictureEnabled' in document) {
                        if (document.pictureInPictureElement) {
                          document.exitPictureInPicture();
                        } else {
                          videoEl.requestPictureInPicture();
                        }
                      }
                    }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                    title="Picture-in-Picture"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};



