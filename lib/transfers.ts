import { CategoryTransfer } from './types';
import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';
import { getCategoryById } from './categories';
import { getWallets, walletToPaymentMode } from './wallets';
import { addTransaction } from './storage';

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
  scheduleCloudSync();
}

export function addTransfer(t: Omit<CategoryTransfer, 'id' | 'createdAt'>): CategoryTransfer {
  const transfer: CategoryTransfer = { ...t, id: crypto.randomUUID(), createdAt: Date.now() };
  save([...getTransfers(), transfer]);
  return transfer;
}

export interface CategoryTransferResult {
  transfer: CategoryTransfer;
  walletMoved: boolean;
  fromWalletName?: string;
  toWalletName?: string;
  skipReason?: string;
}

/** Record category transfer and move money between linked wallets when configured. */
export function executeCategoryTransfer(input: Omit<CategoryTransfer, 'id' | 'createdAt'>): CategoryTransferResult {
  const transfer = addTransfer(input);
  const fromCat = getCategoryById(input.fromCategoryId);
  const toCat = getCategoryById(input.toCategoryId);
  const fromWalletId = fromCat?.walletId;
  const toWalletId = toCat?.walletId;

  if (!fromWalletId || !toWalletId) {
    return {
      transfer,
      walletMoved: false,
      skipReason: 'Link a wallet to each category in Settings to auto-move between bank accounts.',
    };
  }

  if (fromWalletId === toWalletId) {
    return {
      transfer,
      walletMoved: false,
      skipReason: 'Both categories use the same wallet — only category totals were updated.',
    };
  }

  const wallets = getWallets();
  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  if (!fromWallet || !toWallet) {
    return {
      transfer,
      walletMoved: false,
      skipReason: 'Linked wallet not found. Check Settings.',
    };
  }

  const now = Date.now();
  const fromPm = walletToPaymentMode(fromWalletId);
  const toPm = walletToPaymentMode(toWalletId);

  addTransaction({
    id: crypto.randomUUID(),
    type: 'expense',
    amount: input.amount,
    description: `Transfer → ${toCat.name} (${toWallet.name})`,
    paymentMode: fromPm.paymentMode,
    bank: fromPm.bank,
    walletId: fromWalletId,
    date: input.date,
    createdAt: now,
  });

  addTransaction({
    id: crypto.randomUUID(),
    type: 'income',
    amount: input.amount,
    description: `Transfer ← ${fromCat.name} (${fromWallet.name})`,
    paymentMode: toPm.paymentMode,
    bank: toPm.bank,
    walletId: toWalletId,
    date: input.date,
    createdAt: now + 1,
  });

  return {
    transfer,
    walletMoved: true,
    fromWalletName: fromWallet.name,
    toWalletName: toWallet.name,
  };
}

export function deleteTransfer(id: string) {
  save(getTransfers().filter(t => t.id !== id));
}

export function clearTransfersForCategory(categoryId: string) {
  save(getTransfers().filter(t => t.fromCategoryId !== categoryId && t.toCategoryId !== categoryId));
}
