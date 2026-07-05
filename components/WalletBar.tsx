'use client';
import { useState, useEffect, useRef } from 'react';
import { Transaction, Wallet } from '@/lib/types';
import { getWallets, addWallet, deleteWallet, updateWallet, reorderWallet, moveWalletToIndex } from '@/lib/wallets';
import { getCreditCardsEnabled } from '@/lib/settings';
import { executeCCPayment } from '@/lib/transfers';
import EmojiPicker from './EmojiPicker';

function txWalletId(t: Transaction): string {
  return t.walletId ?? (t.paymentMode === 'gpay' ? (t.bank === 'yes_bank' ? 'gpay_yes' : 'gpay_hdfc') : 'cash');
}

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }

const DEFAULT_IDS = ['gpay_hdfc', 'gpay_yes', 'cash'];

export default function WalletBar({ transactions, selectedWallet, onSelectWallet, onChange }: {
  transactions: Transaction[];
  selectedWallet: string | null;
  onSelectWallet: (id: string) => void;
  onChange?: () => void;
}) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [creditCardsOn, setCreditCardsOn] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💳');
  const [newIsCreditCard, setNewIsCreditCard] = useState(false);
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [emojiDraft, setEmojiDraft] = useState('');
  const [balanceDraft, setBalanceDraft] = useState('');
  const [minBalanceDraft, setMinBalanceDraft] = useState('');
  const [ccEditDraft, setCcEditDraft] = useState(false);
  const [creditLimitDraft, setCreditLimitDraft] = useState('');
  const [statementDayDraft, setStatementDayDraft] = useState('');
  const [dueDayDraft, setDueDayDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  // CC pay bill
  const [showPayBill, setShowPayBill] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payFromWallet, setPayFromWallet] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWallets(getWallets());
    setCreditCardsOn(getCreditCardsEnabled());
  }, [transactions]);

  const editingWallet = wallets.find(w => w.id === editingId) ?? null;

  function reload() { setWallets(getWallets()); }

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const limit = parseInt(newCreditLimit, 10);
    addWallet({
      name,
      emoji: newEmoji,
      isCreditCard: newIsCreditCard || undefined,
      creditLimit: newIsCreditCard && !isNaN(limit) && limit > 0 ? limit : undefined,
    });
    reload();
    setNewName(''); setNewEmoji('💳'); setShowAdd(false);
    setNewIsCreditCard(false); setNewCreditLimit('');
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
    setCcEditDraft(w.isCreditCard ?? false);
    setCreditLimitDraft(w.creditLimit != null ? String(w.creditLimit) : '');
    setStatementDayDraft(w.statementDay != null ? String(w.statementDay) : '');
    setDueDayDraft(w.dueDay != null ? String(w.dueDay) : '');
    // For CC, openingBalance stored as negative (existing debt); display as positive outstanding
    if (w.isCreditCard) {
      setBalanceDraft(w.openingBalance != null && w.openingBalance < 0 ? String(-w.openingBalance) : '');
    } else {
      setBalanceDraft(w.openingBalance != null ? String(w.openingBalance) : '');
    }
    setMinBalanceDraft(w.minBalance != null ? String(w.minBalance) : '');
  }

  function saveEdit(id: string) {
    const name = nameDraft.trim();
    if (!name) return;
    const val = parseFloat(balanceDraft);
    const minVal = parseFloat(minBalanceDraft);
    const limitVal = parseInt(creditLimitDraft, 10);
    const clampDay = (s: string) => {
      const n = parseInt(s, 10);
      return !isNaN(n) && n >= 1 && n <= 31 ? n : undefined;
    };
    updateWallet(id, {
      name,
      emoji: emojiDraft || '💳',
      // For CC: store existing outstanding as negative openingBalance
      openingBalance: ccEditDraft
        ? (!isNaN(val) && val > 0 ? -val : undefined)
        : (isNaN(val) ? undefined : val),
      minBalance: isNaN(minVal) || minVal <= 0 ? undefined : minVal,
      isCreditCard: ccEditDraft || undefined,
      creditLimit: ccEditDraft && !isNaN(limitVal) && limitVal > 0 ? limitVal : undefined,
      statementDay: ccEditDraft ? clampDay(statementDayDraft) : undefined,
      dueDay: ccEditDraft ? clampDay(dueDayDraft) : undefined,
    });
    reload();
    setEditingId(null);
  }

  function handleDragStart(id: string) { setDragId(id); }
  function handleDragEnd() { setDragId(null); }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = wallets.map(w => w.id);
    moveWalletToIndex(dragId, ids.indexOf(targetId));
    reload();
    setDragId(null);
  }

  function openPayBill(ccWalletId: string) {
    const firstBank = wallets.find(w => !w.isCreditCard);
    setShowPayBill(ccWalletId);
    setPayAmount('');
    setPayFromWallet(firstBank?.id ?? '');
  }

  function handlePayBill() {
    const amt = parseInt(payAmount, 10);
    if (!amt || !payFromWallet || !showPayBill) return;
    const today = new Date().toISOString().slice(0, 10);
    executeCCPayment(showPayBill, payFromWallet, amt, today);
    setShowPayBill(null);
    setPayAmount('');
    onChange?.();
  }

  const balances = wallets.map(w => {
    const txNet = transactions
      .filter(t => txWalletId(t) === w.id)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    return { ...w, net: (w.openingBalance ?? 0) + txNet };
  });

  const isFiltering = selectedWallet !== null;
  const payBillCC = balances.find(w => w.id === showPayBill);
  const bankWallets = balances.filter(w => !w.isCreditCard);

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
        {balances.map((w, index) => {
          const outstanding = Math.max(0, -w.net);
          const usagePct = w.creditLimit ? (outstanding / w.creditLimit) * 100 : 0;
          const barColor = usagePct > 90 ? 'bg-rose-400' : usagePct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
          return (
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
                  {w.isCreditCard ? (
                    <>
                      <p className="text-sm font-black text-rose-500">{fmt(outstanding)} owed</p>
                      {w.creditLimit ? (
                        <>
                          <div className="w-full h-1.5 bg-stone-200 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${Math.min(100, usagePct)}%` }} />
                          </div>
                          <p className="text-[10px] text-stone-400 font-semibold">
                            {fmt(Math.max(0, w.creditLimit - outstanding))} left of {fmt(w.creditLimit)}
                          </p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className={`text-sm font-black ${w.net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {w.net >= 0 ? '+' : '-'}{fmt(Math.abs(w.net))}
                      </p>
                      {w.openingBalance != null && (
                        <p className={`text-[10px] font-semibold ${selectedWallet === w.id ? 'text-violet-700' : 'text-stone-400'}`}>Opening: {fmt(w.openingBalance)}</p>
                      )}
                    </>
                  )}
                </button>
                {w.isCreditCard && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); openPayBill(w.id); }}
                    className="clay-btn w-full text-xs font-bold text-emerald-700 py-1.5 rounded-[8px] bg-emerald-50 border border-emerald-200 mt-0.5">
                    💳 Pay Bill
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingWallet && (
        <div className="clay animate-pop-in p-3 flex flex-col gap-2">
          <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Edit {editingWallet.name}</p>
          <div className="flex gap-2 items-center">
            <EmojiPicker value={emojiDraft} onChange={setEmojiDraft} label="Wallet icon" />
            <input type="text" value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Wallet name"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
          </div>
          {!ccEditDraft && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Alert below ₹</span>
              <input type="text" inputMode="numeric" value={minBalanceDraft}
                onChange={e => setMinBalanceDraft(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="Low balance alert"
                className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
            </div>
          )}
          {ccEditDraft && (
            <>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Limit ₹</span>
                <input type="text" inputMode="numeric" value={creditLimitDraft}
                  onChange={e => setCreditLimitDraft(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Credit limit"
                  className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Statement day</span>
                <input type="text" inputMode="numeric" value={statementDayDraft}
                  onChange={e => setStatementDayDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="e.g. 15"
                  className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Due day</span>
                <input type="text" inputMode="numeric" value={dueDayDraft}
                  onChange={e => setDueDayDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder="e.g. 31"
                  className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-w-0" />
              </div>
            </>
          )}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-stone-400 font-bold whitespace-nowrap">
              {ccEditDraft ? 'Outstanding ₹' : '₹'}
            </span>
            <input type="text" inputMode="numeric" value={balanceDraft}
              onChange={e => setBalanceDraft(e.target.value.replace(/[^\d.]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && saveEdit(editingWallet.id)}
              placeholder={ccEditDraft ? 'Existing balance owed' : 'Opening balance'}
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
              placeholder="e.g. HDFC Credit Card"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none" />
          </div>
          {creditCardsOn && (
            <label className="flex items-center gap-2 px-1 cursor-pointer">
              <input type="checkbox" checked={newIsCreditCard} onChange={e => setNewIsCreditCard(e.target.checked)}
                className="w-4 h-4 accent-violet-500" />
              <span className="text-xs font-bold text-stone-600">💳 This is a credit card</span>
            </label>
          )}
          {newIsCreditCard && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-stone-400 font-bold whitespace-nowrap">Limit ₹</span>
              <input type="text" inputMode="numeric" value={newCreditLimit}
                onChange={e => setNewCreditLimit(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Credit limit (optional)"
                className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setNewIsCreditCard(false); setNewCreditLimit(''); }}
              className="clay-btn flex-1 py-2.5 font-bold text-stone-500 rounded-[10px] bg-stone-100 min-h-[44px]">Cancel</button>
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="clay-btn flex-1 py-2.5 bg-violet-500 text-white font-black rounded-[10px] disabled:opacity-40 min-h-[44px]">Add</button>
          </div>
        </div>
      )}

      {showPayBill && payBillCC && (
        <div className="clay animate-pop-in p-3 flex flex-col gap-2">
          <p className="text-xs font-black text-stone-500 uppercase tracking-wide">💳 Pay {payBillCC.name} Bill</p>
          <div className="flex gap-2 items-center">
            <span className="text-stone-400 font-black">₹</span>
            <input type="text" inputMode="numeric" value={payAmount}
              onChange={e => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="Amount to pay"
              className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none" />
          </div>
          <select value={payFromWallet} onChange={e => setPayFromWallet(e.target.value)}
            className="clay w-full px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none min-h-[44px]">
            <option value="">From wallet...</option>
            {bankWallets.map(w => (
              <option key={w.id} value={w.id}>{w.emoji} {w.name} ({w.net >= 0 ? '+' : ''}{fmt(w.net)})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowPayBill(null)}
              className="clay-btn flex-1 py-2.5 font-bold text-stone-500 rounded-[10px] bg-stone-100 min-h-[44px]">Cancel</button>
            <button onClick={handlePayBill} disabled={!payAmount || !payFromWallet}
              className="clay-btn flex-1 py-2.5 bg-emerald-500 text-white font-black rounded-[10px] disabled:opacity-40 min-h-[44px]">
              Pay ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
