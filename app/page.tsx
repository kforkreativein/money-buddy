'use client';
import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { playIncomeSound, playExpenseSound, getSadnessLevel } from '@/lib/audio';
import Onboarding from '@/components/Onboarding';
import StatsBar from '@/components/StatsBar';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import EffectsLayer from '@/components/EffectsLayer';
import ProfileHeader from '@/components/ProfileHeader';

type EffectTrigger = { type: 'income' | 'expense'; amount: number; key: number } | null;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [effectTrigger, setEffectTrigger] = useState<EffectTrigger>(null);

  // Load from localStorage; support ?action=add for iOS Back Tap shortcut
  useEffect(() => {
    setTransactions(getTransactions());
    if (!localStorage.getItem('onboarding_done')) {
      setShowOnboarding(true);
    } else if (new URLSearchParams(window.location.search).get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSave = useCallback((txn: Transaction) => {
    addTransaction(txn);
    setTransactions(getTransactions());
    setShowForm(false);
    if (txn.type === 'income') {
      playIncomeSound();
    } else {
      playExpenseSound(getSadnessLevel(txn.amount));
    }
    setEffectTrigger({ type: txn.type, amount: txn.amount, key: Date.now() });
  }, []);

  const handleUpdate = useCallback((txn: Transaction) => {
    updateTransaction(txn);
    setTransactions(getTransactions());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteTransaction(id);
    setTransactions(getTransactions());
  }, []);

  const handleOnboardingDone = () => {
    localStorage.setItem('onboarding_done', '1');
    setShowOnboarding(false);
  };

  return (
    <main className="min-h-dvh" style={{ background: '#FFF7ED' }}>
      <div className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-5"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 2rem))' }}>

        {/* Profile greeting */}
        <ProfileHeader />

        {/* Stats */}
        <StatsBar transactions={transactions} />

        {/* Add button or inline form */}
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

        {/* Transaction list */}
        <TransactionList transactions={transactions} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>

      <EffectsLayer trigger={effectTrigger} />
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}
    </main>
  );
}
