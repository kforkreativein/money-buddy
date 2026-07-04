'use client';
import { useState, useEffect } from 'react';
import { SplitGroup, Wallet, Category } from '@/lib/types';
import {
  getSplitGroups, addSplitGroup, addSplitEntry, deleteSplitEntry,
  settleGroup, calcBalances, groupNetTotal, updateSplitGroup, deleteSplitGroup,
} from '@/lib/splits';
import { addTransaction } from '@/lib/storage';
import { getWallets } from '@/lib/wallets';
import { getCategories } from '@/lib/categories';

interface Props {
  onClose: () => void;
  onExpenseAdded: () => void;
  initialGroupId?: string;
}

type View = 'list' | 'detail' | 'new-group' | 'new-entry' | 'settle';

const fmt = (n: number) =>
  `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function SplitTab({ onClose, onExpenseAdded, initialGroupId }: Props) {
  const [view, setView] = useState<View>(initialGroupId ? 'detail' : 'list');
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialGroupId ?? null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // new-group form
  const [groupName, setGroupName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [membersList, setMembersList] = useState<string[]>([]);

  // edit-members inline
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [addMemberInput, setAddMemberInput] = useState('');

  // rename group
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // new-entry form
  const [entryDesc, setEntryDesc] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryPaidBy, setEntryPaidBy] = useState('me');
  const [entrySplitAmong, setEntrySplitAmong] = useState<string[]>([]);
  const [entryDate, setEntryDate] = useState(today());
  const [entryWalletId, setEntryWalletId] = useState('');
  const [entryCategoryId, setEntryCategoryId] = useState('');

  // settle-debt form
  const [settlePerson, setSettlePerson] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  // 'receive' = they paid me back; 'pay' = I paid them
  const [settleDir, setSettleDir] = useState<'receive' | 'pay'>('receive');
  const [settleWalletId, setSettleWalletId] = useState('');
  const [settleDate, setSettleDate] = useState(today());

  const reload = () => setGroups(getSplitGroups());
  useEffect(() => {
    reload();
    const w = getWallets();
    setWallets(w);
    setEntryWalletId(w[0]?.id ?? '');
    setSettleWalletId(w[0]?.id ?? '');
    setCategories(getCategories());
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedId) ?? null;
  const activeGroups = groups.filter(g => !g.settled);
  const pastGroups = groups.filter(g => g.settled);

  function openGroup(id: string) {
    setSelectedId(id);
    setShowEditMembers(false);
    setView('detail');
  }

  function handleCreateGroup() {
    const name = groupName.trim();
    if (!name || membersList.length === 0) return;
    const g = addSplitGroup(name, membersList);
    reload();
    setGroupName('');
    setMembersList([]);
    setSelectedId(g.id);
    setView('detail');
  }

  function addMemberToNewGroup() {
    const m = memberInput.trim();
    if (!m || membersList.includes(m)) return;
    setMembersList(prev => [...prev, m]);
    setMemberInput('');
  }

  function addMemberToExistingGroup() {
    if (!selectedGroup) return;
    const m = addMemberInput.trim();
    if (!m || selectedGroup.members.includes(m)) return;
    updateSplitGroup(selectedGroup.id, { members: [...selectedGroup.members, m] });
    setAddMemberInput('');
    reload();
  }

  function removeMemberFromGroup(name: string) {
    if (!selectedGroup) return;
    updateSplitGroup(selectedGroup.id, { members: selectedGroup.members.filter(x => x !== name) });
    reload();
  }

  function togglePin(groupId: string, current: boolean) {
    updateSplitGroup(groupId, { pinned: !current });
    reload();
  }

  function saveRename() {
    if (!selectedGroup) return;
    const name = renameValue.trim();
    if (name && name !== selectedGroup.name) updateSplitGroup(selectedGroup.id, { name });
    setRenaming(false);
    reload();
  }

  function handleDeleteGroup(groupId: string) {
    if (!confirm('Delete this group? This cannot be undone.')) return;
    deleteSplitGroup(groupId);
    reload();
    setView('list');
  }

  function openNewEntry(group: SplitGroup) {
    setSelectedId(group.id);
    setEntrySplitAmong(['me', ...group.members]);
    setEntryPaidBy('me');
    setEntryDesc('');
    setEntryAmount('');
    setEntryDate(today());
    setEntryWalletId(wallets[0]?.id ?? '');
    setEntryCategoryId('');
    setView('new-entry');
  }

  function handleAddEntry() {
    const amount = Number(entryAmount);
    if (!entryDesc.trim() || !amount || !selectedId || entrySplitAmong.length === 0) return;
    const group = groups.find(g => g.id === selectedId);
    if (!group) return;

    let linkedTransactionId: string | undefined;
    if (entryPaidBy === 'me') {
      const txnId = crypto.randomUUID();
      // Record the FULL bill from my wallet — I actually paid this amount out
      addTransaction({
        id: txnId,
        type: 'expense',
        amount,
        description: `✂️ ${group.name}`,
        paymentMode: 'cash',
        walletId: entryWalletId || wallets[0]?.id,
        categoryId: entryCategoryId || undefined,
        date: entryDate,
        createdAt: Date.now(),
      });
      linkedTransactionId = txnId;
      onExpenseAdded();
    }

    addSplitEntry(selectedId, {
      description: entryDesc.trim(),
      totalAmount: amount,
      paidBy: entryPaidBy,
      splitAmong: entrySplitAmong,
      date: entryDate,
      linkedTransactionId,
    });
    reload();
    setView('detail');
  }

  function openSettle(person: string, balance: number) {
    setSettlePerson(person);
    setSettleAmount(String(Math.abs(balance)));
    // balance > 0: they owe me → default "they paid me"
    // balance < 0: I owe them → default "I paid them"
    setSettleDir(balance > 0 ? 'receive' : 'pay');
    setSettleWalletId(wallets[0]?.id ?? '');
    setSettleDate(today());
    setView('settle');
  }

  function handleConfirmSettle() {
    const amount = Number(settleAmount);
    if (!amount || !selectedId || !settlePerson) return;
    const group = groups.find(g => g.id === selectedId);
    if (!group) return;

    const txnId = crypto.randomUUID();

    if (settleDir === 'receive') {
      // They paid me → income to my wallet
      // Balance: their debt to me decreases
      // SplitEntry: paidBy = them, splitAmong = ['me']
      addTransaction({
        id: txnId,
        type: 'income',
        amount,
        description: `✂️ ${group.name}`,
        paymentMode: 'cash',
        walletId: settleWalletId || wallets[0]?.id,
        date: settleDate,
        createdAt: Date.now(),
      });
      addSplitEntry(selectedId, {
        description: `${settlePerson} paid you`,
        totalAmount: amount,
        paidBy: settlePerson,
        splitAmong: ['me'],
        date: settleDate,
        linkedTransactionId: txnId,
        isSettlement: true,
      });
    } else {
      // I paid them → expense from my wallet
      // Balance: my debt to them decreases
      // SplitEntry: paidBy = 'me', splitAmong = [them]
      addTransaction({
        id: txnId,
        type: 'expense',
        amount,
        description: `✂️ ${group.name}`,
        paymentMode: 'cash',
        walletId: settleWalletId || wallets[0]?.id,
        date: settleDate,
        createdAt: Date.now(),
      });
      addSplitEntry(selectedId, {
        description: `You paid ${settlePerson}`,
        totalAmount: amount,
        paidBy: 'me',
        splitAmong: [settlePerson],
        date: settleDate,
        linkedTransactionId: txnId,
        isSettlement: true,
      });
    }

    onExpenseAdded();
    reload();
    setView('detail');
  }

  function handleMarkSettled(groupId: string) {
    if (!confirm('Mark this group as settled? It will move to Past Groups.')) return;
    settleGroup(groupId);
    reload();
    setView('list');
  }

  function handleDeleteEntry(groupId: string, entryId: string) {
    deleteSplitEntry(groupId, entryId);
    reload();
  }

  function toggleSplitAmong(name: string) {
    setEntrySplitAmong(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  }

  function goBack() {
    if (view === 'settle' || view === 'new-entry') setView('detail');
    else { setShowEditMembers(false); setView('list'); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="clay animate-slide-up w-full max-w-sm max-h-[90dvh] overflow-y-auto flex flex-col gap-4 p-5 rounded-t-[24px] sm:rounded-[24px]"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-2">
          {view !== 'list' && (
            <button type="button" onClick={goBack}
              className="clay-btn w-10 h-10 rounded-[12px] text-stone-500 font-black flex items-center justify-center shrink-0">
              ←
            </button>
          )}
          <h2 className="text-xl font-black text-stone-800 flex-1 truncate">
            {view === 'list' && '✂️ Split Groups'}
            {view === 'detail' && (selectedGroup?.name ?? 'Group')}
            {view === 'new-group' && '➕ New Group'}
            {view === 'new-entry' && '➕ Add Expense'}
            {view === 'settle' && `💸 Settle with ${settlePerson}`}
          </h2>
          <button type="button" onClick={onClose}
            className="clay-btn w-10 h-10 rounded-[12px] text-stone-500 font-black shrink-0">✕</button>
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="flex flex-col gap-3">
            {activeGroups.length === 0 && pastGroups.length === 0 && (
              <p className="text-sm font-semibold text-stone-400 text-center py-8">
                No groups yet.<br />Create one to start splitting!
              </p>
            )}
            {activeGroups.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Active</p>
                {activeGroups.map(g => {
                  const net = groupNetTotal(g);
                  return (
                    <button key={g.id} type="button" onClick={() => openGroup(g.id)}
                      className="clay-btn clay p-3 flex items-center justify-between text-left w-full">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-stone-800 truncate">{g.name}</p>
                          {g.pinned && <span className="text-xs">📌</span>}
                        </div>
                        <p className="text-xs font-semibold text-stone-400 truncate">Me, {g.members.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {net === 0
                          ? <p className="text-xs font-black text-stone-400">All even</p>
                          : net > 0
                          ? <p className="text-xs font-black text-emerald-600">+{fmt(net)}</p>
                          : <p className="text-xs font-black text-rose-500">-{fmt(net)}</p>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {pastGroups.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Past Groups</p>
                {pastGroups.map(g => (
                  <button key={g.id} type="button" onClick={() => openGroup(g.id)}
                    className="clay-btn clay p-3 flex items-center justify-between text-left w-full opacity-60">
                    <div className="min-w-0">
                      <p className="font-black text-stone-800 truncate">{g.name}</p>
                      <p className="text-xs font-semibold text-stone-400 truncate">Me, {g.members.join(', ')}</p>
                    </div>
                    <p className="text-xs font-black text-stone-400 shrink-0 ml-2">✓ Settled</p>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setView('new-group')}
              className="clay-btn clay-purple clay py-3 font-black text-violet-900 text-center rounded-[14px]">
              ➕ New Group
            </button>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === 'detail' && selectedGroup && (() => {
          // Settled: show only net expense
          if (selectedGroup.settled) {
            const myNetExpense = selectedGroup.entries
              .filter(e => !e.isSettlement && e.splitAmong.includes('me'))
              .reduce((sum, e) => sum + e.totalAmount / e.splitAmong.length, 0);
            return (
              <div className="flex flex-col gap-3">
                <div className="clay-green clay p-4 rounded-[16px] flex flex-col items-center gap-1 text-center">
                  <span className="text-2xl">✓</span>
                  <p className="font-black text-emerald-800 text-base">Settled</p>
                  <p className="text-xs font-semibold text-emerald-700">Your net expense in this group</p>
                  <p className="font-black text-emerald-900 text-2xl">{fmt(myNetExpense)}</p>
                </div>
                <button type="button" onClick={() => handleDeleteGroup(selectedGroup.id)}
                  className="clay-btn clay-red clay py-3 font-black text-rose-900 text-center rounded-[14px]">
                  🗑️ Delete Group
                </button>
              </div>
            );
          }

          const balances = calcBalances(selectedGroup);
          const myTotalPaid = selectedGroup.entries
            .filter(e => !e.isSettlement && e.paidBy === 'me')
            .reduce((sum, e) => sum + e.totalAmount, 0);

          return (
            <div className="flex flex-col gap-3">
              {/* Rename */}
              <div className="clay p-3 flex flex-col gap-2">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Group name</p>
                {renaming ? (
                  <div className="flex gap-2">
                    <input autoFocus type="text" value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                      className="clay flex-1 px-3 py-2 font-bold text-stone-700 bg-transparent outline-none text-sm"
                    />
                    <button type="button" onClick={saveRename}
                      className="clay-btn clay-green clay px-3 py-2 font-black text-emerald-900 rounded-[10px] text-sm">Save</button>
                    <button type="button" onClick={() => setRenaming(false)}
                      className="clay-btn px-3 py-2 font-black text-stone-500 rounded-[10px] text-sm bg-stone-100 border border-stone-200">✕</button>
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => { setRenameValue(selectedGroup.name); setRenaming(true); }}
                    className="flex items-center justify-between w-full clay-btn px-3 py-2 rounded-[10px] bg-stone-50 border border-stone-200">
                    <span className="font-bold text-stone-700">{selectedGroup.name}</span>
                    <span className="text-xs text-stone-400">✏️ Rename</span>
                  </button>
                )}
              </div>

              {/* Pin toggle */}
              <button type="button"
                onClick={() => togglePin(selectedGroup.id, !!selectedGroup.pinned)}
                className={`clay-btn flex items-center justify-between px-4 py-2.5 rounded-[12px] font-bold text-sm ${
                  selectedGroup.pinned ? 'clay-amber text-amber-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                }`}>
                <span>📌 Pin to home screen</span>
                <span className="text-xs font-black">{selectedGroup.pinned ? 'PINNED' : 'OFF'}</span>
              </button>

              {/* You paid out stat */}
              {myTotalPaid > 0 && (
                <div className="clay p-3 flex items-center justify-between rounded-[12px]">
                  <span className="text-xs font-black text-stone-500 uppercase tracking-wide">You paid out (bills)</span>
                  <span className="font-black text-rose-600">-{fmt(myTotalPaid)}</span>
                </div>
              )}

              {/* Per-person balances with Settle button */}
              <div className="clay p-3 flex flex-col gap-2">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Who owes who</p>
                {selectedGroup.members.map(m => {
                  const b = balances[m] ?? 0;
                  return (
                    <div key={m} className="flex items-center justify-between py-0.5 gap-2">
                      <span className="font-bold text-stone-700 min-w-0 truncate">{m}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {b === 0
                          ? <span className="text-xs font-bold text-stone-400">All even ✓</span>
                          : b > 0
                          ? <span className="text-xs font-black text-emerald-600">owes you {fmt(b)}</span>
                          : <span className="text-xs font-black text-rose-500">you owe {fmt(b)}</span>
                        }
                        {b !== 0 && (
                          <button type="button" onClick={() => openSettle(m, b)}
                            className="clay-btn clay-blue text-blue-900 text-xs font-black px-2.5 py-1 rounded-[8px]">
                            💸 Settle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Edit members */}
              <div className="clay p-3 flex flex-col gap-2">
                <button type="button" onClick={() => setShowEditMembers(v => !v)}
                  className="flex items-center justify-between w-full">
                  <p className="text-xs font-black text-stone-500 uppercase tracking-wide">
                    Members — Me, {selectedGroup.members.join(', ')}
                  </p>
                  <span className="text-xs font-black text-stone-400">{showEditMembers ? '▲' : '✏️'}</span>
                </button>
                {showEditMembers && (
                  <div className="flex flex-col gap-2 pt-1">
                    <p className="text-[11px] font-semibold text-violet-600">
                      💡 "Me" is always included — you don't need to add yourself.
                    </p>
                    {selectedGroup.members.map(m => (
                      <div key={m} className="flex items-center justify-between clay px-3 py-2 rounded-[10px]">
                        <span className="font-bold text-stone-700">{m}</span>
                        <button type="button" onClick={() => removeMemberFromGroup(m)}
                          className="clay-btn text-rose-400 text-xs px-1.5 py-0.5 rounded-[6px]">Remove</button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input type="text" value={addMemberInput}
                        onChange={e => setAddMemberInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addMemberToExistingGroup()}
                        placeholder="Add member name"
                        className="clay flex-1 px-3 py-2 font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400 text-sm"
                      />
                      <button type="button" onClick={addMemberToExistingGroup}
                        disabled={!addMemberInput.trim()}
                        className="clay-btn clay-purple clay px-3 py-2 font-black text-violet-900 rounded-[10px] text-sm disabled:opacity-40">+</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Entries */}
              {selectedGroup.entries.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black text-stone-400 uppercase tracking-wider">History</p>
                  {[...selectedGroup.entries].reverse().map(e => (
                    <div key={e.id}
                      className={`clay p-3 flex flex-col gap-1 ${e.isSettlement ? 'border border-teal-100' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-black text-stone-800 text-sm">
                          {e.isSettlement ? '💸 ' : ''}{e.description}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`font-black text-sm ${e.isSettlement ? (e.paidBy === 'me' ? 'text-rose-500' : 'text-emerald-600') : 'text-stone-700'}`}>
                            {e.isSettlement && (e.paidBy === 'me' ? '-' : '+')}
                            {fmt(e.totalAmount)}
                          </span>
                          <button type="button" onClick={() => handleDeleteEntry(selectedGroup.id, e.id)}
                            className="clay-btn text-rose-400 text-xs px-1.5 py-1 rounded-[6px]">✕</button>
                        </div>
                      </div>
                      {!e.isSettlement && (
                        <p className="text-xs font-semibold text-stone-400">
                          {e.paidBy === 'me' ? 'You paid' : `${e.paidBy} paid`}
                          {' · '}split {e.splitAmong.length} ways
                          {' · '}each {fmt(e.totalAmount / e.splitAmong.length)}
                        </p>
                      )}
                      <p className="text-[10px] font-semibold text-stone-300">{e.date}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedGroup.entries.length === 0 && (
                <p className="text-sm font-semibold text-stone-400 text-center py-4 clay rounded-[14px]">
                  No expenses yet. Add the first one!
                </p>
              )}

              <button type="button" onClick={() => openNewEntry(selectedGroup)}
                className="clay-btn clay-purple clay py-3 font-black text-violet-900 text-center rounded-[14px]">
                ➕ Add Expense
              </button>
              <button type="button" onClick={() => handleMarkSettled(selectedGroup.id)}
                className="clay-btn clay-green clay py-3 font-black text-emerald-900 text-center rounded-[14px]">
                ✓ Mark as Settled
              </button>
              <button type="button" onClick={() => handleDeleteGroup(selectedGroup.id)}
                className="clay-btn clay-red clay py-3 font-black text-rose-900 text-center rounded-[14px]">
                🗑️ Delete Group
              </button>
            </div>
          );
        })()}

        {/* ── SETTLE DEBT VIEW ── */}
        {view === 'settle' && selectedGroup && (
          <div className="flex flex-col gap-3">
            {(() => {
              const balances = calcBalances(selectedGroup);
              const b = balances[settlePerson] ?? 0;
              return (
                <div className={`clay p-3 rounded-[12px] text-center ${b > 0 ? 'clay-green' : 'clay-red'}`}>
                  <p className="text-xs font-semibold text-stone-600">Current balance</p>
                  <p className="font-black text-stone-800">
                    {b > 0
                      ? `${settlePerson} owes you ${fmt(b)}`
                      : `You owe ${settlePerson} ${fmt(b)}`
                    }
                  </p>
                </div>
              );
            })()}

            {/* Direction */}
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">What happened?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSettleDir('receive')}
                  className={`clay-btn flex-1 py-2.5 rounded-[10px] font-bold text-sm ${
                    settleDir === 'receive' ? 'clay-green text-emerald-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                  }`}>
                  💰 {settlePerson} paid me
                </button>
                <button type="button" onClick={() => setSettleDir('pay')}
                  className={`clay-btn flex-1 py-2.5 rounded-[10px] font-bold text-sm ${
                    settleDir === 'pay' ? 'clay-red text-rose-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                  }`}>
                  💸 I paid {settlePerson}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Amount</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-stone-400 text-lg">₹</span>
                <input type="text" inputMode="decimal" value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  className="clay flex-1 px-3 py-2.5 font-black text-stone-700 text-xl bg-transparent outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Wallet */}
            {wallets.length > 0 && (
              <div className="clay p-3 flex flex-col gap-2">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wide">
                  {settleDir === 'receive' ? 'Received into wallet' : 'Paid from wallet'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {wallets.map(w => (
                    <button key={w.id} type="button" onClick={() => setSettleWalletId(w.id)}
                      className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                        settleWalletId === w.id ? 'clay-blue text-blue-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                      }`}>
                      {w.emoji} {w.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Date</p>
              <input type="date" value={settleDate}
                onChange={e => setSettleDate(e.target.value)}
                className="clay px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none w-full"
              />
            </div>

            <button type="button" onClick={handleConfirmSettle}
              disabled={!settleAmount || Number(settleAmount) === 0}
              className="clay-btn clay-purple clay py-3 font-black text-violet-900 text-center rounded-[14px] disabled:opacity-40">
              ✓ Record Settlement
            </button>
          </div>
        )}

        {/* ── NEW GROUP VIEW ── */}
        {view === 'new-group' && (
          <div className="flex flex-col gap-3">
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Group name</p>
              <input type="text" value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Goa Trip, Office Lunch"
                className="clay px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400 w-full"
              />
            </div>
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Other members</p>
              <p className="text-[11px] font-semibold text-violet-600">
                💡 You (Me) are always included — only add the others here.
              </p>
              {membersList.map(m => (
                <div key={m} className="flex items-center justify-between clay px-3 py-2 rounded-[10px]">
                  <span className="font-bold text-stone-700">{m}</span>
                  <button type="button" onClick={() => setMembersList(prev => prev.filter(x => x !== m))}
                    className="clay-btn text-rose-400 text-xs px-1.5 py-0.5 rounded-[6px]">Remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={memberInput}
                  onChange={e => setMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMemberToNewGroup()}
                  placeholder="e.g. Priya, Sneha, Rahul"
                  className="clay flex-1 px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400"
                />
                <button type="button" onClick={addMemberToNewGroup}
                  disabled={!memberInput.trim()}
                  className="clay-btn clay-purple clay px-4 py-2 font-black text-violet-900 rounded-[10px] disabled:opacity-40">+</button>
              </div>
            </div>
            <button type="button" onClick={handleCreateGroup}
              disabled={!groupName.trim() || membersList.length === 0}
              className="clay-btn clay-purple clay py-3 font-black text-violet-900 text-center rounded-[14px] disabled:opacity-40">
              Create Group →
            </button>
          </div>
        )}

        {/* ── NEW ENTRY VIEW ── */}
        {view === 'new-entry' && selectedGroup && (
          <div className="flex flex-col gap-3">
            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">What was it?</p>
              <input type="text" value={entryDesc}
                onChange={e => setEntryDesc(e.target.value)}
                placeholder="e.g. Lunch, Petrol, Movie tickets"
                className="clay px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none placeholder:text-stone-400 w-full"
              />
            </div>

            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Total bill amount</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-stone-400 text-lg">₹</span>
                <input type="text" inputMode="decimal" value={entryAmount}
                  onChange={e => setEntryAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  className="clay flex-1 px-3 py-2.5 font-black text-stone-700 text-xl bg-transparent outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Who paid the bill?</p>
              <div className="flex flex-wrap gap-2">
                {['me', ...selectedGroup.members].map(name => (
                  <button key={name} type="button" onClick={() => setEntryPaidBy(name)}
                    className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                      entryPaidBy === name ? 'clay-purple text-violet-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                    }`}>
                    {name === 'me' ? 'Me' : name}
                  </button>
                ))}
              </div>
            </div>

            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Split among</p>
              <div className="flex flex-wrap gap-2">
                {['me', ...selectedGroup.members].map(name => (
                  <button key={name} type="button" onClick={() => toggleSplitAmong(name)}
                    className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                      entrySplitAmong.includes(name) ? 'clay-green text-emerald-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                    }`}>
                    {name === 'me' ? 'Me' : name}
                  </button>
                ))}
              </div>
              {entryAmount && entrySplitAmong.length > 0 && (
                <p className="text-xs font-semibold text-violet-600">
                  {fmt(Number(entryAmount) / entrySplitAmong.length)} per person ({entrySplitAmong.length} people)
                </p>
              )}
            </div>

            {/* Wallet — only when I paid */}
            {entryPaidBy === 'me' && wallets.length > 0 && (
              <div className="clay p-3 flex flex-col gap-2">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Paid from wallet</p>
                <div className="flex flex-wrap gap-2">
                  {wallets.map(w => (
                    <button key={w.id} type="button" onClick={() => setEntryWalletId(w.id)}
                      className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                        entryWalletId === w.id ? 'clay-blue text-blue-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                      }`}>
                      {w.emoji} {w.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category — only when I paid */}
            {entryPaidBy === 'me' && categories.length > 0 && (
              <div className="clay p-3 flex flex-col gap-2">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Category (optional)</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEntryCategoryId('')}
                    className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                      !entryCategoryId ? 'clay-amber text-amber-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                    }`}>
                    None
                  </button>
                  {categories.map(c => (
                    <button key={c.id} type="button" onClick={() => setEntryCategoryId(c.id)}
                      className={`clay-btn px-3 py-2 rounded-[10px] font-bold text-sm ${
                        entryCategoryId === c.id ? 'clay-amber text-amber-900' : 'bg-stone-100 text-stone-500 border border-stone-200 shadow-none'
                      }`}>
                      {c.emoji} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="clay p-3 flex flex-col gap-2">
              <p className="text-xs font-black text-stone-500 uppercase tracking-wide">Date</p>
              <input type="date" value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="clay px-3 py-2.5 font-bold text-stone-700 bg-transparent outline-none w-full"
              />
            </div>

            {entryPaidBy === 'me' && entryAmount && (
              <div className="clay-amber clay rounded-[12px] px-3 py-2.5">
                <p className="text-xs font-bold text-amber-800">
                  💡 The full ₹{Number(entryAmount).toLocaleString('en-IN')} will be recorded as an expense from your wallet — use "💸 Settle" in the group when others pay you back.
                </p>
              </div>
            )}

            <button type="button" onClick={handleAddEntry}
              disabled={!entryDesc.trim() || !entryAmount || entrySplitAmong.length === 0}
              className="clay-btn clay-purple clay py-3 font-black text-violet-900 text-center rounded-[14px] disabled:opacity-40">
              Add Expense ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
