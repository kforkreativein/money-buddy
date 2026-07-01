'use client';
import { useState } from 'react';
import { Category, CategoryTransfer } from '@/lib/types';
import { getCategoryById } from '@/lib/categories';
import { getWallets } from '@/lib/wallets';
import { getTransfers, undoCategoryTransfer } from '@/lib/transfers';
import { fmt } from '@/lib/insights';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface Props {
  categories: Category[];
  onUndo: () => void;
}

export default function TransferHistory({ categories, onUndo }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CategoryTransfer[]>([]);
  const wallets = getWallets();

  function reload() {
    setItems([...getTransfers()].sort((a, b) => b.createdAt - a.createdAt));
  }

  function handleOpen() {
    setOpen(v => {
      if (!v) reload();
      return !v;
    });
  }

  function handleUndo(id: string) {
    undoCategoryTransfer(id);
    reload();
    onUndo();
  }

  if (categories.length < 2) return null;

  return (
    <div className="clay flex flex-col">
      <button
        type="button"
        onClick={handleOpen}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>📜 Transfer History</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-sm font-semibold text-stone-400 text-center py-3">No transfers yet.</p>
          ) : (
            items.slice(0, 20).map(t => {
              const from = getCategoryById(t.fromCategoryId);
              const to = getCategoryById(t.toCategoryId);
              const fromWallet = from?.walletId ? wallets.find(w => w.id === from.walletId) : null;
              const toWallet = to?.walletId ? wallets.find(w => w.id === to.walletId) : null;
              const walletNote = fromWallet && toWallet && t.expenseTxnId
                ? `${fromWallet.name} → ${toWallet.name}`
                : null;

              return (
                <div key={t.id} className="clay p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-stone-800">
                      {from?.emoji} {from?.name ?? '?'} → {to?.emoji} {to?.name ?? '?'}
                    </span>
                    <span className="text-sm font-black text-violet-700">{fmt(t.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-400">{fmtDate(t.date)}{walletNote ? ` · ${walletNote}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => handleUndo(t.id)}
                      className="clay-btn text-xs font-bold text-rose-500 px-2 py-1 rounded-[8px]">
                      Undo ↩️
                    </button>
                  </div>
                  {t.note && <p className="text-xs text-stone-500 font-semibold">{t.note}</p>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
