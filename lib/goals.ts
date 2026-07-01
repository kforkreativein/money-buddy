import { SavingsGoal } from './types';
import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';

const KEY = 'money_buddy_savings_goal';

function storageKey() {
  return userStorageKey(KEY);
}

export function getSavingsGoal(): SavingsGoal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const g = JSON.parse(raw) as SavingsGoal;
    return g?.target > 0 ? g : null;
  } catch {
    return null;
  }
}

export function setSavingsGoal(goal: SavingsGoal | null) {
  if (!goal || goal.target <= 0) {
    localStorage.removeItem(storageKey());
  } else {
    localStorage.setItem(storageKey(), JSON.stringify(goal));
  }
  scheduleCloudSync();
}
