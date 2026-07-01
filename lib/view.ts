import { Transaction, Category } from './types';

export type ViewMode = 'all' | string;

export function sortCategoriesForView(categories: Category[]): Category[] {
  const priority = ['personal', 'business'];
  return [...categories].sort((a, b) => {
    const ai = priority.findIndex(k => a.name.toLowerCase().includes(k));
    const bi = priority.findIndex(k => b.name.toLowerCase().includes(k));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function filterTransactionsForView(transactions: Transaction[], viewMode: ViewMode): Transaction[] {
  if (!viewMode || viewMode === 'all') return transactions;
  return transactions.filter(t => {
    if (t.type !== 'income' && t.type !== 'expense') return false;
    return t.categoryId === viewMode;
  });
}

export function viewModeLabel(viewMode: ViewMode, categories: Category[]): string {
  if (viewMode === 'all') return 'All';
  const cat = categories.find(c => c.id === viewMode);
  return cat ? `${cat.emoji} ${cat.name}` : 'View';
}
