'use client';
import { useState } from 'react';
import { Transaction, TxType, PaymentMode, Bank } from '@/lib/types';

interface Props {
  initial?: Transaction;
  onSave: (txn: Transaction) => void;
  onCancel?: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ initial, onSave, onCancel }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initial?.paymentMode ?? 'gpay');
  const [bank, setBank] = useState<Bank>(initial?.bank ?? 'hdfc');
  const [date, setDate] = useState(initial?.date ?? today());
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError('Please enter a valid amount'); return; }
    setError('');
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      type, amount: amt, description: description.trim(),
      paymentMode, bank: paymentMode === 'gpay' ? bank : undefined,
      date, createdAt: initial?.createdAt ?? Date.now(),
    });
  }

  const isEdit = !!initial;
  const submitLabel = isEdit ? 'Save Changes ✅' : type === 'income' ? 'Add Income 💚' : 'Add Expense ❤️';

  return (
    <form onSubmit={handleSubmit} className="clay p-5 flex flex-col gap-4">
      <h2 className="text-lg font-black text-stone-700 text-center">
        {isEdit ? '✏️ Edit Entry' : '➕ New Entry'}
      </h2>

      {/* Type toggle */}
      <div className="flex gap-2">
        {(['income', 'expense'] as TxType[]).map(t => (
          <button key={t} type="button"
            onClick={() => setType(t)}
            className={`clay-btn flex-1 py-3 rounded-[14px] font-black text-base transition-all ${
              type === t
                ? t === 'income' ? 'clay-green text-emerald-900' : 'clay-red text-red-900'
                : 'bg-stone-100 text-stone-400 shadow-none border border-stone-200'
            }`}>
            {t === 'income' ? '💚 Income' : '❤️ Expense'}
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

      {/* Description */}
      <textarea
        value={description} onChange={e => setDescription(e.target.value)}
        placeholder="What was this for? (optional) 📝"
        rows={2}
        className="clay w-full px-4 py-3 text-base font-semibold text-stone-700 bg-transparent outline-none resize-none placeholder:text-stone-400"
      />

      {/* Payment mode */}
      <div className="flex gap-2">
        {(['gpay', 'cash'] as PaymentMode[]).map(m => (
          <button key={m} type="button"
            onClick={() => setPaymentMode(m)}
            className={`clay-btn flex-1 py-3 rounded-[14px] font-bold text-base transition-all ${
              paymentMode === m
                ? m === 'gpay' ? 'clay-blue text-blue-900' : 'clay-yellow text-yellow-900'
                : 'bg-stone-100 text-stone-400 shadow-none border border-stone-200'
            }`}>
            {m === 'gpay' ? '📱 GPay' : '💵 Cash'}
          </button>
        ))}
      </div>

      {/* Bank (GPay only) */}
      {paymentMode === 'gpay' && (
        <div className="flex gap-2">
          {([['yes_bank', '🏦 Yes Bank'], ['hdfc', '🏦 HDFC']] as [Bank, string][]).map(([b, label]) => (
            <button key={b} type="button"
              onClick={() => setBank(b)}
              className={`clay-btn flex-1 py-2.5 rounded-[14px] font-bold text-sm transition-all ${
                bank === b ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-400 shadow-none border border-stone-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Date */}
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="clay w-full px-4 py-3 text-base font-semibold text-stone-700 bg-transparent outline-none"
      />

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
            type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'
          }`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
