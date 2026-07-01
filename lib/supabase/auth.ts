import { getSupabase, usernameToEmail, isSupabaseEnabled } from './client';

interface CachedSession {
  userId: string;
  username: string;
  displayName: string;
}

export async function supabaseRestoreAuth(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await cacheSessionFromUser(session.user.id);
    return true;
  }
  return false;
}

export async function cacheSessionFromUser(userId: string): Promise<CachedSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', userId)
    .maybeSingle();

  const session: CachedSession = {
    userId,
    username: profile?.username ?? '',
    displayName: profile?.display_name ?? '',
  };

  localStorage.setItem('money_buddy_session', JSON.stringify(session));
  return session;
}

export async function supabaseRegister(
  username: string,
  password: string,
  displayName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Cloud sync is not configured' };

  const trimmedUser = username.trim().toLowerCase();
  const trimmedName = displayName.trim();

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(trimmedUser),
    password,
    options: {
      data: { username: trimmedUser, display_name: trimmedName },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { ok: false, error: 'That username is already taken' };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user) return { ok: false, error: 'Sign up failed. Please try again.' };

  if (!data.session) {
    return {
      ok: false,
      error: 'Check your email to confirm, or disable email confirmation in Supabase Auth settings.',
    };
  }

  await cacheSessionFromUser(data.user.id);
  return { ok: true };
}

export async function supabaseLogin(
  username: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Cloud sync is not configured' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username.trim().toLowerCase()),
    password,
  });

  if (error) return { ok: false, error: 'Wrong username or password' };
  if (!data.user) return { ok: false, error: 'Login failed' };

  await cacheSessionFromUser(data.user.id);
  return { ok: true };
}

export async function supabaseLogout(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}

export async function supabaseUpdateDisplayName(name: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', user.id);
  await cacheSessionFromUser(user.id);
}

export { isSupabaseEnabled };
