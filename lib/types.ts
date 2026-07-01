export type TxType = 'income' | 'expense' | 'investment';
export type PaymentMode = 'gpay' | 'cash';
export type Bank = 'yes_bank' | 'hdfc';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Wallet {
  id: string;
  name: string;
  emoji: string;
  openingBalance?: number;
  minBalance?: number;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  /** Wallet used for this category — category transfers move money between linked wallets */
  walletId?: string;
}

/** @deprecated use Category */
export type ExpenseCategory = Category;

export interface CategoryTransfer {
  id: string;
  amount: number;
  fromCategoryId: string;
  toCategoryId: string;
  note?: string;
  date: string;
  createdAt: number;
  expenseTxnId?: string;
  incomeTxnId?: string;
}

export interface SavingsGoal {
  target: number;
  label: string;
}

export interface RecurringRule {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  walletId: string;
  categoryId?: string;
  frequency: Frequency;
  nextDue: string;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  paymentMode: PaymentMode;
  bank?: Bank;
  walletId?: string;
  categoryId?: string;
  date: string;
  createdAt: number;
}
