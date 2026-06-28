'use client';
import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { playIncomeSound, playExpenseSound, getSadnessLevel } from '@/lib/audio';
import { applyDueRecurring } from '@/lib/recurring';
import Onboarding from '@/components/Onboarding';
import ProfileHeader from '@/components/ProfileHeader';
import StatsBar from '@/components/StatsBar';
import TransactionForm from '@/components/TransactionForm';
import WalletBar from '@/components/WalletBar';
import TransactionList from '@/components/TransactionList';
import BottomTools from '@/components/BottomTools';
import InsightsChart from '@/components/InsightsChart';
import EffectsLayer from '@/components/EffectsLayer';

type EffectTrigger = { type: 'income' | 'expense'; amount: number; key: number } | null;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [effectTrigger, setEffectTrigger] = useState<EffectTrigger>(null);
  const [budget, setBudget] = useState(0);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);

  const refresh = useCallback(() => setTransactions(getTransactions()), []);

  useEffect(() => {
    applyDueRecurring();
    refresh();
    setBudget(Number(localStorage.getItem('money_buddy_budget') || 0));
    if (!localStorage.getItem('onboarding_done')) {
      setShowOnboarding(true);
    } else if (new URLSearchParams(window.location.search).get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/');
    }
  }, [refresh]);

  const handleSave = useCallback((txn: Transaction) => {
    addTransaction(txn);
    refresh();
    setShowForm(false);
    if (txn.type === 'income') playIncomeSound();
    else playExpenseSound(getSadnessLevel(txn.amount));
    setEffectTrigger({ type: txn.type, amount: txn.amount, key: Date.now() });
  }, [refresh]);

  const handleUpdate = useCallback((txn: Transaction) => {
    updateTransaction(txn);
    refresh();
  }, [refresh]);

  const handleDelete = useCallback((id: string) => {
    deleteTransaction(id);
    refresh();
  }, [refresh]);

  return (
    <main className="min-h-dvh" style={{ background: '#FFF7ED' }}>
      <div
        className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-5"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 2rem))' }}
      >
        {/* 1. Greeting */}
        <ProfileHeader />

        {/* 2. Income / Expense totals */}
        <StatsBar transactions={transactions} budget={budget} />

        {/* 3. Add button / form */}
        {showForm ? (
          <div className="animate-pop-in">
            <TransactionForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="clay-btn clay-purple clay w-full py-4 text-lg font-black text-violet-900 text-center">
            ➕ Add Income / Expense
          </button>
        )}

        {/* 4 + 5. Search + Transactions by month */}
        <TransactionList transactions={transactions} onUpdate={handleUpdate} onDelete={handleDelete} walletFilter={walletFilter} />

        {/* 6. Wallets */}
        <WalletBar transactions={transactions} selectedWallet={walletFilter} onSelectWallet={id => setWalletFilter(prev => prev === id ? null : id)} />

        {/* 7. Recurring rules / Export CSV / Set Budget */}
        <BottomTools
          transactions={transactions}
          budget={budget}
          onSetBudget={setBudget}
          onRefresh={refresh}
        />

        {/* 8. Monthly overview chart */}
        <InsightsChart transactions={transactions} />
      </div>

      <EffectsLayer trigger={effectTrigger} />
      {showOnboarding && <Onboarding onDone={() => { localStorage.setItem('onboarding_done', '1'); setShowOnboarding(false); }} />}
    </main>
  );
}
