'use client';
import { useState, useEffect, useRef } from 'react';
import { Transaction } from '@/lib/types';
import TransactionForm from './TransactionForm';

const BANK_LABEL: Record<string, string> = { yes_bank: 'Yes Bank', hdfc: 'HDFC' };

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function TransactionList({
  transactions,
  onUpdate,
  onDelete,
}: {
  transactions: Transaction[];
  onUpdate: (txn: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ txn: Transaction } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleDelete(txn: Transaction) {
    // Commit any prior pending delete immediately
    if (pendingDelete) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onDelete(pendingDelete.txn.id);
    }
    setPendingDelete({ txn });
    timerRef.current = setTimeout(() => {
      onDelete(txn.id);
      setPendingDelete(null);
    }, 5000);
  }

  function handleUndo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPendingDelete(null);
  }

  const sorted = [...transactions]
    .filter(t => t.id !== pendingDelete?.txn.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        String(t.amount).includes(q)
      )
    : sorted;

  // Group by month
  const groups: { key: string; txns: Transaction[] }[] = [];
  for (const txn of filtered) {
    const key = monthKey(txn.date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.txns.push(txn);
    else groups.push({ key, txns: [txn] });
  }

  return (
    <>
      {/* Search bar */}
      <div className="clay flex items-center gap-2 px-4 py-3">
        <span className="text-base" aria-hidden>🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="flex-1 bg-transparent outline-none font-semibold text-stone-700 placeholder:text-stone-400 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-stone-400 font-black text-sm px-1">✕</button>
        )}
      </div>

      {/* Undo toast */}
      {pendingDelete && (
        <div className="clay-amber clay animate-slide-up flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-bold text-amber-900 truncate">
            🗑️ Deleted &ldquo;{pendingDelete.txn.description || fmt(pendingDelete.txn.amount)}&rdquo;
          </span>
          <button
            onClick={handleUndo}
            className="clay-btn shrink-0 font-black text-amber-900 text-sm px-3 py-1.5 rounded-xl bg-white/60 border border-amber-200">
            Undo ↩️
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="clay p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">{q ? '🔍' : '🪙'}</span>
          <p className="text-lg font-black text-stone-700">{q ? 'No results' : 'No entries yet!'}</p>
          <p className="text-sm font-semibold text-stone-500">
            {q ? `Nothing matching "${search}"` : 'Add your first income or expense above ☝️'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ key, txns }) => {
            const groupIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const groupExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return (
              <div key={key} className="flex flex-col gap-2">
                {/* Month header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-stone-400 uppercase tracking-wider">{monthLabel(key)}</span>
                  <div className="flex gap-2 text-xs font-bold">
                    {groupIncome > 0 && <span className="text-emerald-600">+{fmt(groupIncome)}</span>}
                    {groupExpense > 0 && <span className="text-rose-500">-{fmt(groupExpense)}</span>}
                  </div>
                </div>

                {txns.map(txn => (
                  <div key={txn.id}
                    className={`animate-pop-in flex items-center gap-3 p-4 rounded-[20px] border-2 border-white/60 ${txn.type === 'income'
                      ? 'bg-gradient-to-r from-emerald-50 to-white shadow-[5px_5px_10px_rgba(52,211,153,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'
                      : 'bg-gradient-to-r from-rose-50 to-white shadow-[5px_5px_10px_rgba(248,113,113,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'}`}>

                    <div className={`text-2xl w-11 h-11 flex items-center justify-center rounded-[12px] flex-shrink-0 ${txn.type === 'income' ? 'clay-green' : 'clay-red'}`}
                      aria-hidden="true">
                      {txn.type === 'income' ? '💰' : '💸'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {txn.description
                        ? <p className="font-black text-stone-800 text-sm truncate">{txn.description}</p>
                        : <p className="font-semibold text-stone-400 text-sm italic">No note</p>
                      }
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-stone-500 font-semibold">{fmtDate(txn.date)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${txn.paymentMode === 'gpay' ? 'clay-blue text-blue-900' : 'clay-yellow text-yellow-900'}`}>
                          {txn.paymentMode === 'gpay' ? `📱 ${BANK_LABEL[txn.bank ?? '']}` : '💵 Cash'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`font-black text-base ${txn.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditing(txn)}
                          aria-label={`Edit ${txn.description}`}
                          className="clay-btn text-xs bg-white text-stone-600 font-bold px-2.5 py-1.5 rounded-xl border border-stone-200 min-h-[32px]">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(txn)}
                          aria-label={`Delete ${txn.description}`}
                          className="clay-btn text-xs bg-white text-rose-400 font-bold px-2.5 py-1.5 rounded-xl border border-rose-100 min-h-[32px]">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-4"
          style={{ background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(3px)', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="w-full max-w-sm animate-slide-up">
            <TransactionForm
              initial={editing}
              onSave={txn => { onUpdate(txn); setEditing(null); }}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
