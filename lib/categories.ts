import { ExpenseCategory } from './types';
import { userStorageKey } from './auth';

const KEY = 'money_buddy_categories';

function storageKey() {
  return userStorageKey(KEY);
}

export function getCategories(): ExpenseCategory[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
  } catch {
    return [];
  }
}

function save(categories: ExpenseCategory[]) {
  localStorage.setItem(storageKey(), JSON.stringify(categories));
}

export function addCategory(name: string, emoji: string): ExpenseCategory {
  const cat: ExpenseCategory = {
    id: crypto.randomUUID(),
    name: name.trim(),
    emoji: emoji || '🏷️',
    budget: 0,
  };
  save([...getCategories(), cat]);
  return cat;
}

export function updateCategory(id: string, patch: Partial<Pick<ExpenseCategory, 'name' | 'emoji' | 'budget'>>) {
  const updated = getCategories().map(c => c.id === id ? { ...c, ...patch } : c);
  save(updated);
  return updated;
}

export function deleteCategory(id: string) {
  save(getCategories().filter(c => c.id !== id));
}

export function getCategoryById(id: string): ExpenseCategory | undefined {
  return getCategories().find(c => c.id === id);
}
