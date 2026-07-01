'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, CategoryTransfer } from '@/lib/types';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { applyDueRecurring } from '@/lib/recurring';
import { userStorageKey, restoreAuth, getSession } from '@/lib/auth';
import { scheduleCloudSync } from '@/lib/supabase/sync';
import { getCategories } from '@/lib/categories';
import { getTransfers } from '@/lib/transfers';
import { recordDailyVisit } from '@/lib/streak';
import { filterTransactionsForView, ViewMode } from '@/lib/view';
import Onboarding from '@/components/Onboarding';
import AuthScreen from '@/components/AuthScreen';
import ProfileHeader from '@/components/ProfileHeader';
import SettingsPanel from '@/components/SettingsPanel';
import StatsBar from '@/components/StatsBar';
import ViewModeBar from '@/components/ViewModeBar';
import DailyWelcome from '@/components/DailyWelcome';
import AffordCheckCard from '@/components/AffordCheckCard';
import BusinessProfitCard from '@/components/BusinessProfitCard';
import MonthlyCloseCard from '@/components/MonthlyCloseCard';
import TransactionForm from '@/components/TransactionForm';
import WalletBar from '@/components/WalletBar';
import TransactionList from '@/components/TransactionList';
import BottomTools from '@/components/BottomTools';
import InsightsChart from '@/components/InsightsChart';
import SavingsGoalCard from '@/components/SavingsGoalCard';
import DueReminders from '@/components/DueReminders';
import WeeklySummary from '@/components/WeeklySummary';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import CategoryTransferPanel from '@/components/CategoryTransferPanel';
import TransferHistory from '@/components/TransferHistory';
import YearEndReport from '@/components/YearEndReport';
import LowBalanceAlert from '@/components/LowBalanceAlert';

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<CategoryTransfer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [streak, setStreak] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [budget, setBudget] = useState(0);
  const [walletFilter, setWalletFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const refresh = useCallback(() => setTransactions(getTransactions()), []);
  const reloadCategories = useCallback(() => setCategories(getCategories()), []);
  const reloadTransfers = useCallback(() => setTransfers(getTransfers()), []);

  const viewTransactions = useMemo(
    () => filterTransactionsForView(transactions, viewMode),
    [transactions, viewMode],
  );

  const categoryFilter = viewMode === 'all' ? null : viewMode;

  const loadAppData = useCallback(() => {
    applyDueRecurring();
    refresh();
    reloadCategories();
    reloadTransfers();
    setBudget(Number(localStorage.getItem(userStorageKey('money_buddy_budget')) || 0));
    const visit = recordDailyVisit();
    setStreak(visit.streak);
    setShowWelcome(visit.isFirstVisitToday);
    const session = getSession();
    if (session) setDisplayName(session.displayName);
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
    setShowWelcome(false);
    setStreak(0);
    setWalletFilter(null);
    setViewMode('all');
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
    <main className="min-h-dvh" style={{ background: '#FFF7ED' }}>
      <div
        className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-5"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 2rem))' }}
      >
        <ProfileHeader
          streak={streak}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettings(true)}
        />

        {showWelcome && (
          <DailyWelcome
            name={displayName}
            streak={streak}
            onDismiss={() => setShowWelcome(false)}
          />
        )}

        <LowBalanceAlert transactions={transactions} />

        <ViewModeBar
          categories={categories}
          viewMode={viewMode}
          onSelect={setViewMode}
        />

        <StatsBar
          transactions={viewTransactions}
          budget={budget}
          categories={categories}
          categoryFilter={categoryFilter}
          transfers={transfers}
        />

        <BusinessProfitCard
          categories={categories}
          transactions={transactions}
          transfers={transfers}
        />

        <AffordCheckCard
          categories={categories}
          transactions={transactions}
          transfers={transfers}
        />

        <MonthlyCloseCard
          transactions={transactions}
          transfers={transfers}
          categories={categories}
        />

        {showForm ? (
          <div className="animate-pop-in">
            <TransactionForm onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="clay-btn clay-purple clay w-full py-4 text-lg font-black text-violet-900 text-center">
            ➕ Add Income / Expense / Invest
          </button>
        )}

        <TransactionList
          transactions={viewTransactions}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          walletFilter={walletFilter}
          categoryFilter={categoryFilter}
        />

        <WalletBar transactions={transactions} selectedWallet={walletFilter} onSelectWallet={id => setWalletFilter(prev => prev === id ? null : id)} />

        <BottomTools
          transactions={viewTransactions}
          budget={budget}
          onSetBudget={setBudget}
          onRefresh={refresh}
        />

        <InsightsChart transactions={viewTransactions} />

        <SavingsGoalCard transactions={transactions} />

        <DueReminders />
        <WeeklySummary transactions={viewTransactions} />
        {viewMode === 'all' && (
          <CategoryBreakdown transactions={transactions} transfers={transfers} categories={categories} />
        )}
        <CategoryTransferPanel
          categories={categories}
          onTransfer={() => { reloadTransfers(); reloadCategories(); refresh(); }}
        />
        <TransferHistory
          categories={categories}
          onUndo={() => { reloadTransfers(); refresh(); }}
        />
        <YearEndReport transactions={transactions} transfers={transfers} categories={categories} />
      </div>

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
