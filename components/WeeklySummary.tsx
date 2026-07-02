'use client';
import { Transaction } from '@/lib/types';
import { isCurrentWeek, fmt } from '@/lib/insights';
import { getTransfers, sumRealExpense, sumRealIncome } from '@/lib/transfers';

export default function WeeklySummary({ transactions }: { transactions: Transaction[] }) {
  const week = transactions.filter(t => isCurrentWeek(t.date));
  if (week.length === 0) return null;

  const transfers = getTransfers().filter(t => isCurrentWeek(t.date));
  const income = sumRealIncome(week, transfers);
  const expense = sumRealExpense(week, transfers);
  const investment = week.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  return (
    <div className="clay p-4 flex flex-col gap-2">
      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider">📆 This Week</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-emerald-600 font-black">+{fmt(income)}</span><span className="text-stone-400 font-semibold text-xs block">Income</span></div>
        <div><span className="text-rose-500 font-black">-{fmt(expense)}</span><span className="text-stone-400 font-semibold text-xs block">Expense</span></div>
        <div><span className="text-blue-600 font-black">-{fmt(investment)}</span><span className="text-stone-400 font-semibold text-xs block">Invested</span></div>
        <div><span className={`font-black ${net >= 0 ? 'text-amber-700' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</span><span className="text-stone-400 font-semibold text-xs block">Net</span></div>
      </div>
    </div>
  );
}
