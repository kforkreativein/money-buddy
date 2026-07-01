'use client';
import { useState, useEffect, useRef } from 'react';
import { Transaction, Wallet } from '@/lib/types';
import { getWallets, legacyWalletId } from '@/lib/wallets';
import TransactionForm from './TransactionForm';

function walletLabel(t: Transaction, wallets: Wallet[]): { emoji: string; name: string } {
  const id = t.walletId ?? legacyWalletId(t.paymentMode, t.bank);
  const w = wallets.find(w => w.id === id);
  if (w) return { emoji: w.emoji, name: w.name };
  // ultimate fallback for very old data
  return { emoji: t.paymentMode === 'gpay' ? '📱' : '💵', name: t.paymentMode === 'gpay' ? 'GPay' : 'Cash' };
}

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
  walletFilter,
}: {
  transactions: Transaction[];
  onUpdate: (txn: Transaction) => void;
  onDelete: (id: string) => void;
  walletFilter?: string | null;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ txn: Transaction } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const PAGE = 5;

  useEffect(() => { setWallets(getWallets()); }, [transactions]);
  useEffect(() => { setShowAll(false); }, [walletFilter]);
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
    .filter(t => !walletFilter || (t.walletId ?? legacyWalletId(t.paymentMode, t.bank)) === walletFilter)
    .sort((a, b) => b.createdAt - a.createdAt);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        String(t.amount).includes(q)
      )
    : sorted;

  const visible = showAll ? filtered : filtered.slice(0, PAGE);
  const hasMore = filtered.length > PAGE;

  // Group by month
  const groups: { key: string; txns: Transaction[] }[] = [];
  for (const txn of visible) {
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
          onChange={e => { setSearch(e.target.value); setShowAll(false); }}
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
            {q ? `Nothing matching "${search}"` : 'Add your first entry above ☝️'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ key, txns }) => {
            const groupIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const groupExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const groupInvestment = txns.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
            return (
              <div key={key} className="flex flex-col gap-2">
                {/* Month header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-stone-400 uppercase tracking-wider">{monthLabel(key)}</span>
                  <div className="flex gap-2 text-xs font-bold">
                    {groupIncome > 0 && <span className="text-emerald-600">+{fmt(groupIncome)}</span>}
                    {groupExpense > 0 && <span className="text-rose-500">-{fmt(groupExpense)}</span>}
                    {groupInvestment > 0 && <span className="text-blue-600">📈{fmt(groupInvestment)}</span>}
                  </div>
                </div>

                {txns.map(txn => {
                  const cardClass = txn.type === 'income'
                    ? 'bg-gradient-to-r from-emerald-50 to-white shadow-[5px_5px_10px_rgba(52,211,153,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'
                    : txn.type === 'investment'
                      ? 'bg-gradient-to-r from-blue-50 to-white shadow-[5px_5px_10px_rgba(96,165,250,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'
                      : 'bg-gradient-to-r from-rose-50 to-white shadow-[5px_5px_10px_rgba(248,113,113,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]';
                  const iconClass = txn.type === 'income' ? 'clay-green' : txn.type === 'investment' ? 'clay-blue' : 'clay-red';
                  const icon = txn.type === 'income' ? '💰' : txn.type === 'investment' ? '📈' : '💸';
                  const amountClass = txn.type === 'income' ? 'text-emerald-600' : txn.type === 'investment' ? 'text-blue-600' : 'text-rose-500';
                  const amountPrefix = txn.type === 'income' ? '+' : '-';

                  return (
                  <div key={txn.id}
                    className={`animate-pop-in flex items-center gap-3 p-4 rounded-[20px] border-2 border-white/60 ${cardClass}`}>

                    <div className={`text-2xl w-11 h-11 flex items-center justify-center rounded-[12px] flex-shrink-0 ${iconClass}`}
                      aria-hidden="true">
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      {txn.description
                        ? <p className="font-black text-stone-800 text-sm truncate">{txn.description}</p>
                        : <p className="font-semibold text-stone-400 text-sm italic">No note</p>
                      }
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-stone-500 font-semibold">{fmtDate(txn.date)}</span>
                        {(() => { const wl = walletLabel(txn, wallets); return (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full clay-blue text-blue-900">
                            {wl.emoji} {wl.name}
                          </span>
                        ); })()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`font-black text-base ${amountClass}`}>
                        {amountPrefix}{fmt(txn.amount)}
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
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="clay-btn clay w-full py-3 font-black text-stone-600 text-sm text-center">
          {showAll ? '▲ Show less' : `▼ Show ${filtered.length - PAGE} more`}
        </button>
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
