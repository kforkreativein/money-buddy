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

function hasMeaningfulData(data: {
  transactions: Transaction[];
  categories: Category[];
  transfers: CategoryTransfer[];
  recurring: RecurringRule[];
  goal: SavingsGoal | null;
}): boolean {
  return (
    data.transactions.length > 0 ||
    data.categories.length > 0 ||
    data.transfers.length > 0 ||
    data.recurring.length > 0 ||
    data.goal != null
  );
}

/** Download cloud data into localStorage (source of truth on login). */
export async function pullFromCloud(): Promise<boolean> {
  const supabase = getSupabase();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const localBeforePull = readLocal(userId);

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
    recurringRuleId: r.recurring_rule_id ?? undefined,
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
    linkedTransactionId: r.linked_transaction_id ?? undefined,
  }));

  const goal = goalRes.data
    ? { target: goalRes.data.target, label: goalRes.data.label }
    : null;

  const cloudData = {
    transactions,
    wallets,
    categories,
    transfers,
    recurring,
    goal,
    budget: setRes.data?.monthly_budget ?? 0,
    onboardingDone: setRes.data?.onboarding_done ?? false,
  };

  const cloudEmpty = !hasMeaningfulData(cloudData);
  const localHasData = hasMeaningfulData(localBeforePull);

  // Never wipe local entries when Supabase is empty (failed sync, grace period, new account).
  if (cloudEmpty && localHasData) {
    console.warn('Cloud empty but local has data — keeping local and uploading');
    await pushToCloud();
    return true;
  }

  writeLocal(userId, cloudData);

  if (setRes.data?.streak_count != null || setRes.data?.last_visit_date) {
    localStorage.setItem(
      userKey('money_buddy_streak', userId),
      JSON.stringify({
        streak: setRes.data?.streak_count ?? 0,
        lastVisitDate: setRes.data?.last_visit_date ?? '',
      }),
    );
  }
  if (setRes.data?.wallet_order) {
    try {
      localStorage.setItem(userKey('money_buddy_wallet_order', userId), setRes.data.wallet_order);
    } catch { /* ignore */ }
  }
  if (setRes.data?.notifications_enabled) {
    localStorage.setItem(userKey('money_buddy_notifications', userId), '1');
  }

  return true;
}

/** Upload local data to cloud (upsert + prune — never delete-first). */
export async function pushToCloud(): Promise<boolean> {
  const supabase = getSupabase();
  const userId = getUserId();
  if (!supabase || !userId) return false;

  const local = readLocal(userId);

  if (local.transactions.length) {
    const { error } = await supabase.from('transactions').upsert(
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
        recurring_rule_id: t.recurringRuleId ?? null,
        date: t.date,
        created_at: t.createdAt,
      })),
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }
  {
    const keep = new Set(local.transactions.map(t => t.id));
    const { data, error } = await supabase.from('transactions').select('id').eq('user_id', userId);
    if (error) throw error;
    const remove = (data ?? []).map(r => r.id).filter(id => !keep.has(id));
    if (remove.length) {
      const { error: delErr } = await supabase.from('transactions').delete().eq('user_id', userId).in('id', remove);
      if (delErr) throw delErr;
    }
  }

  if (local.wallets.length) {
    const { error } = await supabase.from('wallets').upsert(
      local.wallets.map(w => ({
        id: w.id,
        user_id: userId,
        name: w.name,
        emoji: w.emoji,
        opening_balance: w.openingBalance ?? null,
        min_balance: w.minBalance ?? null,
      })),
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }
  {
    const keep = new Set(local.wallets.map(w => w.id));
    const { data, error } = await supabase.from('wallets').select('id').eq('user_id', userId);
    if (error) throw error;
    const remove = (data ?? []).map(r => r.id).filter(id => !keep.has(id));
    if (remove.length) {
      const { error: delErr } = await supabase.from('wallets').delete().eq('user_id', userId).in('id', remove);
      if (delErr) throw delErr;
    }
  }

  if (local.categories.length) {
    const { error } = await supabase.from('categories').upsert(
      local.categories.map(c => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        emoji: c.emoji,
        budget: c.budget,
        wallet_id: c.walletId ?? null,
      })),
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }
  {
    const keep = new Set(local.categories.map(c => c.id));
    const { data, error } = await supabase.from('categories').select('id').eq('user_id', userId);
    if (error) throw error;
    const remove = (data ?? []).map(r => r.id).filter(id => !keep.has(id));
    if (remove.length) {
      const { error: delErr } = await supabase.from('categories').delete().eq('user_id', userId).in('id', remove);
      if (delErr) throw delErr;
    }
  }

  if (local.transfers.length) {
    const { error } = await supabase.from('category_transfers').upsert(
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
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }
  {
    const keep = new Set(local.transfers.map(t => t.id));
    const { data, error } = await supabase.from('category_transfers').select('id').eq('user_id', userId);
    if (error) throw error;
    const remove = (data ?? []).map(r => r.id).filter(id => !keep.has(id));
    if (remove.length) {
      const { error: delErr } = await supabase.from('category_transfers').delete().eq('user_id', userId).in('id', remove);
      if (delErr) throw delErr;
    }
  }

  if (local.recurring.length) {
    const { error } = await supabase.from('recurring_rules').upsert(
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
        linked_transaction_id: r.linkedTransactionId ?? null,
      })),
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }
  {
    const keep = new Set(local.recurring.map(r => r.id));
    const { data, error } = await supabase.from('recurring_rules').select('id').eq('user_id', userId);
    if (error) throw error;
    const remove = (data ?? []).map(r => r.id).filter(id => !keep.has(id));
    if (remove.length) {
      const { error: delErr } = await supabase.from('recurring_rules').delete().eq('user_id', userId).in('id', remove);
      if (delErr) throw delErr;
    }
  }

  if (local.goal) {
    const { error } = await supabase.from('savings_goals').upsert({
      user_id: userId,
      target: local.goal.target,
      label: local.goal.label,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('savings_goals').delete().eq('user_id', userId);
    if (error) throw error;
  }

  const { error: setErr } = await supabase.from('user_settings').upsert({
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
    wallet_order: localStorage.getItem(userKey('money_buddy_wallet_order', userId)) ?? null,
    notifications_enabled: localStorage.getItem(userKey('money_buddy_notifications', userId)) === '1',
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
