export type TxType = 'income' | 'expense';
export type PaymentMode = 'gpay' | 'cash';
export type Bank = 'yes_bank' | 'hdfc';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  paymentMode: PaymentMode;
  bank?: Bank;
  date: string;       // YYYY-MM-DD
  createdAt: number;  // Date.now()
}
