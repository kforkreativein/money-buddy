import { CategoryTransfer } from './types';
import { userStorageKey } from './auth';

const KEY = 'money_buddy_transfers';

function storageKey() {
  return userStorageKey(KEY);
}

export function getTransfers(): CategoryTransfer[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
  } catch {
    return [];
  }
}

function save(transfers: CategoryTransfer[]) {
  localStorage.setItem(storageKey(), JSON.stringify(transfers));
}

export function addTransfer(t: Omit<CategoryTransfer, 'id' | 'createdAt'>): CategoryTransfer {
  const transfer: CategoryTransfer = { ...t, id: crypto.randomUUID(), createdAt: Date.now() };
  save([...getTransfers(), transfer]);
  return transfer;
}

export function deleteTransfer(id: string) {
  save(getTransfers().filter(t => t.id !== id));
}

export function clearTransfersForCategory(categoryId: string) {
  save(getTransfers().filter(t => t.fromCategoryId !== categoryId && t.toCategoryId !== categoryId));
}
