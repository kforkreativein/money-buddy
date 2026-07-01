'use client';
import { Category } from '@/lib/types';
import { sortCategoriesForView, ViewMode } from '@/lib/view';

interface Props {
  categories: Category[];
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
}

export default function ViewModeBar({ categories, viewMode, onSelect }: Props) {
  if (categories.length === 0) return null;

  const sorted = sortCategoriesForView(categories);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black text-stone-400 uppercase tracking-wider px-1">👁️ View</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          onClick={() => onSelect('all')}
          className={`clay-btn flex-shrink-0 px-3 py-2.5 rounded-[12px] font-bold transition-all ${
            viewMode === 'all' ? 'clay-purple text-violet-900' : 'bg-white/70 text-stone-500 border border-stone-200 shadow-none'
          }`}>
          All
        </button>
        {sorted.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`clay-btn flex-shrink-0 px-3 py-2.5 rounded-[12px] font-bold transition-all whitespace-nowrap ${
              viewMode === cat.id ? 'clay-purple text-violet-900' : 'bg-white/70 text-stone-500 border border-stone-200 shadow-none'
            }`}>
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
