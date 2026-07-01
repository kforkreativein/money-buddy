import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';

const KEY = 'money_buddy_streak';

export interface StreakData {
  streak: number;
  lastVisitDate: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function storageKey() {
  return userStorageKey(KEY);
}

export function getStreakData(): StreakData {
  if (typeof window === 'undefined') return { streak: 0, lastVisitDate: '' };
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { streak: 0, lastVisitDate: '' };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { streak: 0, lastVisitDate: '' };
  }
}

function saveStreak(data: StreakData) {
  localStorage.setItem(storageKey(), JSON.stringify(data));
  scheduleCloudSync();
}

/** Call once when app loads. Increments streak on first visit each day. */
export function recordDailyVisit(): { streak: number; isFirstVisitToday: boolean } {
  const today = todayStr();
  const current = getStreakData();

  if (current.lastVisitDate === today) {
    return { streak: current.streak, isFirstVisitToday: false };
  }

  const streak = current.lastVisitDate === yesterdayStr() ? current.streak + 1 : 1;
  saveStreak({ streak, lastVisitDate: today });
  return { streak, isFirstVisitToday: true };
}

export function getStreak(): number {
  return getStreakData().streak;
}

export function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
