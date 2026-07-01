'use client';
import { getTimeGreeting } from '@/lib/streak';

interface Props {
  name: string;
  streak: number;
  onDismiss: () => void;
}

export default function DailyWelcome({ name, streak, onDismiss }: Props) {
  return (
    <div className="clay clay-purple p-4 flex flex-col gap-2 animate-pop-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-violet-800 uppercase tracking-wider">{getTimeGreeting()}</p>
          <h2 className="text-lg font-black text-violet-950 leading-tight">
            Welcome back{name ? `, ${name}` : ''}!
          </h2>
        </div>
        <button type="button" onClick={onDismiss} className="clay-btn text-violet-600 font-black text-sm px-2">✕</button>
      </div>
      <p className="text-sm font-semibold text-violet-800 leading-relaxed">
        {streak > 1
          ? `You're on a ${streak}-day streak — keep tracking your money.`
          : streak === 1
            ? 'Day 1 of your tracking streak. Log something today to keep it going!'
            : 'Great to see you. Log an entry today to start your streak.'}
      </p>
      <button type="button" onClick={onDismiss} className="clay-btn py-2.5 bg-violet-500 text-white font-black text-sm rounded-[12px]">
        Let&apos;s go
      </button>
    </div>
  );
}
