'use client';
import { useState, useEffect } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ProfileHeader() {
  const [name, setName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('money_buddy_name');
    if (saved) setName(saved);
    else setShowModal(true);
  }, []);

  function saveName() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    localStorage.setItem('money_buddy_name', trimmed);
    setName(trimmed);
    setShowModal(false);
  }

  function openEdit() {
    setDraft(name ?? '');
    setShowModal(true);
  }

  return (
    <>
      {/* Name modal — shown on first visit or when editing */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="clay animate-bounce-in w-full max-w-sm p-7 flex flex-col items-center gap-5 text-center">
            <span className="text-5xl">{name ? '✏️' : '👋'}</span>
            <h2 className="text-2xl font-black text-stone-800">
              {name ? 'Edit your name' : "What's your name?"}
            </h2>
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
            <div className="flex gap-2 w-full">
              {name && (
                <button onClick={() => setShowModal(false)}
                  className="clay-btn flex-1 py-3 rounded-[16px] font-black text-stone-600 text-base bg-stone-100">
                  Cancel
                </button>
              )}
              <button onClick={saveName}
                disabled={!draft.trim()}
                className="clay-btn flex-1 py-3 rounded-[16px] font-black text-white text-base bg-violet-500 shadow-lg disabled:opacity-40">
                {name ? 'Save ✅' : "Let's go! 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header — always visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            style={{
              backgroundImage: 'url(/money-buddy-logo.svg)',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
            className="h-[52px] w-[52px] shrink-0 rounded-[18px] shadow-[5px_5px_12px_rgba(0,0,0,0.10),-3px_-3px_8px_rgba(255,255,255,0.85)]"
          />
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{getGreeting()}</p>
            <h1 className="text-2xl font-black text-stone-800 leading-tight">
              Hey {name ?? ''}!
            </h1>
            <p className="text-xs font-semibold text-stone-400 mt-0.5">Money Buddy</p>
          </div>
        </div>
        <button
          onClick={openEdit}
          aria-label="Edit name"
          className="clay clay-btn w-11 h-11 flex items-center justify-center text-xl rounded-[14px]">
          👤
        </button>
      </div>
    </>
  );
}
