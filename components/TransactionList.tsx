'use client';
import { useState } from 'react';
import { Transaction } from '@/lib/types';
import TransactionForm from './TransactionForm';

const BANK_LABEL: Record<string, string> = { yes_bank: 'Yes Bank', hdfc: 'HDFC' };

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt);

  if (sorted.length === 0) {
    return (
      <div className="clay p-8 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">🪙</span>
        <p className="text-lg font-black text-stone-700">No entries yet!</p>
        <p className="text-sm font-semibold text-stone-500">Add your first income or expense above ☝️</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {sorted.map(txn => (
          <div key={txn.id}
            className={`animate-pop-in flex items-center gap-3 p-4 rounded-[20px] border-2 border-white/60 ${txn.type === 'income'
              ? 'bg-gradient-to-r from-emerald-50 to-white shadow-[5px_5px_10px_rgba(52,211,153,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'
              : 'bg-gradient-to-r from-rose-50 to-white shadow-[5px_5px_10px_rgba(248,113,113,0.12),-3px_-3px_8px_rgba(255,255,255,0.85)]'}`}>

            {/* Icon */}
            <div className={`text-2xl w-11 h-11 flex items-center justify-center rounded-[12px] flex-shrink-0 ${txn.type === 'income' ? 'clay-green' : 'clay-red'}`}
              aria-hidden="true">
              {txn.type === 'income' ? '💰' : '💸'}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-stone-800 text-sm truncate">{txn.description}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-stone-500 font-semibold">{fmtDate(txn.date)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${txn.paymentMode === 'gpay' ? 'clay-blue text-blue-900' : 'clay-yellow text-yellow-900'}`}>
                  {txn.paymentMode === 'gpay' ? `📱 ${BANK_LABEL[txn.bank ?? '']}` : '💵 Cash'}
                </span>
              </div>
            </div>

            {/* Amount + actions */}
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
                <button onClick={() => setConfirmDelete(txn.id)}
                  aria-label={`Delete ${txn.description}`}
                  className="clay-btn text-xs bg-white text-rose-400 font-bold px-2.5 py-1.5 rounded-xl border border-rose-100 min-h-[32px]">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="clay animate-bounce-in w-full max-w-xs p-6 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🗑️</span>
            <h3 className="font-black text-stone-800 text-lg">Delete this entry?</h3>
            <p className="font-semibold text-stone-500 text-sm">This can't be undone.</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setConfirmDelete(null)}
                className="clay clay-btn flex-1 py-3 font-bold text-stone-600 text-sm">
                Cancel
              </button>
              <button onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="clay-btn flex-1 py-3 rounded-[16px] font-black text-white text-sm bg-rose-400 shadow-lg">
                Delete
              </button>
            </div>
          </div>
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
