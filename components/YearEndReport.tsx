'use client';
import { Transaction, Category, CategoryTransfer } from '@/lib/types';
import { generateYearReport, downloadText } from '@/lib/insights';

interface Props {
  transactions: Transaction[];
  transfers: CategoryTransfer[];
  categories: Category[];
}

export default function YearEndReport({ transactions, transfers, categories }: Props) {
  const year = new Date().getFullYear();

  function download() {
    const content = generateYearReport(transactions, transfers, categories, year);
    downloadText(`money-buddy-${year}-report.csv`, content);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={transactions.length === 0}
      className="clay-btn clay w-full py-3 rounded-[14px] font-bold text-sm text-stone-600 disabled:opacity-40 text-center">
      📋 Download {year} Year Report
    </button>
  );
}
