'use client';
import { useState, useEffect } from 'react';
import { Transaction, Wallet } from '@/lib/types';
import { getWallets, addWallet, deleteWallet, saveWallets, legacyWalletId } from '@/lib/wallets';

function txWalletId(t: Transaction): string {
  return t.walletId ?? legacyWalletId(t.paymentMode, t.bank);
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

export default function WalletBar({ transactions, selectedWallet, onSelectWallet }: {
  transactions: Transaction[];
  selectedWallet: string | null;
  onSelectWallet: (id: string) => void;
}) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💳');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');

  useEffect(() => { setWallets(getWallets()); }, [transactions]);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addWallet({ name, emoji: newEmoji });
    setWallets(getWallets());
    setNewName(''); setNewEmoji('💳'); setShowAdd(false);
  }

  function handleDelete(id: string) {
    deleteWallet(id);
    setWallets(getWallets());
  }

  function openEdit(e: React.MouseEvent, w: Wallet) {
    e.stopPropagation();
    setEditingId(editingId === w.id ? null : w.id);
    setBalanceDraft(w.openingBalance != null ? String(w.openingBalance) : '');
  }

  function saveBalance(id: string) {
    const val = parseFloat(balanceDraft);
    const updated = wallets.map(w =>
      w.id === id ? { ...w, openingBalance: isNaN(val) ? undefined : val } : w
    );
    saveWallets(updated);
    setWallets(updated);
    setEditingId(null);
  }

  const DEFAULT_IDS = ['gpay_hdfc', 'gpay_yes', 'cash'];

  const balances = wallets.map(w => {
    const txNet = transactions
      .filter(t => txWalletId(t) === w.id)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const net = (w.openingBalance ?? 0) + txNet;
    return { ...w, net };
  });

  const isFiltering = selectedWallet !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-stone-400 uppercase tracking-wider">💰 Wallets</span>
          {isFiltering && (
            <button onClick={() => onSelectWallet(selectedWallet!)}
              className="text-xs font-bold text-violet-600 px-2 py-0.5 rounded-full bg-violet-100 border border-violet-200">
              ✕ Clear filter
            </button>
          )}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="clay-btn text-xs font-bold text-violet-600 px-2.5 py-1 rounded-[10px] bg-white/70 border border-violet-200">
          + Add wallet
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {balances.map(w => (
          <div key={w.id} className="flex flex-col gap-1.5 flex-shrink-0 min-w-[120px]">
            {/* Card — tap to filter */}
            <button
              onClick={() => onSelectWallet(w.id)}
              className={`clay clay-btn flex flex-col gap-1 p-3 w-full text-left transition-all ${
                selectedWallet === w.id ? 'clay-purple ring-2 ring-violet-400' : ''
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-xl">{w.emoji}</span>
                <div className="flex items-center gap-1">
                  {/* Pencil = edit opening balance */}
                  <button
                    onClick={e => openEdit(e, w)}
                    className="clay-btn text-stone-300 hover:text-violet-500 text-xs px-1 leading-none transition-colors">
                    ✏️
                  </button>
                  {!DEFAULT_IDS.includes(w.id) && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(w.id); }}
                      className="clay-btn text-stone-300 hover:text-rose-400 text-xs px-1 leading-none transition-colors">
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs font-black text-stone-600 truncate max-w-[100px]">{w.name}</p>
              <p className={`text-sm font-black ${w.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {w.net >= 0 ? '+' : '-'}{fmt(Math.abs(w.net))}
              </p>
              {w.openingBalance != null && (
                <p className="text-[10px] text-stone-400 font-semibold">Opening: {fmt(w.openingBalance)}</p>
              )}
            </button>

            {/* Opening balance input */}
            {editingId === w.id && (
              <div className="clay animate-pop-in p-2 flex gap-1.5">
                <span className="text-xs text-stone-400 font-bold self-center">₹</span>
                <input
                  autoFocus
                  type="number" inputMode="numeric"
                  value={balanceDraft}
                  onChange={e => setBalanceDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveBalance(w.id)}
                  placeholder="Opening balance"
                  className="flex-1 bg-transparent outline-none text-xs font-bold text-stone-700 placeholder:text-stone-400 min-w-0"
                />
                <button onClick={() => saveBalance(w.id)}
                  className="clay-btn bg-violet-500 text-white font-black text-xs px-2 py-1 rounded-[8px]">✓</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="clay animate-pop-in p-3 flex flex-col gap-2">
          <p className="text-xs font-black text-stone-500 uppercase tracking-wide">New Wallet</p>
          <div className="flex gap-2">
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
              className="clay w-12 text-center text-xl bg-transparent outline-none" maxLength={2} />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Credit Card"
              autoFocus
              className="clay flex-1 px-3 py-2 text-sm font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)}
              className="clay-btn flex-1 py-2 font-bold text-stone-500 text-sm rounded-[10px] bg-stone-100">Cancel</button>
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="clay-btn flex-1 py-2 bg-violet-500 text-white font-black text-sm rounded-[10px] disabled:opacity-40">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
