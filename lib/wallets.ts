import { Wallet } from './types';
import { userStorageKey } from './auth';

const KEY = 'money_buddy_wallets';

function storageKey() {
  return userStorageKey(KEY);
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
    return migrateDefaultWalletNames(wallets);
  } catch { return DEFAULT_WALLETS; }
}

export function saveWallets(wallets: Wallet[]) {
  localStorage.setItem(storageKey(), JSON.stringify(wallets));
}

export function updateWallet(id: string, patch: Partial<Pick<Wallet, 'name' | 'emoji' | 'openingBalance' | 'minBalance'>>) {
  const updated = getWallets().map(w => w.id === id ? { ...w, ...patch } : w);
  saveWallets(updated);
  return updated;
}

export function addWallet(w: Omit<Wallet, 'id'>): Wallet {
  const wallet = { ...w, id: crypto.randomUUID() };
  saveWallets([...getWallets(), wallet]);
  return wallet;
}

export function deleteWallet(id: string) {
  saveWallets(getWallets().filter(w => w.id !== id));
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
