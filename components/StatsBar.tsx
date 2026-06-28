'use client';
import { useState } from 'react';
import { Transaction } from '@/lib/types';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function exportCSV(transactions: Transaction[]) {
  const headers = ['Date', 'Type', 'Amount', 'Description', 'Payment Mode', 'Bank'];
  const rows = transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(t => [t.date, t.type, t.amount, `"${t.description.replace(/"/g, '""')}"`, t.paymentMode, t.bank ?? '']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `money-buddy-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function StatsBar({ transactions }: { transactions: Transaction[] }) {
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [budget, setBudget] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('money_buddy_budget') || 0);
  });
  const [budgetDraft, setBudgetDraft] = useState('');

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const budgetPct = budget > 0 ? Math.min(expense / budget, 1) : 0;
  const overBudget = budget > 0 && expense > budget;

  function saveBudget() {
    const val = Number(budgetDraft);
    if (val > 0) {
      localStorage.setItem('money_buddy_budget', String(val));
      setBudget(val);
    } else if (budgetDraft === '0' || budgetDraft === '') {
      localStorage.removeItem('money_buddy_budget');
      setBudget(0);
    }
    setShowBudget(false);
    setBudgetDraft('');
  }

  return (
    <div className="flex flex-col gap-2">
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
        <div className={`clay flex-1 p-4 flex flex-col gap-1 ${overBudget ? 'clay-red' : 'clay-red'}`}>
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
                {overBudget ? `Over budget by ${fmt(expense - budget)}` : `${fmt(budget - expense)} left of ${fmt(budget)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: export + budget */}
      <div className="flex gap-2">
        <button
          onClick={() => exportCSV(transactions)}
          disabled={transactions.length === 0}
          className="clay-btn flex-1 py-2 rounded-[12px] font-bold text-xs text-stone-600 bg-white/70 border border-stone-200 disabled:opacity-40">
          📥 Export CSV
        </button>
        <button
          onClick={() => { setBudgetDraft(budget > 0 ? String(budget) : ''); setShowBudget(v => !v); }}
          className={`clay-btn flex-1 py-2 rounded-[12px] font-bold text-xs border ${budget > 0 ? 'clay-amber text-amber-900 border-amber-200' : 'text-stone-600 bg-white/70 border-stone-200'}`}>
          🎯 {budget > 0 ? `Budget: ${fmt(budget)}` : 'Set Budget'}
        </button>
      </div>

      {/* Budget input panel */}
      {showBudget && (
        <div className="clay animate-pop-in flex gap-2 p-3 items-center">
          <span className="text-stone-500 font-black text-sm">₹</span>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={budgetDraft}
            onChange={e => setBudgetDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveBudget()}
            placeholder="Monthly limit (0 to clear)"
            className="flex-1 bg-transparent outline-none font-bold text-stone-700 text-sm placeholder:text-stone-400"
          />
          <button onClick={saveBudget}
            className="clay-btn bg-violet-500 text-white font-black text-xs px-3 py-1.5 rounded-[10px]">
            Save
          </button>
        </div>
      )}
    </div>
  );
}
