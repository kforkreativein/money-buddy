import { Transaction, Wallet, Category, CategoryTransfer, RecurringRule, SavingsGoal } from '../types';
import { getSupabase } from './client';

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('money_buddy_session');
    if (!raw) return null;
    return JSON.parse(raw).userId ?? null;
  } catch {
    return null;
  }
}

const DEFAULT_WALLETS: Wallet[] = [
  { id: 'gpay_hdfc', name: 'HDFC Bank', emoji: '📱' },
  { id: 'gpay_yes', name: 'Yes Bank', emoji: '📱' },
  { id: 'cash', name: 'Cash', emoji: '💵' },
];

function userKey(base: string, userId: string) {
  return `${base}_${userId}`;
}

function writeLocal(userId: string, data: {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  transfers: CategoryTransfer[];
  recurring: RecurringRule[];
  goal: SavingsGoal | null;
  budget: number;
  onboardingDone: boolean;
}) {
  localStorage.setItem(userKey('money_buddy_txns', userId), JSON.stringify(data.transactions));
  localStorage.setItem(userKey('money_buddy_wallets', userId), JSON.stringify(data.wallets.length ? data.wallets : DEFAULT_WALLETS));
  localStorage.setItem(userKey('money_buddy_categories', userId), JSON.stringify(data.categories));
  localStorage.setItem(userKey('money_buddy_transfers', userId), JSON.stringify(data.transfers));
  localStorage.setItem(userKey('money_buddy_recurring', userId), JSON.stringify(data.recurring));
  if (data.goal) {
    localStorage.setItem(userKey('money_buddy_savings_goal', userId), JSON.stringify(data.goal));
  } else {
    localStorage.removeItem(userKey('money_buddy_savings_goal', userId));
  }
  if (data.budget > 0) {
    localStorage.setItem(userKey('money_buddy_budget', userId), String(data.budget));
  } else {
    localStorage.removeItem(userKey('money_buddy_budget', userId));
  }
  if (data.onboardingDone) {
    localStorage.setItem(userKey('onboarding_done', userId), '1');
  } else {
    localStorage.removeItem(userKey('onboarding_done', userId));
  }
}

function readLocal(userId: string) {
  const parse = <T>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(userKey(key, userId));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    transactions: parse<Transaction[]>('money_buddy_txns', []),
    wallets: parse<Wallet[]>('money_buddy_wallets', DEFAULT_WALLETS),
    categories: parse<Category[]>('money_buddy_categories', []),
    transfers: parse<CategoryTransfer[]>('money_buddy_transfers', []),
    recurring: parse<RecurringRule[]>('money_buddy_recurring', []),
    goal: parse<SavingsGoal | null>('money_buddy_savings_goal', null),
    budget: Number(localStorage.getItem(userKey('money_buddy_budget', userId)) || 0),
    onboardingDone: localStorage.getItem(userKey('onboarding_done', userId)) === '1',
  };
}

/** Download cloud data into localStorage (source of truth on login). */
export async function pullFromCloud(): Promise<boolean> {
  const supabase = getSupabase();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const [txRes, walRes, catRes, trRes, recRes, goalRes, setRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('category_transfers').select('*').eq('user_id', userId),
    supabase.from('recurring_rules').select('*').eq('user_id', userId),
    supabase.from('savings_goals').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (txRes.error) throw txRes.error;

  const transactions: Transaction[] = (txRes.data ?? []).map(r => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description ?? '',
    paymentMode: r.payment_mode ?? 'gpay',
    bank: r.bank ?? undefined,
    walletId: r.wallet_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    date: r.date,
    createdAt: r.created_at,
  }));

  const wallets: Wallet[] = (walRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    openingBalance: r.opening_balance != null ? Number(r.opening_balance) : undefined,
    minBalance: r.min_balance != null ? Number(r.min_balance) : undefined,
  }));

  const categories: Category[] = (catRes.data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    budget: r.budget ?? 0,
    walletId: r.wallet_id ?? undefined,
  }));

  const transfers: CategoryTransfer[] = (trRes.data ?? []).map(r => ({
    id: r.id,
    amount: r.amount,
    fromCategoryId: r.from_category_id,
    toCategoryId: r.to_category_id,
    note: r.note ?? undefined,
    date: r.date,
    createdAt: r.created_at,
    expenseTxnId: r.expense_txn_id ?? undefined,
    incomeTxnId: r.income_txn_id ?? undefined,
  }));

  const recurring: RecurringRule[] = (recRes.data ?? []).map(r => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description ?? '',
    walletId: r.wallet_id,
    categoryId: r.category_id ?? undefined,
    frequency: r.frequency,
    nextDue: r.next_due,
  }));

  const goal = goalRes.data
    ? { target: goalRes.data.target, label: goalRes.data.label }
    : null;

  writeLocal(userId, {
    transactions,
    wallets,
    categories,
    transfers,
    recurring,
    goal,
    budget: setRes.data?.monthly_budget ?? 0,
    onboardingDone: setRes.data?.onboarding_done ?? false,
  });

  if (setRes.data?.streak_count != null || setRes.data?.last_visit_date) {
    localStorage.setItem(
      userKey('money_buddy_streak', userId),
      JSON.stringify({
        streak: setRes.data?.streak_count ?? 0,
        lastVisitDate: setRes.data?.last_visit_date ?? '',
      }),
    );
  }

  return true;
}

/** Upload local data to cloud (full sync). */
export async function pushToCloud(): Promise<boolean> {
  const supabase = getSupabase();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const local = readLocal(userId);

  await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('wallets').delete().eq('user_id', userId),
    supabase.from('categories').delete().eq('user_id', userId),
    supabase.from('category_transfers').delete().eq('user_id', userId),
    supabase.from('recurring_rules').delete().eq('user_id', userId),
    supabase.from('savings_goals').delete().eq('user_id', userId),
    supabase.from('user_settings').delete().eq('user_id', userId),
  ]);

  if (local.transactions.length) {
    const { error } = await supabase.from('transactions').insert(
      local.transactions.map(t => ({
        id: t.id,
        user_id: userId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        payment_mode: t.paymentMode,
        bank: t.bank ?? null,
        wallet_id: t.walletId ?? null,
        category_id: t.categoryId ?? null,
        date: t.date,
        created_at: t.createdAt,
      })),
    );
    if (error) throw error;
  }

  if (local.wallets.length) {
    const { error } = await supabase.from('wallets').insert(
      local.wallets.map(w => ({
        id: w.id,
        user_id: userId,
        name: w.name,
        emoji: w.emoji,
        opening_balance: w.openingBalance ?? null,
        min_balance: w.minBalance ?? null,
      })),
    );
    if (error) throw error;
  }

  if (local.categories.length) {
    const { error } = await supabase.from('categories').insert(
      local.categories.map(c => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        emoji: c.emoji,
        budget: c.budget,
        wallet_id: c.walletId ?? null,
      })),
    );
    if (error) throw error;
  }

  if (local.transfers.length) {
    const { error } = await supabase.from('category_transfers').insert(
      local.transfers.map(t => ({
        id: t.id,
        user_id: userId,
        amount: t.amount,
        from_category_id: t.fromCategoryId,
        to_category_id: t.toCategoryId,
        note: t.note ?? null,
        date: t.date,
        created_at: t.createdAt,
        expense_txn_id: t.expenseTxnId ?? null,
        income_txn_id: t.incomeTxnId ?? null,
      })),
    );
    if (error) throw error;
  }

  if (local.recurring.length) {
    const { error } = await supabase.from('recurring_rules').insert(
      local.recurring.map(r => ({
        id: r.id,
        user_id: userId,
        type: r.type,
        amount: r.amount,
        description: r.description,
        wallet_id: r.walletId,
        category_id: r.categoryId ?? null,
        frequency: r.frequency,
        next_due: r.nextDue,
      })),
    );
    if (error) throw error;
  }

  if (local.goal) {
    const { error } = await supabase.from('savings_goals').insert({
      user_id: userId,
      target: local.goal.target,
      label: local.goal.label,
    });
    if (error) throw error;
  }

  const { error: setErr } = await supabase.from('user_settings').insert({
    user_id: userId,
    monthly_budget: local.budget,
    onboarding_done: local.onboardingDone,
    streak_count: (() => {
      try {
        const raw = localStorage.getItem(userKey('money_buddy_streak', userId));
        return raw ? (JSON.parse(raw).streak ?? 0) : 0;
      } catch { return 0; }
    })(),
    last_visit_date: (() => {
      try {
        const raw = localStorage.getItem(userKey('money_buddy_streak', userId));
        return raw ? (JSON.parse(raw).lastVisitDate ?? null) : null;
      } catch { return null; }
    })(),
  });
  if (setErr) throw setErr;

  return true;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced cloud upload after local changes. */
export function scheduleCloudSync() {
  if (!getSupabase() || !getUserId()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushToCloud().catch(err => console.error('cloud sync failed', err));
  }, 1500);
}

export async function syncWithCloud(): Promise<void> {
  if (!getSupabase() || !getUserId()) return;
  try {
    await pullFromCloud();
  } catch (err) {
    console.error('pull from cloud failed', err);
    try {
      await pushToCloud();
    } catch (pushErr) {
      console.error('push to cloud failed', pushErr);
    }
  }
}
