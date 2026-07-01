'use client';
import { useState, useEffect } from 'react';
import { Transaction, TxType, Frequency, Wallet, Category } from '@/lib/types';
import { getWallets, addWallet, legacyWalletId, walletToPaymentMode } from '@/lib/wallets';
import { getCategories } from '@/lib/categories';
import { addRule } from '@/lib/recurring';

interface Props {
  initial?: Transaction;
  onSave: (txn: Transaction) => void;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const FREQ_LABELS: Record<Frequency, string> = {
  daily: '📅 Daily',
  weekly: '📆 Weekly',
  monthly: '🗓️ Monthly',
};

export default function TransactionForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [error, setError] = useState('');

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<string>('');
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletEmoji, setNewWalletEmoji] = useState('💳');

  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    const ws = getWallets();
    setWallets(ws);
    setCategories(getCategories());
    const defaultId = initial?.walletId ?? legacyWalletId(initial?.paymentMode ?? 'gpay', initial?.bank);
    setWalletId(defaultId);
    setCategoryId(initial?.categoryId ?? '');
  }, [initial?.walletId, initial?.paymentMode, initial?.bank, initial?.categoryId]);

  useEffect(() => {
    if (type === 'investment') setCategoryId('');
  }, [type]);

  function handleAddWallet() {
    const name = newWalletName.trim();
    if (!name) return;
    const w = addWallet({ name, emoji: newWalletEmoji });
    const ws = getWallets();
    setWallets(ws);
    setWalletId(w.id);
    setNewWalletName('');
    setNewWalletEmoji('💳');
    setShowAddWallet(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError('Please enter a valid amount'); return; }
    if (!walletId) { setError('Please select a wallet'); return; }
    setError('');

    const pm = walletToPaymentMode(walletId);
    const txn: Transaction = {
      id: initial?.id ?? crypto.randomUUID(),
      type, amount: amt,
      description: description.trim(),
      walletId,
      paymentMode: pm.paymentMode,
      bank: pm.bank,
      categoryId: (type === 'income' || type === 'expense') && categoryId ? categoryId : undefined,
      date,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onSave(txn);

    // Save recurring rule — nextDue is the first occurrence AFTER this one
    if (recurring && !initial) {
      const nextDue = (() => {
        const d = new Date(date);
        if (frequency === 'daily') d.setDate(d.getDate() + 1);
        else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })();
      addRule({
        id: crypto.randomUUID(),
        type,
        amount: amt,
        description: description.trim(),
        walletId,
        categoryId: (type === 'income' || type === 'expense') && categoryId ? categoryId : undefined,
        frequency,
        nextDue,
      });
    }
  }

  const isEdit = !!initial;
  const submitLabel = isEdit
    ? 'Save Changes ✅'
    : type === 'income'
      ? 'Add Income 💚'
      : type === 'investment'
        ? 'Add Investment 📈'
        : 'Add Expense ❤️';

  return (
    <form onSubmit={handleSubmit} className="clay p-5 flex flex-col gap-4">
      <h2 className="text-lg font-black text-stone-700 text-center">
        {isEdit ? '✏️ Edit Entry' : '➕ New Entry'}
      </h2>

      {/* Type toggle */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { t: 'income' as TxType, label: '💚 Income', active: 'clay-green text-emerald-900' },
          { t: 'expense' as TxType, label: '❤️ Expense', active: 'clay-red text-red-900' },
          { t: 'investment' as TxType, label: '📈 Invest', active: 'clay-blue text-blue-900' },
        ]).map(({ t, label, active }) => (
          <button key={t} type="button"
            onClick={() => setType(t)}
            className={`clay-btn py-3 rounded-[14px] font-black text-sm transition-all ${
              type === t ? active : 'bg-stone-100 text-stone-400 shadow-none border border-stone-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-stone-400">₹</span>
        <input
          type="number" inputMode="numeric" min="1" value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          className="clay w-full pl-10 pr-4 py-4 text-2xl font-black text-stone-800 bg-transparent outline-none placeholder:text-stone-300"
        />
      </div>

      {/* Quick amount chips */}
      <div className="flex gap-2 flex-wrap">
        {[100, 500, 1000, 2000].map(v => (
          <button key={v} type="button"
            onClick={() => setAmount(String(v))}
            className={`clay-btn px-3 py-1.5 rounded-[10px] font-bold text-sm transition-all ${
              amount === String(v) ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
            }`}>
            ₹{v}
          </button>
        ))}
      </div>

      {/* Description */}
      <textarea
        value={description} onChange={e => setDescription(e.target.value)}
        placeholder="What was this for? (optional) 📝"
        rows={2}
        className="clay w-full px-4 py-3 text-base font-semibold text-stone-700 bg-transparent outline-none resize-none placeholder:text-stone-400"
      />

      {/* Wallet picker */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-black text-stone-400 uppercase tracking-wider">Wallet</span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {wallets.map(w => (
            <button key={w.id} type="button"
              onClick={() => setWalletId(w.id)}
              className={`clay-btn flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[12px] font-bold text-sm transition-all ${
                walletId === w.id ? 'clay-blue text-blue-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
              }`}>
              <span>{w.emoji}</span>
              <span className="whitespace-nowrap">{w.name}</span>
            </button>
          ))}
          <button type="button"
            onClick={() => setShowAddWallet(v => !v)}
            className="clay-btn flex-shrink-0 px-3 py-2 rounded-[12px] font-bold text-sm text-violet-600 bg-white/70 border border-violet-200 whitespace-nowrap">
            + New
          </button>
        </div>
        {showAddWallet && (
          <div className="clay animate-pop-in p-3 flex gap-2">
            <input value={newWalletEmoji} onChange={e => setNewWalletEmoji(e.target.value)}
              className="clay w-12 text-center text-lg bg-transparent outline-none" maxLength={2} />
            <input value={newWalletName} onChange={e => setNewWalletName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWallet()}
              placeholder="Wallet name"
              className="clay flex-1 px-3 py-1.5 text-sm font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400" />
            <button type="button" onClick={handleAddWallet} disabled={!newWalletName.trim()}
              className="clay-btn bg-violet-500 text-white font-black text-xs px-3 rounded-[10px] disabled:opacity-40">
              Add
            </button>
          </div>
        )}
      </div>

      {(type === 'income' || type === 'expense') && categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black text-stone-400 uppercase tracking-wider">Category (optional)</span>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`clay-btn px-3 py-2 rounded-[12px] font-bold text-sm transition-all ${
                !categoryId ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
              }`}>
              None
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`clay-btn px-3 py-2 rounded-[12px] font-bold text-sm transition-all ${
                  categoryId === c.id ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                }`}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="clay w-full px-4 py-3 text-base font-semibold text-stone-700 bg-transparent outline-none"
      />

      {/* Recurring toggle (new entries only) */}
      {!isEdit && (
        <div className="flex flex-col gap-2">
          <button type="button"
            onClick={() => setRecurring(v => !v)}
            className={`clay-btn flex items-center justify-between px-4 py-3 rounded-[14px] font-bold text-sm transition-all ${
              recurring ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
            }`}>
            <span>🔄 Make this recurring</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-black ${recurring ? 'bg-violet-200 text-violet-800' : 'bg-stone-200 text-stone-400'}`}>
              {recurring ? 'ON' : 'OFF'}
            </span>
          </button>
          {recurring && (
            <div className="flex gap-2 animate-pop-in">
              {(['daily', 'weekly', 'monthly'] as Frequency[]).map(f => (
                <button key={f} type="button"
                  onClick={() => setFrequency(f)}
                  className={`clay-btn flex-1 py-2 rounded-[12px] font-bold text-xs transition-all ${
                    frequency === f ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-400 border border-stone-200 shadow-none'
                  }`}>
                  {FREQ_LABELS[f]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 font-bold text-sm text-center">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="clay clay-btn flex-1 py-3 font-bold text-stone-500 text-base">
            Cancel
          </button>
        )}
        <button type="submit"
          className={`clay-btn flex-1 py-3 rounded-[16px] font-black text-white text-base shadow-lg ${
            type === 'income' ? 'bg-emerald-400' : type === 'investment' ? 'bg-blue-400' : 'bg-rose-400'
          }`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
