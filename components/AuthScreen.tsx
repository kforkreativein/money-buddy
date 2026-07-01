'use client';
import { useState } from 'react';
import { login, register } from '@/lib/auth';

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, password, displayName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onAuth();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ background: '#FFF7ED' }}>
      <div className="clay animate-bounce-in w-full max-w-sm p-7 flex flex-col gap-5">
        <div className="text-center">
          <span
            aria-hidden="true"
            style={{
              backgroundImage: 'url(/money-buddy-logo.svg)',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
            className="inline-block h-16 w-16 rounded-[20px] shadow-[5px_5px_12px_rgba(0,0,0,0.10),-3px_-3px_8px_rgba(255,255,255,0.85)]"
          />
          <h1 className="text-2xl font-black text-stone-800 mt-3">Money Buddy</h1>
          <p className="text-sm font-semibold text-stone-500 mt-1">
            {mode === 'login' ? 'Welcome back! Sign in to your account.' : 'Create your account to get started.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your first name"
              autoComplete="name"
              className="clay w-full px-4 py-3 text-base font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-400"
            />
          )}
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            className="clay w-full px-4 py-3 text-base font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-400"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="clay w-full px-4 py-3 text-base font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-400"
          />

          {error && (
            <p className="text-sm font-bold text-rose-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="clay-btn w-full py-4 rounded-[16px] font-black text-white text-base bg-violet-500 shadow-lg disabled:opacity-40">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In 🔐' : 'Create Account 🚀'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
          className="clay-btn text-sm font-bold text-violet-600 text-center py-2">
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>

        <p className="text-[11px] text-stone-400 text-center leading-relaxed">
          Your data is saved separately for each account on this device. Sign in again anytime — we&apos;ll remember you.
        </p>
      </div>
    </div>
  );
}
