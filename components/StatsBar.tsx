'use client';
import { useState } from 'react';
import { Transaction, Category, CategoryTransfer } from '@/lib/types';
import { computeCategoryTotals, fmt, isCurrentMonth } from '@/lib/insights';

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface Props {
  transactions: Transaction[];
  budget: number;
  categories: Category[];
  categoryFilter: string | null;
  transfers: CategoryTransfer[];
}

export default function StatsBar({ transactions, budget, categories, categoryFilter, transfers }: Props) {
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);
  const [showNet, setShowNet] = useState(false);

  const monthly = transactions.filter(t => isCurrentMonth(t.date));

  const income = monthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const investment = monthly.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const activeCategory = categoryFilter && categoryFilter !== '__none'
    ? categories.find(c => c.id === categoryFilter)
    : null;

  const catTotals = categoryFilter
    ? computeCategoryTotals(
        monthly,
        transfers.filter(t => isCurrentMonth(t.date)),
        categoryFilter === '__none' ? null : categoryFilter,
        false,
      )
    : null;

  const categoryBudget = activeCategory?.budget ?? 0;
  const categoryPct = categoryBudget > 0 && catTotals ? Math.min(catTotals.expense / categoryBudget, 1) : 0;
  const categoryOver = categoryBudget > 0 && catTotals && catTotals.expense > categoryBudget;

  const budgetPct = budget > 0 ? Math.min(expense / budget, 1) : 0;
  const overBudget = budget > 0 && expense > budget;

  const displayIncome = catTotals ? catTotals.income : income;
  const displayExpense = catTotals ? catTotals.expense : expense;
  const displayNet = catTotals ? catTotals.net : net;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-black text-stone-400 uppercase tracking-wider px-1">
        📅 {currentMonthLabel()}
        {activeCategory && <span className="text-violet-600 normal-case"> · {activeCategory.emoji} {activeCategory.name}</span>}
        {categoryFilter === '__none' && <span className="text-stone-500 normal-case"> · Uncategorized</span>}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="clay-green clay p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Income 💚</span>
            <button onClick={() => setShowIncome(v => !v)} className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity clay-btn">
              {showIncome ? '👁' : '🙈'}
            </button>
          </div>
          <span className="text-xl font-black text-emerald-900 tracking-tight">
            {showIncome ? fmt(displayIncome) : '₹ ·····'}
          </span>
        </div>

        <div className="clay-red clay p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
              Expense ❤️{!categoryFilter && overBudget ? ' 🚨' : categoryOver ? ' 🚨' : ''}
            </span>
            <button onClick={() => setShowExpense(v => !v)} className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity clay-btn">
              {showExpense ? '👁' : '🙈'}
            </button>
          </div>
          <span className="text-xl font-black text-red-900 tracking-tight">
            {showExpense ? fmt(displayExpense) : '₹ ·····'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowInvestment(v => !v)}
        className="clay clay-blue clay-btn flex items-center justify-between px-4 py-2">
        <span className="text-xs font-black uppercase tracking-wider text-blue-900">📈 Investment</span>
        <span className="text-sm font-black text-blue-900">
          {showInvestment ? fmt(investment) : '₹ ·····'}
        </span>
      </button>

      {activeCategory && categoryBudget > 0 && catTotals && (
        <div className="px-1">
          <div className="h-1.5 rounded-full bg-violet-200/60 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${categoryOver ? 'bg-violet-700' : 'bg-violet-400'}`} style={{ width: `${categoryPct * 100}%` }} />
          </div>
          <p className="text-[10px] font-bold text-violet-800/70 mt-0.5">
            {categoryOver
              ? `${activeCategory.emoji} ${activeCategory.name} over by ${fmt(catTotals.expense - categoryBudget)}`
              : `${fmt(categoryBudget - catTotals.expense)} left of ${fmt(categoryBudget)} ${activeCategory.name} budget`}
          </p>
        </div>
      )}

      {!categoryFilter && budget > 0 && (
        <div className="px-1">
          <div className="h-1.5 rounded-full bg-red-200/60 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-600' : 'bg-red-400'}`} style={{ width: `${budgetPct * 100}%` }} />
          </div>
          <p className="text-[10px] font-bold text-red-800/70 mt-0.5">
            {overBudget ? `Over total budget by ${fmt(expense - budget)}` : `${fmt(budget - expense)} left of ${fmt(budget)} total expense budget`}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowNet(v => !v)}
        className="clay clay-amber clay-btn flex items-center justify-between px-4 py-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-amber-900">
          🟠 {categoryFilter ? 'Category Net' : 'Net Income'} <span className="normal-case font-semibold opacity-70">{categoryFilter ? '(in − out ± transfers)' : '(after expenses)'}</span>
        </span>
        <span className={`text-base font-black ${displayNet >= 0 ? 'text-amber-800' : 'text-red-700'}`}>
          {showNet ? `${displayNet >= 0 ? '+' : ''}${fmt(displayNet)}` : '₹ ·····'}
        </span>
      </button>
    </div>
  );
}
