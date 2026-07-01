'use client';
import { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/categories';
import { clearCategoryFromTransactions } from '@/lib/storage';
import { clearTransfersForCategory } from '@/lib/transfers';

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

interface Props {
  onClose: () => void;
  onChange: () => void;
}

export default function SettingsPanel({ onClose, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏷️');
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  function reload() {
    const cats = getCategories();
    setCategories(cats);
    setBudgetDrafts(Object.fromEntries(
      cats.map(c => [c.id, c.budget > 0 ? String(c.budget) : ''])
    ));
  }

  useEffect(() => { reload(); }, []);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addCategory(name, newEmoji);
    setNewName('');
    setNewEmoji('🏷️');
    reload();
    onChange();
  }

  function handleDelete(id: string) {
    deleteCategory(id);
    clearCategoryFromTransactions(id);
    clearTransfersForCategory(id);
    reload();
    onChange();
  }

  function saveBudget(id: string) {
    const val = Number(budgetDrafts[id] || 0);
    updateCategory(id, { budget: val > 0 ? val : 0 });
    reload();
    onChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="clay animate-slide-up w-full max-w-sm max-h-[90dvh] overflow-y-auto flex flex-col gap-4 p-5 rounded-t-[24px] sm:rounded-[24px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-800">⚙️ Settings</h2>
          <button onClick={onClose} className="clay-btn w-10 h-10 rounded-[12px] text-stone-500 font-black">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-black text-stone-400 uppercase tracking-wider mb-1">Categories</p>
            <p className="text-xs font-semibold text-stone-500 leading-relaxed">
              Optional — tag income &amp; expenses (e.g. Personal, Business) with separate monthly budgets.
            </p>
          </div>

          {categories.length === 0 ? (
            <p className="text-sm font-semibold text-stone-400 text-center py-4 clay rounded-[14px]">
              No categories yet. Add one below!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="clay p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.emoji}</span>
                    <span className="font-black text-stone-800 flex-1">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="clay-btn text-rose-400 text-xs px-2 py-1 rounded-[8px]">
                      Delete
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-stone-400">Budget</span>
                    <span className="text-stone-400 font-black text-sm">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={budgetDrafts[cat.id] ?? ''}
                      onChange={e => setBudgetDrafts(d => ({ ...d, [cat.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && saveBudget(cat.id)}
                      placeholder="Monthly limit"
                      className="flex-1 bg-transparent outline-none text-sm font-bold text-stone-700 placeholder:text-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => saveBudget(cat.id)}
                      className="clay-btn bg-violet-500 text-white font-black text-xs px-2.5 py-1 rounded-[8px]">
                      Save
                    </button>
                  </div>
                  {cat.budget > 0 && (
                    <p className="text-[10px] font-bold text-violet-600">Budget set: {fmt(cat.budget)}/month</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="clay p-3 flex flex-col gap-2">
            <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Add category</p>
            <div className="flex gap-2">
              <input
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                className="clay w-12 text-center text-lg bg-transparent outline-none"
                maxLength={2}
                aria-label="Category emoji"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. Personal, Business"
                className="clay flex-1 px-3 py-2 text-sm font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="clay-btn py-2.5 bg-violet-500 text-white font-black text-sm rounded-[12px] disabled:opacity-40">
              + Add Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
