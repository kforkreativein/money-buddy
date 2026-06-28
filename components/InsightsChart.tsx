'use client';
import { Transaction } from '@/lib/types';

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short' });
}

export default function InsightsChart({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return null;

  const now = new Date();
  const months: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const data = months.map(key => {
    const txns = transactions.filter(t => monthKey(t.date) === key);
    return {
      key,
      label: monthLabel(key),
      income: txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  if (!data.some(d => d.income > 0 || d.expense > 0)) return null;

  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);

  return (
    <div className="clay p-4 flex flex-col gap-3">
      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">📊 Monthly Overview</h3>
      <div className="flex items-end gap-3 h-24">
        {data.map(d => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end" style={{ height: '80px' }}>
              <div
                className="flex-1 rounded-t-[6px] clay-green transition-all duration-500"
                style={{ height: `${(d.income / max) * 100}%`, minHeight: d.income > 0 ? '4px' : '0' }}
              />
              <div
                className="flex-1 rounded-t-[6px] clay-red transition-all duration-500"
                style={{ height: `${(d.expense / max) * 100}%`, minHeight: d.expense > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-xs font-bold text-stone-400">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs font-bold text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm clay-green inline-block" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm clay-red inline-block" />
          Expense
        </span>
      </div>
    </div>
  );
}
