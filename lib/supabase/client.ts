import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseEnabled(): boolean {
  return Boolean(URL && ANON_KEY && URL.startsWith('https://'));
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled()) return null;
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Internal email for username-based login (users still see "username"). */
export function usernameToEmail(username: string): string {
  const safe = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${safe}@moneybuddy.app`;
}
