'use client';
import { useState, useEffect } from 'react';
import { RecurringRule, Wallet } from '@/lib/types';
import { getRules, deleteRule } from '@/lib/recurring';
import { getWallets } from '@/lib/wallets';

const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

function fmt(n: number) { return `₹${n.toLocaleString('en-IN')}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function RecurringManager({ onRefresh }: { onRefresh: () => void }) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [open, setOpen] = useState(false);

  function load() {
    setRules(getRules());
    setWallets(getWallets());
  }

  useEffect(() => { load(); }, []);

  function handleDelete(id: string) {
    deleteRule(id);
    load();
    onRefresh();
  }

  const walletName = (id: string) => wallets.find(w => w.id === id)?.name ?? id;
  const walletEmoji = (id: string) => wallets.find(w => w.id === id)?.emoji ?? '💳';

  return (
    <div className="clay flex flex-col">
      <button
        onClick={() => setOpen(v => !v)}
        className="clay-btn flex items-center justify-between px-4 py-3 font-bold text-sm text-stone-600">
        <span>🔄 Recurring rules {rules.length > 0 && <span className="ml-1 text-xs bg-violet-100 text-violet-700 font-black px-1.5 py-0.5 rounded-full">{rules.length}</span>}</span>
        <span className="text-stone-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {rules.length === 0 ? (
            <p className="text-sm text-stone-400 font-semibold text-center py-3">
              No recurring rules yet.<br />
              <span className="text-xs">Toggle &ldquo;Make this recurring&rdquo; when adding an entry.</span>
            </p>
          ) : (
            rules.map(r => (
              <div key={r.id}
                className={`flex items-center gap-3 p-3 rounded-[14px] border-2 border-white/60 ${
                  r.type === 'income'
                    ? 'bg-gradient-to-r from-emerald-50 to-white'
                    : 'bg-gradient-to-r from-rose-50 to-white'
                }`}>
                <span className="text-xl">{walletEmoji(r.walletId)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-stone-800 text-sm truncate">{r.description || fmt(r.amount)}</p>
                  <p className="text-xs text-stone-500 font-semibold">
                    {fmt(r.amount)} · {FREQ_LABEL[r.frequency]} · {walletName(r.walletId)}
                  </p>
                  <p className="text-xs text-stone-400 font-semibold">Next: {fmtDate(r.nextDue)}</p>
                </div>
                <span className={`text-sm font-black flex-shrink-0 ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {r.type === 'income' ? '+' : '-'}{fmt(r.amount)}
                </span>
                <button onClick={() => handleDelete(r.id)}
                  className="clay-btn flex-shrink-0 text-rose-400 font-bold text-xs px-2 py-1.5 rounded-[10px] bg-white border border-rose-100">
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
