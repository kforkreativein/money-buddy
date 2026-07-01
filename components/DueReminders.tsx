'use client';
import { useMemo } from 'react';
import { getRules } from '@/lib/recurring';
import { getCategoryById } from '@/lib/categories';
import { fmt } from '@/lib/insights';

const TYPE_LABEL: Record<string, string> = {
  income: '💚 Income',
  expense: '❤️ Expense',
  investment: '📈 Investment',
};

export default function DueReminders() {
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const week = new Date();
    week.setDate(week.getDate() + 7);
    const weekStr = week.toISOString().slice(0, 10);
    return getRules()
      .filter(r => r.nextDue >= today && r.nextDue <= weekStr)
      .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  }, []);

  if (upcoming.length === 0) return null;

  return (
    <div className="clay p-4 flex flex-col gap-2">
      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">⏰ Due This Week</h3>
      {upcoming.map(r => {
        const cat = r.categoryId ? getCategoryById(r.categoryId) : null;
        const days = Math.ceil((new Date(r.nextDue).getTime() - Date.now()) / 86400000);
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-stone-100 last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-800 truncate">{r.description || TYPE_LABEL[r.type]}</p>
              <p className="text-xs font-semibold text-stone-500">
                {TYPE_LABEL[r.type]} · {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                {cat ? ` · ${cat.emoji} ${cat.name}` : ''}
              </p>
            </div>
            <span className="text-sm font-black text-stone-700 shrink-0">{fmt(r.amount)}</span>
          </div>
        );
      })}
    </div>
  );
}
