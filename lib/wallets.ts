import { Wallet } from './types';
import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';

const KEY = 'money_buddy_wallets';
const ORDER_KEY = 'money_buddy_wallet_order';

function storageKey() {
  return userStorageKey(KEY);
}

function orderStorageKey() {
  return userStorageKey(ORDER_KEY);
}

export function getWalletOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(orderStorageKey()) ?? '[]');
  } catch {
    return [];
  }
}

export function saveWalletOrder(ids: string[]) {
  localStorage.setItem(orderStorageKey(), JSON.stringify(ids));
  scheduleCloudSync();
}

function sortWallets(wallets: Wallet[]): Wallet[] {
  const order = getWalletOrder();
  if (!order.length) return wallets;
  const sorted = [...wallets].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return sorted;
}

export function reorderWallet(id: string, direction: 'left' | 'right') {
  const wallets = getWallets();
  const ids = getWalletOrder().length
    ? getWalletOrder().filter(wid => wallets.some(w => w.id === wid))
    : wallets.map(w => w.id);
  wallets.forEach(w => { if (!ids.includes(w.id)) ids.push(w.id); });
  const idx = ids.indexOf(id);
  if (idx === -1) return;
  const swap = direction === 'left' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= ids.length) return;
  [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
  saveWalletOrder(ids);
}

export function moveWalletToIndex(id: string, toIndex: number) {
  const wallets = getWallets();
  let ids = getWalletOrder().length
    ? getWalletOrder().filter(wid => wallets.some(w => w.id === wid))
    : wallets.map(w => w.id);
  wallets.forEach(w => { if (!ids.includes(w.id)) ids.push(w.id); });
  const from = ids.indexOf(id);
  if (from === -1 || toIndex < 0 || toIndex >= ids.length) return;
  ids.splice(from, 1);
  ids.splice(toIndex, 0, id);
  saveWalletOrder(ids);
}

export const DEFAULT_WALLETS: Wallet[] = [
  { id: 'gpay_hdfc', name: 'HDFC Bank', emoji: '📱' },
  { id: 'gpay_yes', name: 'Yes Bank', emoji: '📱' },
  { id: 'cash', name: 'Cash', emoji: '💵' },
];

const DEFAULT_WALLET_RENAMES: Record<string, { oldNames: string[]; newName: string }> = {
  gpay_hdfc: { oldNames: ['GPay HDFC'], newName: 'HDFC Bank' },
  gpay_yes: { oldNames: ['GPay Yes Bank'], newName: 'Yes Bank' },
};

function migrateDefaultWalletNames(wallets: Wallet[]): Wallet[] {
  let changed = false;
  const updated = wallets.map(w => {
    const rule = DEFAULT_WALLET_RENAMES[w.id];
    if (rule && rule.oldNames.includes(w.name) && w.name !== rule.newName) {
      changed = true;
      return { ...w, name: rule.newName };
    }
    return w;
  });
  if (changed) saveWallets(updated);
  return updated;
}

export function getWallets(): Wallet[] {
  if (typeof window === 'undefined') return DEFAULT_WALLETS;
  const raw = localStorage.getItem(storageKey());
  if (!raw) { localStorage.setItem(storageKey(), JSON.stringify(DEFAULT_WALLETS)); return DEFAULT_WALLETS; }
  try {
    const wallets = JSON.parse(raw) as Wallet[];
    return sortWallets(migrateDefaultWalletNames(wallets));
  } catch { return DEFAULT_WALLETS; }
}

export function saveWallets(wallets: Wallet[]) {
  localStorage.setItem(storageKey(), JSON.stringify(wallets));
  scheduleCloudSync();
}

export function updateWallet(id: string, patch: Partial<Pick<Wallet, 'name' | 'emoji' | 'openingBalance' | 'minBalance'>>) {
  const updated = getWallets().map(w => w.id === id ? { ...w, ...patch } : w);
  saveWallets(updated);
  return updated;
}

export function addWallet(w: Omit<Wallet, 'id'>): Wallet {
  const wallet = { ...w, id: crypto.randomUUID() };
  const next = [...getWallets(), wallet];
  saveWallets(next);
  saveWalletOrder([...getWalletOrder(), wallet.id]);
  return wallet;
}

export function deleteWallet(id: string) {
  saveWallets(getWallets().filter(w => w.id !== id));
  saveWalletOrder(getWalletOrder().filter(wid => wid !== id));
}

// Map old paymentMode+bank → default wallet id for backward compat
export function legacyWalletId(paymentMode: string, bank?: string): string {
  if (paymentMode === 'gpay') return bank === 'yes_bank' ? 'gpay_yes' : 'gpay_hdfc';
  return 'cash';
}

// Derive paymentMode+bank from walletId for saving (keeps CSV/legacy fields meaningful)
export function walletToPaymentMode(walletId: string): { paymentMode: 'gpay' | 'cash'; bank?: 'yes_bank' | 'hdfc' } {
  if (walletId === 'gpay_hdfc') return { paymentMode: 'gpay', bank: 'hdfc' };
  if (walletId === 'gpay_yes') return { paymentMode: 'gpay', bank: 'yes_bank' };
  return { paymentMode: 'cash' };
}

export function walletNetBalance(walletId: string, transactions: import('./types').Transaction[]): number {
  const w = getWallets().find(x => x.id === walletId);
  const txNet = transactions
    .filter(t => (t.walletId ?? legacyWalletId(t.paymentMode, t.bank)) === walletId)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  return (w?.openingBalance ?? 0) + txNet;
}
