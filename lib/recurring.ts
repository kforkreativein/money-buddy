import { RecurringRule, Transaction, Frequency } from './types';
import { addTransaction, updateTransaction } from './storage';
import { walletToPaymentMode } from './wallets';
import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';

const KEY = 'money_buddy_recurring';

function storageKey() {
  return userStorageKey(KEY);
}

export function getRules(): RecurringRule[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(storageKey()) ?? '[]'); } catch { return []; }
}

function save(rules: RecurringRule[]) {
  localStorage.setItem(storageKey(), JSON.stringify(rules));
  scheduleCloudSync();
}

export function addRule(rule: RecurringRule) {
  save([...getRules(), rule]);
}

export function updateRule(id: string, patch: Partial<RecurringRule>) {
  save(getRules().map(r => r.id === id ? { ...r, ...patch } : r));
}

export function deleteRule(id: string) {
  save(getRules().filter(r => r.id !== id));
}

export function findRuleForTransaction(txn: Transaction): RecurringRule | undefined {
  const rules = getRules();
  if (txn.recurringRuleId) return rules.find(r => r.id === txn.recurringRuleId);
  const linked = rules.find(r => r.linkedTransactionId === txn.id);
  if (linked) return linked;
  const walletId = txn.walletId;
  return rules.find(r =>
    r.type === txn.type &&
    r.amount === txn.amount &&
    r.description === txn.description &&
    r.walletId === walletId &&
    (r.categoryId ?? '') === (txn.categoryId ?? ''),
  );
}

export function computeNextDue(fromDate: string, frequency: Frequency): string {
  const d = new Date(fromDate);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function advance(dateStr: string, freq: RecurringRule['frequency']): string {
  return computeNextDue(dateStr, freq);
}

/** Save or update recurring rule linked to a transaction. */
export function syncRuleForTransaction(
  txn: Transaction,
  recurring: boolean,
  frequency: Frequency,
): Transaction {
  const existing = findRuleForTransaction(txn);
  const catId = (txn.type === 'income' || txn.type === 'expense') && txn.categoryId ? txn.categoryId : undefined;

  if (!recurring) {
    if (existing) deleteRule(existing.id);
    const updated = { ...txn, recurringRuleId: undefined };
    updateTransaction(updated);
    return updated;
  }

  const nextDue = existing?.nextDue ?? computeNextDue(txn.date, frequency);

  if (existing) {
    updateRule(existing.id, {
      type: txn.type,
      amount: txn.amount,
      description: txn.description,
      walletId: txn.walletId!,
      categoryId: catId,
      frequency,
      nextDue,
      linkedTransactionId: txn.id,
    });
    const updated = { ...txn, recurringRuleId: existing.id };
    updateTransaction(updated);
    return updated;
  }

  const ruleId = crypto.randomUUID();
  addRule({
    id: ruleId,
    type: txn.type,
    amount: txn.amount,
    description: txn.description,
    walletId: txn.walletId!,
    categoryId: catId,
    frequency,
    nextDue,
    linkedTransactionId: txn.id,
  });
  const updated = { ...txn, recurringRuleId: ruleId };
  updateTransaction(updated);
  return updated;
}

// Call on app load — auto-adds any overdue entries and advances nextDue
export function applyDueRecurring(): number {
  const today = new Date().toISOString().slice(0, 10);
  const rules = getRules();
  let count = 0;
  const updated = rules.map(rule => {
    let r = { ...rule };
    while (r.nextDue <= today) {
      const pm = walletToPaymentMode(r.walletId);
      addTransaction({
        id: crypto.randomUUID(),
        type: r.type,
        amount: r.amount,
        description: r.description,
        walletId: r.walletId,
        categoryId: r.categoryId,
        recurringRuleId: r.id,
        paymentMode: pm.paymentMode,
        bank: pm.bank,
        date: r.nextDue,
        createdAt: Date.now(),
      } as Transaction);
      count++;
      r = { ...r, nextDue: advance(r.nextDue, r.frequency) };
    }
    return r;
  });
  save(updated);
  return count;
}
