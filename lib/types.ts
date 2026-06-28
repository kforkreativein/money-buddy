export type TxType = 'income' | 'expense';
export type PaymentMode = 'gpay' | 'cash';
export type Bank = 'yes_bank' | 'hdfc';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Wallet {
  id: string;
  name: string;
  emoji: string;
  openingBalance?: number;
}

export interface RecurringRule {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  walletId: string;
  frequency: Frequency;
  nextDue: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  paymentMode: PaymentMode;
  bank?: Bank;
  walletId?: string;
  date: string;       // YYYY-MM-DD
  createdAt: number;  // Date.now()
}
