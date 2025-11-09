import React from 'react';
import { X } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  channelName: string;
  channelType: 'TEXT' | 'VOICE';
  onNameChange: (value: string) => void;
  onTypeChange: (type: 'TEXT' | 'VOICE') => void;
  onCreate: () => void;
  onClose: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  channelName,
  channelType,
  onNameChange,
  onTypeChange,
  onCreate,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-800">Yeni Kanal Oluştur</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Kanal Adı</label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="genel"
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Kanal Tipi</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onTypeChange('TEXT')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  channelType === 'TEXT'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-300 hover:border-blue-300'
                }`}
              >
                # Metin
              </button>
              <button
                type="button"
                onClick={() => onTypeChange('VOICE')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  channelType === 'VOICE'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-neutral-300 hover:border-blue-300'
                }`}
              >
                🔊 Sesli
              </button>
            </div>
          </div>

          <button
            onClick={onCreate}
            disabled={!channelName.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kanal Oluştur
          </button>
        </div>
      </div>
    </div>
  );
};






