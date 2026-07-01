'use client';
import { Transaction, Wallet } from '@/lib/types';
import { getWallets, legacyWalletId } from '@/lib/wallets';
import { fmt } from '@/lib/insights';

function walletNet(w: Wallet, transactions: Transaction[]) {
  const txNet = transactions
    .filter(t => (t.walletId ?? legacyWalletId(t.paymentMode, t.bank)) === w.id)
    .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  return (w.openingBalance ?? 0) + txNet;
}

export default function LowBalanceAlert({ transactions }: { transactions: Transaction[] }) {
  const wallets = getWallets();
  const low = wallets
    .map(w => ({ w, net: walletNet(w, transactions) }))
    .filter(({ w, net }) => w.minBalance != null && w.minBalance > 0 && net < w.minBalance);

  if (low.length === 0) return null;

  return (
    <div className="clay-amber clay animate-pop-in p-4 flex flex-col gap-2">
      <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">⚠️ Low Balance Alert</h3>
      {low.map(({ w, net }) => (
        <p key={w.id} className="text-sm font-bold text-amber-900">
          {w.emoji} {w.name}: {fmt(net)} (below {fmt(w.minBalance!)})
        </p>
      ))}
      <p className="text-[10px] font-semibold text-amber-800/70">Set alert limits when editing a wallet ✏️</p>
    </div>
  );
}
