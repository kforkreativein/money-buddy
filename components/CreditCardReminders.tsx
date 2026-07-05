'use client';
import { useEffect, useMemo, useState } from 'react';
import { Transaction } from '@/lib/types';
import { getWallets, walletNetBalance } from '@/lib/wallets';
import { userStorageKey } from '@/lib/auth';
import { notificationsEnabled, showNotification } from '@/lib/notifications';
import { fmt } from '@/lib/insights';

const DISMISS_KEY = 'money_buddy_cc_reminders_dismissed';
const NOTIFIED_KEY = 'money_buddy_cc_reminders_notified';

// ponytail: simple window heuristic — statement shown 0-3 days after gen, due shown 0-5 days before.
// No cross-month carry or paid-off detection; tune the windows below if a real billing cycle needs it.
const STMT_WINDOW = 3;
const DUE_WINDOW = 5;

type Reminder = {
  key: string;
  kind: 'statement' | 'due';
  title: string;
  detail: string;
};

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(userStorageKey(key)) ?? '[]')); }
  catch { return new Set(); }
}
function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(userStorageKey(key), JSON.stringify([...set]));
}

function computeReminders(transactions: Transaction[]): Reminder[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cycle = `${y}-${m + 1}`;
  const out: Reminder[] = [];

  for (const w of getWallets()) {
    if (!w.isCreditCard) continue;
    const outstanding = Math.max(0, -walletNetBalance(w.id, transactions));

    if (w.statementDay) {
      const stD = Math.min(w.statementDay, daysInMonth);
      const since = d - stD;
      if (since >= 0 && since <= STMT_WINDOW) {
        out.push({
          key: `${w.id}|${cycle}|stmt`,
          kind: 'statement',
          title: `${w.emoji} ${w.name} statement generated`,
          detail: outstanding > 0 ? `${fmt(outstanding)} outstanding` : 'No balance this cycle',
        });
      }
    }

    if (w.dueDay && outstanding > 0) {
      const dueD = Math.min(w.dueDay, daysInMonth);
      const daysUntil = dueD - d;
      if (daysUntil >= 0 && daysUntil <= DUE_WINDOW) {
        out.push({
          key: `${w.id}|${cycle}|due`,
          kind: 'due',
          title: `${w.emoji} ${w.name} bill due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}`,
          detail: `${fmt(outstanding)} to pay`,
        });
      }
    }
  }
  return out;
}

export default function CreditCardReminders({ transactions }: { transactions: Transaction[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => { setDismissed(loadSet(DISMISS_KEY)); }, []);

  const reminders = useMemo(() => computeReminders(transactions), [transactions]);
  const visible = reminders.filter(r => !dismissed.has(r.key));

  // Fire a browser notification once per reminder per cycle
  useEffect(() => {
    if (!notificationsEnabled() || visible.length === 0) return;
    const notified = loadSet(NOTIFIED_KEY);
    let changed = false;
    for (const r of visible) {
      if (!notified.has(r.key)) {
        showNotification(r.title, r.detail);
        notified.add(r.key);
        changed = true;
      }
    }
    if (changed) saveSet(NOTIFIED_KEY, notified);
  }, [visible]);

  if (visible.length === 0) return null;

  function dismiss(key: string) {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    saveSet(DISMISS_KEY, next);
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map(r => (
        <div key={r.key}
          className={`clay animate-pop-in flex items-center justify-between gap-2 px-4 py-3 ${r.kind === 'due' ? 'clay-red' : 'clay-blue'}`}>
          <div className="min-w-0">
            <p className={`text-sm font-black truncate ${r.kind === 'due' ? 'text-rose-900' : 'text-blue-900'}`}>
              {r.kind === 'due' ? '⏰ ' : '📄 '}{r.title}
            </p>
            <p className={`text-xs font-bold ${r.kind === 'due' ? 'text-rose-800/80' : 'text-blue-800/80'}`}>{r.detail}</p>
          </div>
          <button type="button" onClick={() => dismiss(r.key)}
            className={`clay-btn shrink-0 font-black text-xs px-2 py-1 rounded-[8px] ${r.kind === 'due' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
