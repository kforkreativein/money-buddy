'use client';
import { useState, useMemo } from 'react';
import { Category, Transaction, CategoryTransfer } from '@/lib/types';
import { computeCategoryTotals, fmt, isCurrentMonth } from '@/lib/insights';
import { walletNetBalance } from '@/lib/wallets';

interface Props {
  categories: Category[];
  transactions: Transaction[];
  transfers: CategoryTransfer[];
}

export default function AffordCheckCard({ categories, transactions, transfers }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const result = useMemo(() => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0 || !categoryId) return null;

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return null;

    const monthly = transactions.filter(t => isCurrentMonth(t.date));
    const totals = computeCategoryTotals(monthly, transfers.filter(t => isCurrentMonth(t.date)), categoryId, false);
    const budgetLeft = cat.budget > 0 ? cat.budget - totals.expense : null;
    const walletBal = cat.walletId ? walletNetBalance(cat.walletId, transactions) : null;

    const budgetOk = budgetLeft === null || amt <= budgetLeft;
    const walletOk = walletBal === null || amt <= walletBal;
    const canAfford = budgetOk && walletOk;

    return { cat, budgetLeft, walletBal, budgetOk, walletOk, canAfford, amt };
  }, [amount, categoryId, categories, transactions, transfers]);

  if (categories.length === 0) return null;

  return (
    <div className="clay flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>🤔 Can I afford this?</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-stone-500">Quick check against your category budget and linked wallet.</p>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="clay w-full px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none">
            <option value="">Pick category…</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
          <div className="flex gap-2 items-center">
            <span className="font-black text-stone-500">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Amount you want to spend"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none"
            />
          </div>
          {result && (
            <div className={`clay p-3 flex flex-col gap-1.5 ${result.canAfford ? 'bg-emerald-50/80' : 'bg-rose-50/80'}`}>
              <p className={`text-sm font-black ${result.canAfford ? 'text-emerald-800' : 'text-rose-700'}`}>
                {result.canAfford ? `Yes — you can afford ${fmt(result.amt)}` : `Careful — ${fmt(result.amt)} may be tight`}
              </p>
              {result.budgetLeft !== null && (
                <p className="text-xs font-semibold text-stone-600">
                  {result.budgetOk
                    ? `${fmt(result.budgetLeft)} left in ${result.cat.name} budget this month`
                    : `Over ${result.cat.name} budget by ${fmt(result.amt - result.budgetLeft!)}`}
                </p>
              )}
              {result.walletBal !== null && (
                <p className="text-xs font-semibold text-stone-600">
                  {result.walletOk
                    ? `Linked wallet balance: ${fmt(result.walletBal)}`
                    : `Wallet short by ${fmt(result.amt - result.walletBal!)}`}
                </p>
              )}
              {result.budgetLeft === null && result.walletBal === null && (
                <p className="text-xs font-semibold text-stone-500">Set a budget or link a wallet in Settings for smarter checks.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
