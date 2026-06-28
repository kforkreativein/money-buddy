'use client';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const MOTIVATION = [
  "Psst! Big spend? Your piggy bank is crying 🐷",
  "Wow! Save today, smile tomorrow 😊",
  "Spend less, earn more — you've got this! 💪",
  "Your future self is watching... 👀",
  "Money flies fast! Let's earn some back 🦋",
  "Ooh, that's a lot! Small savings add up big 🌱",
  "Your wallet felt that one! Be kind to it 😅",
  "Every rupee counts — make them work for you! ✨",
  "Big spender alert! Balance it with some income 💡",
  "Remember: save today, celebrate tomorrow 🎉",
];

interface Props {
  trigger: { type: 'income' | 'expense'; amount: number; key: number } | null;
}

const BANNER_DURATION = 10000; // 10s
const EMOJI_RAIN_DUR = 5;      // 5s base fall duration

export default function EffectsLayer({ trigger }: Props) {
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerOut, setBannerOut] = useState(false);
  const [emojiRain, setEmojiRain] = useState<{ id: number; x: number; emoji: string; delay: number; dur: number }[]>([]);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!trigger) return;

    if (trigger.type === 'income') {
      // Two confetti bursts — initial + follow-up for 5s feel
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, colors: ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f87171'] });
      setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, colors: ['#34d399', '#a78bfa', '#fbbf24'] }), 800);
      setTimeout(() => confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 }, colors: ['#60a5fa', '#f87171', '#34d399'] }), 2000);
      return;
    }

    const level = Math.min(Math.floor(trigger.amount / 500), 6);
    if (level < 1) return;

    // Emoji rain — scaled to level, runs for ~5s
    const count = 12 + level * 6;
    const drops = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 94,
      emoji: Math.random() > 0.45 ? '💸' : '😢',
      delay: Math.random() * 1.5,
      dur: EMOJI_RAIN_DUR + Math.random() * 1 - level * 0.1,
    }));
    setEmojiRain(drops);
    if (rainTimer.current) clearTimeout(rainTimer.current);
    rainTimer.current = setTimeout(() => setEmojiRain([]), 7000);

    // Motivation banner — 10s
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBannerOut(false);
    setBanner(MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)]);
    bannerTimer.current = setTimeout(() => {
      setBannerOut(true);
      setTimeout(() => setBanner(null), 350);
    }, BANNER_DURATION);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger?.key]);

  return (
    <>
      {emojiRain.map(drop => (
        <div key={drop.id}
          className="animate-fall pointer-events-none fixed top-0 z-50 text-3xl select-none"
          style={{ left: `${drop.x}vw`, animationDuration: `${drop.dur}s`, animationDelay: `${drop.delay}s`, opacity: 0 }}>
          {drop.emoji}
        </div>
      ))}

      {banner && (
        <div className={`fixed bottom-6 left-4 right-4 z-50 flex justify-center ${bannerOut ? 'animate-slide-down' : 'animate-slide-up'}`}
          style={{ bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}>
          <div className="clay-purple clay px-5 py-4 max-w-sm w-full text-center"
            onClick={() => { setBannerOut(true); setTimeout(() => setBanner(null), 350); }}
            role="status" aria-live="polite">
            <p className="font-black text-violet-900 text-sm leading-snug">{banner}</p>
            <p className="text-violet-600 text-xs mt-1 font-semibold opacity-60">tap to dismiss</p>
          </div>
        </div>
      )}
    </>
  );
}
