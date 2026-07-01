import { Transaction } from './types';
import { userStorageKey } from './auth';

const KEY = 'money_buddy_txns';

function storageKey() {
  return userStorageKey(KEY);
}

export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
  } catch {
    return [];
  }
}

function save(txns: Transaction[]) {
  localStorage.setItem(storageKey(), JSON.stringify(txns));
}

export function addTransaction(txn: Transaction) {
  save([...getTransactions(), txn]);
}

export function updateTransaction(txn: Transaction) {
  save(getTransactions().map(t => t.id === txn.id ? txn : t));
}

export function deleteTransaction(id: string) {
  save(getTransactions().filter(t => t.id !== id));
}
