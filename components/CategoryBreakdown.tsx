'use client';
import { useState } from 'react';
import { Transaction, Category } from '@/lib/types';
import { CategoryTransfer } from '@/lib/types';
import { computeCategoryTotals, fmt } from '@/lib/insights';

interface Props {
  transactions: Transaction[];
  transfers: CategoryTransfer[];
  categories: Category[];
}

export default function CategoryBreakdown({ transactions, transfers, categories }: Props) {
  const [show, setShow] = useState(false);
  if (categories.length === 0) return null;

  const rows = [
    ...categories.map(cat => ({ cat, totals: computeCategoryTotals(transactions, transfers, cat.id, true) })),
    { cat: null as Category | null, totals: computeCategoryTotals(transactions, transfers, null, true) },
  ].filter(r => r.totals.income > 0 || r.totals.expense > 0 || r.totals.transferIn > 0 || r.totals.transferOut > 0);

  if (rows.length === 0) return null;

  return (
    <div className="clay flex flex-col">
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>🏷️ Category Breakdown (this month)</span>
        <span className="text-stone-400 text-xs">{show ? '▲' : '▼'}</span>
      </button>
      {show && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {rows.map(({ cat, totals }) => (
            <div key={cat?.id ?? 'none'} className="clay p-3 flex flex-col gap-1">
              <p className="text-sm font-black text-stone-800">{cat ? `${cat.emoji} ${cat.name}` : '— Uncategorized'}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                <span className="text-emerald-600">In {fmt(totals.income)}</span>
                <span className="text-rose-500">Out {fmt(totals.expense)}</span>
                {totals.transferIn > 0 && <span className="text-violet-600">↙ {fmt(totals.transferIn)}</span>}
                {totals.transferOut > 0 && <span className="text-violet-600">↗ {fmt(totals.transferOut)}</span>}
                <span className={totals.net >= 0 ? 'text-amber-700' : 'text-red-600'}>
                  Net {totals.net >= 0 ? '+' : ''}{fmt(totals.net)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
