import React from 'react';
import { X } from 'lucide-react';

interface CreateServerModalProps {
  isOpen: boolean;
  serverName: string;
  serverDescription: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({
  isOpen,
  serverName,
  serverDescription,
  onNameChange,
  onDescriptionChange,
  onCreate,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-800">Yeni Sunucu Oluştur</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Sunucu Adı</label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Benim Sunucum"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Açıklama (Opsiyonel)</label>
            <textarea
              value={serverDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Sunucu açıklaması..."
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={onCreate}
            disabled={!serverName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sunucu Oluştur
          </button>
        </div>
      </div>
    </div>
  );
};






