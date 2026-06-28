'use client';
import { useState } from 'react';
import { Transaction } from '@/lib/types';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function StatsBar({ transactions, budget }: { transactions: Transaction[]; budget: number }) {
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showNet, setShowNet] = useState(false);

  // Only count current calendar month
  const now = new Date();
  const monthly = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = monthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const budgetPct = budget > 0 ? Math.min(expense / budget, 1) : 0;
  const overBudget = budget > 0 && expense > budget;

  return (
    <div className="flex flex-col gap-2">
      {/* Month label */}
      <p className="text-xs font-black text-stone-400 uppercase tracking-wider px-1">
        📅 {currentMonthLabel()}
      </p>

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
            <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
              Expense ❤️{overBudget ? ' 🚨' : ''}
            </span>
            <button onClick={() => setShowExpense(v => !v)}
              className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity clay-btn">
              {showExpense ? '👁' : '🙈'}
            </button>
          </div>
          <span className="text-xl font-black text-red-900 tracking-tight">
            {showExpense ? fmt(expense) : '₹ ·····'}
          </span>
          {budget > 0 && (
            <div className="mt-1">
              <div className="h-1.5 rounded-full bg-red-200/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-600' : 'bg-red-400'}`}
                  style={{ width: `${budgetPct * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-red-800/70 mt-0.5">
                {overBudget ? `Over by ${fmt(expense - budget)}` : `${fmt(budget - expense)} left of ${fmt(budget)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Net Income — orange */}
      <button
        onClick={() => setShowNet(v => !v)}
        className="clay clay-amber clay-btn flex items-center justify-between px-4 py-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-amber-900">
          🟠 Net Income
        </span>
        <span className={`text-base font-black ${net >= 0 ? 'text-amber-800' : 'text-red-700'}`}>
          {showNet ? `${net >= 0 ? '+' : ''}${fmt(net)}` : '₹ ·····'}
        </span>
      </button>
    </div>
  );
}
