import { RecurringRule, Transaction } from './types';
import { addTransaction } from './storage';
import { walletToPaymentMode } from './wallets';
import { userStorageKey } from './auth';

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
}

export function addRule(rule: RecurringRule) {
  save([...getRules(), rule]);
}

export function deleteRule(id: string) {
  save(getRules().filter(r => r.id !== id));
}

function advance(dateStr: string, freq: RecurringRule['frequency']): string {
  const d = new Date(dateStr);
  if (freq === 'daily') d.setDate(d.getDate() + 1);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
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
