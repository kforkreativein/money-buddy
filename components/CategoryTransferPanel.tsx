'use client';
import { useState, useMemo } from 'react';
import { Category } from '@/lib/types';
import { executeCategoryTransfer } from '@/lib/transfers';
import { getWallets } from '@/lib/wallets';

interface Props {
  categories: Category[];
  onTransfer: (result: { walletMoved: boolean }) => void;
}

export default function CategoryTransferPanel({ categories, onTransfer }: Props) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const wallets = useMemo(() => getWallets(), [open, fromId, toId]);

  const preview = useMemo(() => {
    if (!fromId || !toId || fromId === toId) return null;
    const from = categories.find(c => c.id === fromId);
    const to = categories.find(c => c.id === toId);
    if (!from?.walletId || !to?.walletId) {
      return { type: 'warn' as const, text: 'Link wallets in Settings for auto bank transfer.' };
    }
    if (from.walletId === to.walletId) {
      return { type: 'warn' as const, text: 'Both categories share the same wallet — only totals update.' };
    }
    const fromW = wallets.find(w => w.id === from.walletId);
    const toW = wallets.find(w => w.id === to.walletId);
    return {
      type: 'ok' as const,
      text: `Will move money: ${fromW?.name ?? 'Wallet'} → ${toW?.name ?? 'Wallet'}`,
    };
  }, [fromId, toId, categories, wallets]);

  if (categories.length < 2) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!fromId || !toId) { setError('Pick both categories'); return; }
    if (fromId === toId) { setError('Categories must be different'); return; }

    const result = executeCategoryTransfer({
      amount: amt,
      fromCategoryId: fromId,
      toCategoryId: toId,
      note: note.trim() || undefined,
      date: new Date().toISOString().slice(0, 10),
    });

    if (result.walletMoved && result.fromWalletName && result.toWalletName) {
      setSuccess(`Done! ₹${amt.toLocaleString('en-IN')} moved ${result.fromWalletName} → ${result.toWalletName}`);
    } else if (result.skipReason) {
      setSuccess(`Category updated. ${result.skipReason}`);
    }

    setAmount('');
    setNote('');
    onTransfer({ walletMoved: result.walletMoved });
  }

  return (
    <div className="clay flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>🔁 Transfer Between Categories</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-stone-500">
            Move funds between Personal &amp; Business. If each category has a linked wallet in Settings, money moves between those bank accounts automatically.
          </p>
          <div className="flex gap-2 flex-wrap">
            <select value={fromId} onChange={e => setFromId(e.target.value)}
              className="clay flex-1 min-w-[120px] px-2 py-2.5 font-bold text-stone-700 bg-transparent outline-none">
              <option value="">From…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
            <span className="self-center text-stone-400">→</span>
            <select value={toId} onChange={e => setToId(e.target.value)}
              className="clay flex-1 min-w-[120px] px-2 py-2.5 font-bold text-stone-700 bg-transparent outline-none">
              <option value="">To…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          {preview && (
            <p className={`text-xs font-bold px-2 py-1.5 rounded-[10px] ${
              preview.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {preview.type === 'ok' ? '💳' : '💡'} {preview.text}
            </p>
          )}
          <div className="flex gap-2">
            <span className="text-stone-500 font-black self-center">₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Amount"
              className="clay flex-1 px-3 py-2.5 bg-transparent outline-none font-bold text-stone-700"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="clay px-3 py-2.5 font-semibold text-stone-700 bg-transparent outline-none w-full"
          />
          {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
          {success && <p className="text-xs font-bold text-emerald-600 leading-relaxed">{success}</p>}
          <button type="submit" className="clay-btn py-2.5 bg-violet-500 text-white font-black text-sm rounded-[12px]">Transfer</button>
        </form>
      )}
    </div>
  );
}
