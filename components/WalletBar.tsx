'use client';
import { useState, useEffect, useRef } from 'react';
import { Transaction, Wallet } from '@/lib/types';
import { getWallets, addWallet, deleteWallet, updateWallet, reorderWallet, moveWalletToIndex } from '@/lib/wallets';
import EmojiPicker from './EmojiPicker';

function txWalletId(t: Transaction): string {
  return t.walletId ?? (t.paymentMode === 'gpay' ? (t.bank === 'yes_bank' ? 'gpay_yes' : 'gpay_hdfc') : 'cash');
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

const DEFAULT_IDS = ['gpay_hdfc', 'gpay_yes', 'cash'];

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
  const [nameDraft, setNameDraft] = useState('');
  const [emojiDraft, setEmojiDraft] = useState('');
  const [balanceDraft, setBalanceDraft] = useState('');
  const [minBalanceDraft, setMinBalanceDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setWallets(getWallets()); }, [transactions]);

  const editingWallet = wallets.find(w => w.id === editingId) ?? null;

  function reload() { setWallets(getWallets()); }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addWallet({ name, emoji: newEmoji });
    reload();
    setNewName(''); setNewEmoji('💳'); setShowAdd(false);
  }

  function handleDelete(id: string) {
    deleteWallet(id);
    reload();
    if (editingId === id) setEditingId(null);
  }

  function openEdit(w: Wallet) {
    setEditingId(editingId === w.id ? null : w.id);
    setNameDraft(w.name);
    setEmojiDraft(w.emoji);
    setBalanceDraft(w.openingBalance != null ? String(w.openingBalance) : '');
    setMinBalanceDraft(w.minBalance != null ? String(w.minBalance) : '');
  }

  function saveEdit(id: string) {
    const name = nameDraft.trim();
    if (!name) return;
    const val = parseFloat(balanceDraft);
    const minVal = parseFloat(minBalanceDraft);
    updateWallet(id, {
      name,
      emoji: emojiDraft || '💳',
      openingBalance: isNaN(val) ? undefined : val,
      minBalance: isNaN(minVal) || minVal <= 0 ? undefined : minVal,
    });
    reload();
    setEditingId(null);
  }

  function handleDragStart(id: string) {
    setDragId(id);
  }

  function handleDragEnd() {
    setDragId(null);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = wallets.map(w => w.id);
    moveWalletToIndex(dragId, ids.indexOf(targetId));
    reload();
    setDragId(null);
  }

  const balances = wallets.map(w => {
    const txNet = transactions
      .filter(t => txWalletId(t) === w.id)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    return { ...w, net: (w.openingBalance ?? 0) + txNet };
  });

  const isFiltering = selectedWallet !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <span className="text-xs font-black text-stone-400 uppercase tracking-wider">💰 Wallets</span>
          <span className="text-[10px] font-semibold text-stone-400">Hold ⋮⋮ and drag to reorder</span>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="clay-btn text-xs font-bold text-violet-600 px-2.5 py-2 rounded-[10px] bg-white/70 border border-violet-200 min-h-[44px]">
          + Add wallet
        </button>
      </div>

      {isFiltering && (
        <button onClick={() => onSelectWallet(selectedWallet!)}
          className="text-xs font-bold text-violet-600 px-2 py-1 rounded-full bg-violet-100 border border-violet-200 self-start">
          ✕ Clear wallet filter
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {balances.map((w, index) => (
          <div
            key={w.id}
            draggable
            onDragStart={() => handleDragStart(w.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(w.id)}
            className={`flex-shrink-0 min-w-[128px] snap-start transition-opacity ${dragId === w.id ? 'opacity-50' : ''}`}>
            <div
              className={`clay flex flex-col gap-1 p-3 w-full transition-all ${
                selectedWallet === w.id ? 'clay-purple ring-2 ring-violet-400' : ''
              } ${editingId === w.id ? 'ring-2 ring-violet-300' : ''}`}>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onTouchStart={() => handleDragStart(w.id)}
                  onTouchEnd={handleDragEnd}
                  className="clay-btn text-stone-300 text-xs px-0.5 leading-none cursor-grab active:cursor-grabbing touch-none"
                  aria-label={`Drag to reorder ${w.name}`}
                  title="Drag to reorder">
                  ⋮⋮
                </button>
                <button type="button" onClick={() => onSelectWallet(w.id)}
                  className="clay-btn text-xl leading-none flex-1 text-center" aria-label={`Filter by ${w.name}`}>
                  {w.emoji}
                </button>
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => { reorderWallet(w.id, 'left'); reload(); }} disabled={index === 0}
                    className="clay-btn text-stone-300 text-[10px] px-0.5 disabled:opacity-30" aria-label="Move left">◀</button>
                  <button type="button" onClick={() => openEdit(w)}
                    className="clay-btn text-stone-300 hover:text-violet-500 text-xs px-0.5">✏️</button>
                  {!DEFAULT_IDS.includes(w.id) && (
                    <button type="button" onClick={() => handleDelete(w.id)}
                      className="clay-btn text-stone-300 hover:text-rose-400 text-xs px-0.5">✕</button>
                  )}
                  <button type="button" onClick={() => { reorderWallet(w.id, 'right'); reload(); }} disabled={index === balances.length - 1}
                    className="clay-btn text-stone-300 text-[10px] px-0.5 disabled:opacity-30" aria-label="Move right">▶</button>
                </div>
              </div>
              <button type="button" onClick={() => onSelectWallet(w.id)} className="clay-btn text-left w-full">
                <p className="text-xs font-black text-stone-600 truncate">{w.name}</p>
                <p className={`text-sm font-black ${w.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {w.net >= 0 ? '+' : '-'}{fmt(Math.abs(w.net))}
                </p>
                {w.openingBalance != null && (
                  <p className="text-[10px] text-stone-400 font-semibold">Opening: {fmt(w.openingBalance)}</p>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingWallet && (
        <div className="clay animate-pop-in p-3 flex flex-col gap-2">
          <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Edit {editingWallet.name}</p>
          <div className="flex gap-2 items-center">
            <EmojiPicker value={emojiDraft} onChange={setEmojiDraft} label="Wallet icon" />
            <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Wallet name"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Alert below ₹</span>
            <input type="text" inputMode="numeric" value={minBalanceDraft}
              onChange={e => setMinBalanceDraft(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="Low balance alert"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-stone-400 font-bold">₹</span>
            <input type="text" inputMode="numeric" value={balanceDraft}
              onChange={e => setBalanceDraft(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && saveEdit(editingWallet.id)}
              placeholder="Opening balance"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
            <button type="button" onClick={() => saveEdit(editingWallet.id)} disabled={!nameDraft.trim()}
              className="clay-btn bg-violet-500 text-white font-black text-sm px-4 py-2.5 rounded-[10px] disabled:opacity-40 min-h-[44px]">
              Save ✓
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="clay animate-pop-in p-3 flex flex-col gap-2">
          <p className="text-xs font-black text-stone-500 uppercase tracking-wide">New Wallet</p>
          <div className="flex gap-2 items-center">
            <EmojiPicker value={newEmoji} onChange={setNewEmoji} label="Wallet icon" />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Credit Card"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)}
              className="clay-btn flex-1 py-2.5 font-bold text-stone-500 rounded-[10px] bg-stone-100 min-h-[44px]">Cancel</button>
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="clay-btn flex-1 py-2.5 bg-violet-500 text-white font-black rounded-[10px] disabled:opacity-40 min-h-[44px]">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
