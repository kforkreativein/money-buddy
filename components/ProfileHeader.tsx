'use client';
import { useState, useEffect } from 'react';

const GREETINGS = ['Hey', 'Hello', 'Hiya', 'Welcome back,', 'Good to see you,'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ProfileHeader() {
  const [name, setName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('money_buddy_name');
    if (saved) setName(saved);
  }, []);

  function saveName() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    localStorage.setItem('money_buddy_name', trimmed);
    setName(trimmed);
    setEditing(false);
  }

  // Name prompt modal
  if (!name && !editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}>
        <div className="clay animate-bounce-in w-full max-w-sm p-7 flex flex-col items-center gap-5 text-center">
          <span className="text-5xl">👋</span>
          <h2 className="text-2xl font-black text-stone-800">What's your name?</h2>
          <p className="text-sm font-semibold text-stone-500">So I can greet you properly!</p>
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Your first name"
            className="clay w-full px-4 py-3 text-lg font-bold text-stone-800 bg-transparent outline-none text-center placeholder:text-stone-400"
          />
          <button onClick={saveName}
            disabled={!draft.trim()}
            className="clay-btn w-full py-3 rounded-[16px] font-black text-white text-base bg-violet-500 shadow-lg disabled:opacity-40">
            Let's go! 🚀
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{getGreeting()}</p>
        <h1 className="text-2xl font-black text-stone-800 leading-tight">
          Hey {name}! <span className="text-xl">💰</span>
        </h1>
        <p className="text-xs font-semibold text-stone-400 mt-0.5">Money Buddy</p>
      </div>
      <button
        onClick={() => { setDraft(name ?? ''); setEditing(true); setName(null); }}
        aria-label="Edit name"
        className="clay clay-btn w-11 h-11 flex items-center justify-center text-xl rounded-[14px]">
        👤
      </button>
    </div>
  );
}
