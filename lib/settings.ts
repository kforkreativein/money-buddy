import { scheduleCloudSync } from './supabase/sync';

const CC_KEY = 'money_buddy_credit_cards_enabled';
const SPLIT_KEY = 'money_buddy_split_enabled';

export function getCreditCardsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CC_KEY) === 'true';
}

export function setCreditCardsEnabled(val: boolean) {
  localStorage.setItem(CC_KEY, val ? 'true' : 'false');
  scheduleCloudSync();
}

export function getSplitEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SPLIT_KEY) === 'true';
}

export function setSplitEnabled(val: boolean) {
  localStorage.setItem(SPLIT_KEY, val ? 'true' : 'false');
  scheduleCloudSync();
}
