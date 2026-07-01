'use client';
import { useState } from 'react';
import { Category, Transaction, CategoryTransfer } from '@/lib/types';
import { getPreviousMonthSummary, fmt } from '@/lib/insights';

interface Props {
  transactions: Transaction[];
  transfers: CategoryTransfer[];
  categories: Category[];
}

export default function MonthlyCloseCard({ transactions, transfers, categories }: Props) {
  const summary = getPreviousMonthSummary(transactions, transfers, categories);
  const isEarlyMonth = new Date().getDate() <= 7;
  const [open, setOpen] = useState(isEarlyMonth);

  const hasData = summary.income > 0 || summary.expense > 0 || summary.categoryRows.some(r => r.expense > 0);

  if (!hasData) return null;

  return (
    <div className="clay flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>📋 {summary.label} — Month Close</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-emerald-600 font-black">+{fmt(summary.income)}</span><span className="text-stone-400 text-xs block">Income</span></div>
            <div><span className="text-rose-500 font-black">-{fmt(summary.expense)}</span><span className="text-stone-400 text-xs block">Expense</span></div>
            <div><span className="text-blue-600 font-black">{fmt(summary.investment)}</span><span className="text-stone-400 text-xs block">Invested</span></div>
            <div><span className={`font-black ${summary.net >= 0 ? 'text-amber-700' : 'text-rose-600'}`}>{summary.net >= 0 ? '+' : ''}{fmt(summary.net)}</span><span className="text-stone-400 text-xs block">Net</span></div>
          </div>
          {summary.categoryRows.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-black text-stone-400 uppercase tracking-wide">By category</p>
              {summary.categoryRows.map(row => (
                <div key={row.categoryId} className="clay px-3 py-2 flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-700">{row.emoji} {row.name}</span>
                  <span className="font-black text-stone-600">
                    spent {fmt(row.expense)}
                    {row.budget > 0 && (
                      <span className={row.expense > row.budget ? ' text-rose-500' : ' text-emerald-600'}>
                        {' '}/ {fmt(row.budget)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          {summary.transferTotal > 0 && (
            <p className="text-xs font-semibold text-violet-700">
              Category transfers last month: {fmt(summary.transferTotal)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
