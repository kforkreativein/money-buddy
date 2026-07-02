'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, CategoryTransfer } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { applyDueRecurring } from '@/lib/recurring';
import { userStorageKey, restoreAuth } from '@/lib/auth';
import { scheduleCloudSync } from '@/lib/supabase/sync';
import { getCategories } from '@/lib/categories';
import { getTransfers } from '@/lib/transfers';
import { recordDailyVisit } from '@/lib/streak';
import { filterTransactionsForView, ViewMode } from '@/lib/view';
import { registerServiceWorker, notificationsEnabled, showNotification } from '@/lib/notifications';
import Onboarding from '@/components/Onboarding';
import AuthScreen from '@/components/AuthScreen';
import ProfileHeader from '@/components/ProfileHeader';
import SettingsPanel from '@/components/SettingsPanel';
import StatsBar from '@/components/StatsBar';
import StreakPopup from '@/components/StreakPopup';
import EntrySearch from '@/components/EntrySearch';
import ViewModeBar from '@/components/ViewModeBar';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import LowBalanceAlert from '@/components/LowBalanceAlert';
import RecoveryBanner from '@/components/RecoveryBanner';
import MoreSection from '@/components/MoreSection';

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<CategoryTransfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [streak, setStreak] = useState(0);
  const [previousStreak, setPreviousStreak] = useState(0);
  const [budget, setBudget] = useState(0);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [recurringRefresh, setRecurringRefresh] = useState(0);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => setTransactions(getTransactions()), []);
  const reloadCategories = useCallback(() => setCategories(getCategories()), []);
  const reloadTransfers = useCallback(() => setTransfers(getTransfers()), []);

  const handleRecurringChange = useCallback(() => {
    refresh();
    setRecurringRefresh(n => n + 1);
  }, [refresh]);

  const viewTransactions = useMemo(
    () => filterTransactionsForView(transactions, viewMode),
    [transactions, viewMode],
  );

  const categoryFilter = viewMode === 'all' ? null : viewMode;

  const loadAppData = useCallback(() => {
    registerServiceWorker();
    applyDueRecurring();
    refresh();
    reloadCategories();
    reloadTransfers();
    setBudget(Number(localStorage.getItem(userStorageKey('money_buddy_budget')) || 0));
    const visit = recordDailyVisit();
    setStreak(visit.streak);
    setPreviousStreak(visit.previousStreak);
    setShowStreakPopup(visit.isFirstVisitToday);
    if (visit.isFirstVisitToday && notificationsEnabled()) {
      showNotification(
        'Money Buddy',
        visit.streak > 1 ? `Day ${visit.streak} streak — welcome back!` : 'Welcome! Start your streak today.',
      );
    }
    if (!localStorage.getItem(userStorageKey('onboarding_done'))) {
      setShowOnboarding(true);
    } else if (new URLSearchParams(window.location.search).get('action') === 'add') {
      setShowForm(true);
      window.history.replaceState({}, '', '/');
    }
  }, [refresh, reloadCategories, reloadTransfers]);

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
    setViewMode('all');
    loadAppData();
  }, [loadAppData]);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
    setTransactions([]);
    setTransfers([]);
    setCategories([]);
    setBudget(0);
    setShowOnboarding(false);
    setShowForm(false);
    setShowSettings(false);
    setShowStreakPopup(false);
    setStreak(0);
    setWalletFilter(null);
    setViewMode('all');
    setSearch('');
  }, []);

  const handleSave = useCallback((txn: Transaction) => {
    addTransaction(txn);
    refresh();
    setShowForm(false);
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
    <main className="min-h-dvh overflow-x-hidden" style={{ background: '#FFF7ED' }}>
      <div
        className="max-w-md mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] flex flex-col gap-3"
        style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}
      >
        <ProfileHeader
          streak={streak}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettings(true)}
        />

        <RecoveryBanner
          currentCount={transactions.length}
          onRestored={() => {
            applyDueRecurring();
            refresh();
            reloadCategories();
            reloadTransfers();
          }}
        />

        {/* 1. Add entry */}
        <button
          onClick={() => setShowForm(true)}
          className="clay-btn clay-purple clay w-full py-4 text-lg font-black text-violet-900 text-center min-h-[52px]">
          ➕ Add Income / Expense / Invest
        </button>

        {/* 2. Monthly stats */}
        <StatsBar
          transactions={viewTransactions}
          budget={budget}
          categories={categories}
          categoryFilter={categoryFilter}
          transfers={transfers}
        />

        {/* 3. Search + category filter */}
        <EntrySearch value={search} onChange={v => setSearch(v)} />

        {categories.length > 0 && (
          <ViewModeBar categories={categories} viewMode={viewMode} onSelect={setViewMode} />
        )}

        {/* 4. Transaction list */}
        <TransactionList
          transactions={viewTransactions}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          walletFilter={walletFilter}
          categoryFilter={categoryFilter}
          onRecurringChange={handleRecurringChange}
          search={search}
          onSearchChange={setSearch}
          hideSearchBar
        />

        {/* 5. Low balance alert */}
        <LowBalanceAlert transactions={transactions} />

        {/* Everything else tucked away */}
        <MoreSection
          transactions={transactions}
          viewTransactions={viewTransactions}
          transfers={transfers}
          categories={categories}
          viewMode={viewMode}
          onViewMode={setViewMode}
          walletFilter={walletFilter}
          onWalletFilter={id => setWalletFilter(prev => prev === id ? null : id)}
          budget={budget}
          onSetBudget={setBudget}
          onRefresh={refresh}
          recurringRefresh={recurringRefresh}
          onTransfer={() => { reloadTransfers(); reloadCategories(); refresh(); }}
          onTransferUndo={() => { reloadTransfers(); refresh(); }}
        />
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-pop-in"
          style={{ background: 'rgba(28,25,23,0.55)' }}
          onClick={() => setShowForm(false)}>
          <div
            className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px]"
            onClick={e => e.stopPropagation()}>
            <TransactionForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              onRecurringChange={handleRecurringChange}
            />
          </div>
        </div>
      )}

      {showStreakPopup && (
        <StreakPopup
          previousStreak={previousStreak}
          streak={streak}
          onDone={() => setShowStreakPopup(false)}
        />
      )}

      {showOnboarding && (
        <Onboarding onDone={() => {
          localStorage.setItem(userStorageKey('onboarding_done'), '1');
          scheduleCloudSync();
          setShowOnboarding(false);
        }} />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onChange={() => { reloadCategories(); reloadTransfers(); refresh(); }}
        />
      )}
    </main>
  );
}
