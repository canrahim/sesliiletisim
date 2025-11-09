import React from 'react';
import { Download, File, Image, Video, X } from 'lucide-react';

interface FilePreviewProps {
  file: {
    url: string;
    filename: string;
    size: number;
    type: string;
  };
  onDownload?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  onDownload, 
  onDelete,
  showDelete = false 
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  return (
    <div className="group relative">
      {/* Image Preview */}
      {isImage && (
        <div className="relative rounded-2xl overflow-hidden max-w-sm border-2 border-neutral-200">
          <img 
            src={file.url} 
            alt={file.filename}
            className="w-full h-auto max-h-96 object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-3 bg-white hover:bg-neutral-100 rounded-xl transition-all"
                title="İndir"
              >
                <Download className="w-5 h-5 text-neutral-800" />
              </button>
            )}
            {showDelete && onDelete && (
              <button
                onClick={onDelete}
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all"
                title="Sil"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-white text-sm font-medium truncate">{file.filename}</p>
            <p className="text-white/80 text-xs">{formatFileSize(file.size)}</p>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {isVideo && (
        <div className="relative rounded-2xl overflow-hidden max-w-md border-2 border-neutral-200">
          <video 
            src={file.url} 
            controls
            className="w-full h-auto max-h-96"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 bg-white/90 hover:bg-white rounded-lg transition-all"
                title="İndir"
              >
                <Download className="w-4 h-4 text-neutral-800" />
              </button>
            )}
            {showDelete && onDelete && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                title="Sil"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Generic File */}
      {!isImage && !isVideo && (
        <div className="flex items-center gap-3 p-4 bg-neutral-100 border-2 border-neutral-200 rounded-xl max-w-sm hover:bg-neutral-200 transition-all">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <File className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-800 truncate">{file.filename}</p>
            <p className="text-sm text-neutral-600">{formatFileSize(file.size)}</p>
          </div>
          <div className="flex gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                title="İndir"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {showDelete && onDelete && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                title="Sil"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};





