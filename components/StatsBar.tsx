'use client';
import { useState } from 'react';
import { Transaction } from '@/lib/types';

export default function StatsBar({ transactions }: { transactions: Transaction[] }) {
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="flex gap-3">
      {/* Income card */}
      <div className="clay-green clay flex-1 p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Income 💚</span>
          <button onClick={() => setShowIncome(v => !v)}
            className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity clay-btn">
            {showIncome ? '👁' : '🙈'}
          </button>
        </div>
        <span className="text-xl font-black text-emerald-900 tracking-tight">
          {showIncome ? fmt(income) : '₹ ·····'}
        </span>
      </div>

      {/* Expense card */}
      <div className="clay-red clay flex-1 p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-red-900 uppercase tracking-wide">Expense ❤️</span>
          <button onClick={() => setShowExpense(v => !v)}
            className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity clay-btn">
            {showExpense ? '👁' : '🙈'}
          </button>
        </div>
        <span className="text-xl font-black text-red-900 tracking-tight">
          {showExpense ? fmt(expense) : '₹ ·····'}
        </span>
      </div>
    </div>
  );
}
