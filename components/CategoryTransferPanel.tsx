'use client';
import { useState } from 'react';
import { Category } from '@/lib/types';
import { addTransfer } from '@/lib/transfers';

interface Props {
  categories: Category[];
  onTransfer: () => void;
}

export default function CategoryTransferPanel({ categories, onTransfer }: Props) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (categories.length < 2) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!fromId || !toId) { setError('Pick both categories'); return; }
    if (fromId === toId) { setError('Categories must be different'); return; }
    addTransfer({
      amount: amt,
      fromCategoryId: fromId,
      toCategoryId: toId,
      note: note.trim() || undefined,
      date: new Date().toISOString().slice(0, 10),
    });
    setAmount('');
    setNote('');
    setOpen(false);
    onTransfer();
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
          <p className="text-xs font-semibold text-stone-500">Move allocated funds (e.g. Business → Personal). Does not change wallet balance.</p>
          <div className="flex gap-2 flex-wrap">
            <select value={fromId} onChange={e => setFromId(e.target.value)}
              className="clay flex-1 min-w-[120px] px-2 py-2 text-sm font-bold text-stone-700 bg-transparent outline-none">
              <option value="">From…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
            <span className="self-center text-stone-400">→</span>
            <select value={toId} onChange={e => setToId(e.target.value)}
              className="clay flex-1 min-w-[120px] px-2 py-2 text-sm font-bold text-stone-700 bg-transparent outline-none">
              <option value="">To…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <span className="text-stone-500 font-black self-center">₹</span>
            <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Amount" className="flex-1 bg-transparent outline-none font-bold text-stone-700 text-sm" />
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
            className="clay px-3 py-2 text-sm font-semibold text-stone-700 bg-transparent outline-none" />
          {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
          <button type="submit" className="clay-btn py-2.5 bg-violet-500 text-white font-black text-sm rounded-[12px]">Transfer</button>
        </form>
      )}
    </div>
  );
}
