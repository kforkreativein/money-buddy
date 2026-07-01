'use client';
import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { playIncomeSound, playExpenseSound, getSadnessLevel } from '@/lib/audio';
import { applyDueRecurring } from '@/lib/recurring';
import { userStorageKey, restoreAuth } from '@/lib/auth';
import Onboarding from '@/components/Onboarding';
import AuthScreen from '@/components/AuthScreen';
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
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [effectTrigger, setEffectTrigger] = useState<EffectTrigger>(null);
  const [budget, setBudget] = useState(0);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);

  const refresh = useCallback(() => setTransactions(getTransactions()), []);

  const loadAppData = useCallback(() => {
    applyDueRecurring();
    refresh();
    setBudget(Number(localStorage.getItem(userStorageKey('money_buddy_budget')) || 0));
    if (!localStorage.getItem(userStorageKey('onboarding_done'))) {
      setShowOnboarding(true);
    } else if (new URLSearchParams(window.location.search).get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/');
    }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    restoreAuth().then(ok => {
      if (active) setAuthenticated(ok);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authenticated) loadAppData();
  }, [authenticated, loadAppData]);

  const handleAuth = useCallback(() => {
    setAuthenticated(true);
    setShowOnboarding(false);
    setShowForm(false);
    setWalletFilter(null);
    loadAppData();
  }, [loadAppData]);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    setTransactions([]);
    setBudget(0);
    setShowOnboarding(false);
    setShowForm(false);
    setWalletFilter(null);
  }, []);

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

  if (authenticated === null) {
    return <main className="min-h-dvh" style={{ background: '#FFF7ED' }} />;
  }

  if (!authenticated) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <main className="min-h-dvh" style={{ background: '#FFF7ED' }}>
      <div
        className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-5"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 2rem))' }}
      >
        <ProfileHeader onLogout={handleLogout} />

        <StatsBar transactions={transactions} budget={budget} />

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

        <TransactionList transactions={transactions} onUpdate={handleUpdate} onDelete={handleDelete} walletFilter={walletFilter} />

        <WalletBar transactions={transactions} selectedWallet={walletFilter} onSelectWallet={id => setWalletFilter(prev => prev === id ? null : id)} />

        <BottomTools
          transactions={transactions}
          budget={budget}
          onSetBudget={setBudget}
          onRefresh={refresh}
        />

        <InsightsChart transactions={transactions} />
      </div>

      <EffectsLayer trigger={effectTrigger} />
      {showOnboarding && (
        <Onboarding onDone={() => {
          localStorage.setItem(userStorageKey('onboarding_done'), '1');
          setShowOnboarding(false);
        }} />
      )}
    </main>
  );
}
