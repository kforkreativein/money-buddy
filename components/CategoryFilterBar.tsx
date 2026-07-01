'use client';
import { ExpenseCategory } from '@/lib/types';

interface Props {
  categories: ExpenseCategory[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  if (categories.length === 0) return null;

  const chips: { id: string | null; label: string; emoji?: string }[] = [
    { id: null, label: 'All' },
    ...categories.map(c => ({ id: c.id, label: c.name, emoji: c.emoji })),
    { id: '__none', label: 'Uncategorized' },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black text-stone-400 uppercase tracking-wider px-1">🏷️ Filter by category</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {chips.map(chip => (
          <button
            key={chip.id ?? 'all'}
            type="button"
            onClick={() => onSelect(chip.id)}
            className={`clay-btn flex-shrink-0 px-3 py-2 rounded-[12px] font-bold text-sm transition-all ${
              selected === chip.id
                ? 'clay-purple text-violet-900'
                : 'bg-white/70 text-stone-500 border border-stone-200 shadow-none'
            }`}>
            {chip.emoji ? `${chip.emoji} ` : ''}{chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
