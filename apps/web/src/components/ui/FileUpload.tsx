import React, { useRef } from 'react';
import { Paperclip, Image, File, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onCancel?: () => void;
  selectedFile?: File | null;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  onCancel,
  selectedFile,
  accept = "image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Dosya boyutu 10MB\'dan küçük olmalı');
        return;
      }
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-600" />;
    if (file.type.startsWith('video/')) return <File className="w-5 h-5 text-purple-600" />;
    return <File className="w-5 h-5 text-neutral-600" />;
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
          {getFileIcon(selectedFile)}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-800 truncate">{selectedFile.name}</p>
            <p className="text-xs text-neutral-600">{formatFileSize(selectedFile.size)}</p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-all"
              title="İptal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 hover:bg-neutral-100 rounded-xl transition-all text-neutral-600 hover:text-blue-600"
          title="Dosya Ekle"
        >
          <Paperclip className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};





