import React, { useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  '😀 Yüzler': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳'],
  '👋 Jestler': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  '❤️ Kalpler': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  '🎉 Kutlama': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '✨', '💫', '🔥', '💯', '✅', '❌', '⚠️', '🚀', '🎯'],
  '😢 Duygular': ['😭', '😢', '😥', '😰', '😨', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️'],
  '🐶 Hayvanlar': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗'],
  '🍕 Yiyecek': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🍰', '🎂', '🧁', '🍪', '🍩', '🍫', '🍬', '🍭'],
  '⚽ Spor': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳'],
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="p-3 hover:bg-neutral-100 rounded-xl transition-all text-neutral-600 hover:text-blue-600"
        title="Emoji Ekle"
      >
        <Smile className="w-5 h-5" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-80 max-h-96 overflow-y-auto bg-white shadow-2xl rounded-2xl border-2 border-neutral-200 p-4">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs font-bold text-neutral-600 mb-2">{category}</h4>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onEmojiSelect(emoji);
                      setShowPicker(false);
                    }}
                    className="text-3xl hover:bg-blue-100 rounded-lg p-2 transition-all hover:scale-125"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

