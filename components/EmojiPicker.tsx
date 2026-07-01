'use client';
import { useState } from 'react';

const EMOJIS = [
  '💳', '💵', '📱', '🏦', '🏷️', '🛒', '🍔', '🚗',
  '🏠', '💼', '🎁', '📈', '✈️', '🎓', '💊', '⚡',
  '☕', '🎬', '👕', '🐾', '💡', '🎉', '❤️', '⭐',
];

interface Props {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

export default function EmojiPicker({ value, onChange, label = 'Pick icon' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="clay-btn clay w-12 h-12 flex items-center justify-center text-2xl leading-none"
        aria-label={label}
        aria-expanded={open}>
        {value || '🏷️'}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default"
            aria-label="Close icon picker"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1.5 z-[70] clay p-2.5 grid grid-cols-4 gap-1.5 shadow-lg">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={`clay-btn w-11 h-11 flex items-center justify-center text-2xl rounded-[12px] ${
                  value === emoji ? 'ring-2 ring-violet-400' : ''
                }`}>
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
