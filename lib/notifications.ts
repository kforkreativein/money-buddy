import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';

const KEY = 'money_buddy_notifications';

function storageKey() {
  return userStorageKey(KEY);
}

export function notificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(storageKey()) === '1';
}

export function setNotificationsEnabled(on: boolean) {
  if (on) localStorage.setItem(storageKey(), '1');
  else localStorage.removeItem(storageKey());
  scheduleCloudSync();
}

export function canUseNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function enableNotifications(): Promise<boolean> {
  const ok = await requestNotificationPermission();
  if (ok) setNotificationsEnabled(true);
  return ok;
}

export function showNotification(title: string, body: string) {
  if (!canUseNotifications() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'money-buddy',
    });
  } catch {
    // iOS may block when not installed as PWA
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
