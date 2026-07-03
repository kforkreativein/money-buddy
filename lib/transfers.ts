import { CategoryTransfer, Transaction } from './types';
import { userStorageKey } from './auth';
import { scheduleCloudSync } from './supabase/sync';
import { getCategoryById } from './categories';
import { getWallets, walletToPaymentMode } from './wallets';
import { addTransaction, deleteTransaction } from './storage';

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
export function executeCategoryTransfer(input: Omit<CategoryTransfer, 'id' | 'createdAt' | 'expenseTxnId' | 'incomeTxnId'>): CategoryTransferResult {
  const fromCat = getCategoryById(input.fromCategoryId);
  const toCat = getCategoryById(input.toCategoryId);
  const fromWalletId = fromCat?.walletId;
  const toWalletId = toCat?.walletId;

  let expenseTxnId: string | undefined;
  let incomeTxnId: string | undefined;
  let walletMoved = false;
  let fromWalletName: string | undefined;
  let toWalletName: string | undefined;
  let skipReason: string | undefined;

  if (!fromWalletId || !toWalletId) {
    skipReason = 'Link a wallet to each category in Settings to auto-move between bank accounts.';
  } else if (fromWalletId === toWalletId) {
    skipReason = 'Both categories use the same wallet — only category totals were updated.';
  } else {
    const wallets = getWallets();
    const fromWallet = wallets.find(w => w.id === fromWalletId);
    const toWallet = wallets.find(w => w.id === toWalletId);
    if (!fromWallet || !toWallet) {
      skipReason = 'Linked wallet not found. Check Settings.';
    } else {
      const now = Date.now();
      expenseTxnId = crypto.randomUUID();
      incomeTxnId = crypto.randomUUID();
      const fromPm = walletToPaymentMode(fromWalletId);
      const toPm = walletToPaymentMode(toWalletId);

      addTransaction({
        id: expenseTxnId,
        type: 'expense',
        amount: input.amount,
        description: `Transfer → ${toCat!.name} (${toWallet.name})`,
        paymentMode: fromPm.paymentMode,
        bank: fromPm.bank,
        walletId: fromWalletId,
        date: input.date,
        createdAt: now,
      });

      addTransaction({
        id: incomeTxnId,
        type: 'income',
        amount: input.amount,
        description: `Transfer ← ${fromCat!.name} (${fromWallet.name})`,
        paymentMode: toPm.paymentMode,
        bank: toPm.bank,
        walletId: toWalletId,
        date: input.date,
        createdAt: now + 1,
      });

      walletMoved = true;
      fromWalletName = fromWallet.name;
      toWalletName = toWallet.name;
    }
  }

  const transfer = addTransfer({ ...input, expenseTxnId, incomeTxnId });

  return {
    transfer,
    walletMoved,
    fromWalletName,
    toWalletName,
    skipReason,
  };
}

/** Undo a category transfer and reverse linked wallet transactions. */
export function undoCategoryTransfer(id: string): boolean {
  const transfer = getTransfers().find(t => t.id === id);
  if (!transfer) return false;
  if (transfer.expenseTxnId) deleteTransaction(transfer.expenseTxnId);
  if (transfer.incomeTxnId) deleteTransaction(transfer.incomeTxnId);
  deleteTransfer(id);
  return true;
}

export function deleteTransfer(id: string) {
  save(getTransfers().filter(t => t.id !== id));
}

export function clearTransfersForCategory(categoryId: string) {
  save(getTransfers().filter(t => t.fromCategoryId !== categoryId && t.toCategoryId !== categoryId));
}

/** Transaction IDs created when moving money between linked wallets for a category transfer. */
export function getInternalTransferTxnIds(transfers: CategoryTransfer[]): Set<string> {
  const ids = new Set<string>();
  for (const t of transfers) {
    if (t.expenseTxnId) ids.add(t.expenseTxnId);
    if (t.incomeTxnId) ids.add(t.incomeTxnId);
  }
  return ids;
}

/** Wallet moves from category transfers — not real income or expense. */
export function isInternalTransferTxn(txn: Transaction, transferTxnIds?: Set<string>): boolean {
  if (transferTxnIds?.has(txn.id)) return true;
  return txn.description.startsWith('Transfer →') || txn.description.startsWith('Transfer ←');
}

export function sumRealIncome(transactions: Transaction[], transfers: CategoryTransfer[]): number {
  const ids = getInternalTransferTxnIds(transfers);
  return transactions
    .filter(t => t.type === 'income' && !isInternalTransferTxn(t, ids))
    .reduce((s, t) => s + t.amount, 0);
}

/** Pay a credit card bill: expense from bank wallet + income to CC wallet (excluded from totals via Transfer prefix). */
export function executeCCPayment(ccWalletId: string, fromWalletId: string, amount: number, date: string): void {
  const wallets = getWallets();
  const ccWallet = wallets.find(w => w.id === ccWalletId);
  const bankWallet = wallets.find(w => w.id === fromWalletId);
  if (!ccWallet || !bankWallet) return;
  const now = Date.now();
  const fromPm = walletToPaymentMode(fromWalletId);
  const toPm = walletToPaymentMode(ccWalletId);
  addTransaction({
    id: crypto.randomUUID(),
    type: 'expense',
    amount,
    description: `Transfer → ${ccWallet.name}`,
    paymentMode: fromPm.paymentMode,
    bank: fromPm.bank,
    walletId: fromWalletId,
    date,
    createdAt: now,
  });
  addTransaction({
    id: crypto.randomUUID(),
    type: 'income',
    amount,
    description: `Transfer ← ${bankWallet.name}`,
    paymentMode: toPm.paymentMode,
    bank: toPm.bank,
    walletId: ccWalletId,
    date,
    createdAt: now + 1,
  });
}

export function sumRealExpense(transactions: Transaction[], transfers: CategoryTransfer[]): number {
  const ids = getInternalTransferTxnIds(transfers);
  return transactions
    .filter(t => t.type === 'expense' && !isInternalTransferTxn(t, ids))
    .reduce((s, t) => s + t.amount, 0);
}
