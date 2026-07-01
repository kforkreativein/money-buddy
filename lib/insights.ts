import { Transaction, Category, CategoryTransfer } from './types';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

export { fmt };

export function isCurrentMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isCurrentWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

export interface CategoryTotals {
  categoryId: string | null;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  net: number;
}

export function computeCategoryTotals(
  transactions: Transaction[],
  transfers: CategoryTransfer[],
  categoryId: string | null,
  monthOnly = true,
): CategoryTotals {
  const txns = monthOnly ? transactions.filter(t => isCurrentMonth(t.date)) : transactions;
  const xfer = monthOnly ? transfers.filter(t => isCurrentMonth(t.date)) : transfers;

  const match = (t: Transaction) => {
    if (categoryId === null) return !t.categoryId;
    return t.categoryId === categoryId;
  };

  const income = txns.filter(t => t.type === 'income' && match(t)).reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense' && match(t)).reduce((s, t) => s + t.amount, 0);

  const transferIn = categoryId
    ? xfer.filter(t => t.toCategoryId === categoryId).reduce((s, t) => s + t.amount, 0)
    : 0;
  const transferOut = categoryId
    ? xfer.filter(t => t.fromCategoryId === categoryId).reduce((s, t) => s + t.amount, 0)
    : 0;

  return {
    categoryId,
    income,
    expense,
    transferIn,
    transferOut,
    net: income - expense + transferIn - transferOut,
  };
}

export function savingsProgress(transactions: Transaction[]): number {
  return transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
}

export function generateYearReport(
  transactions: Transaction[],
  transfers: CategoryTransfer[],
  categories: Category[],
  year: number,
): string {
  const txns = transactions.filter(t => new Date(t.date).getFullYear() === year);
  const xfer = transfers.filter(t => new Date(t.date).getFullYear() === year);

  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const investment = txns.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);

  const lines = [
    `Money Buddy — ${year} Year Report`,
    `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    '',
    'OVERALL',
    `Total Income,${income}`,
    `Total Expense,${expense}`,
    `Total Investment,${investment}`,
    `Net Income (Income - Expense),${income - expense}`,
    '',
    'BY CATEGORY',
    'Category,Income,Expense,Transfers In,Transfers Out,Net',
  ];

  const uncategorized = computeCategoryTotals(txns, xfer, null, false);
  lines.push(`Uncategorized,${uncategorized.income},${uncategorized.expense},0,0,${uncategorized.net}`);

  for (const cat of categories) {
    const t = computeCategoryTotals(txns, xfer, cat.id, false);
    lines.push(`${cat.name},${t.income},${t.expense},${t.transferIn},${t.transferOut},${t.net}`);
  }

  lines.push('', 'MONTHLY BREAKDOWN', 'Month,Income,Expense,Investment,Net');
  for (let m = 0; m < 12; m++) {
    const monthTxns = txns.filter(t => new Date(t.date).getMonth() === m);
    if (monthTxns.length === 0) continue;
    const mi = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const me = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const minv = monthTxns.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const label = new Date(year, m).toLocaleDateString('en-IN', { month: 'long' });
    lines.push(`${label},${mi},${me},${minv},${mi - me}`);
  }

  return lines.join('\n');
}

export function downloadText(filename: string, content: string) {
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(content);
  a.download = filename;
  a.click();
}
