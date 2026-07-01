export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  createdAt: number;
}

export interface Session {
  userId: string;
  username: string;
  displayName: string;
}

export interface SavedLogin {
  username: string;
  password: string;
}

const USERS_KEY = 'money_buddy_users';
const SESSION_KEY = 'money_buddy_session';
const SAVED_LOGIN_KEY = 'money_buddy_saved_login';

const LEGACY_KEYS = [
  'money_buddy_txns',
  'money_buddy_wallets',
  'money_buddy_recurring',
  'money_buddy_name',
  'money_buddy_budget',
  'onboarding_done',
] as const;

function getUsers(): UserAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: UserAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserById(userId: string): UserAccount | undefined {
  return getUsers().find(u => u.id === userId);
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBuffer = new Uint8Array(salt);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function saltToHex(salt: Uint8Array): string {
  return Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
}

function saltFromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session?.userId || !findUserById(session.userId)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  return getSession()?.userId ?? null;
}

export function userStorageKey(base: string): string {
  const userId = getCurrentUserId();
  if (!userId) return base;
  return `${base}_${userId}`;
}

function setSession(user: UserAccount) {
  const session: Session = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function saveLoginCredentials(username: string, password: string) {
  const saved: SavedLogin = { username: username.trim().toLowerCase(), password };
  localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(saved));
}

export function getSavedLoginCredentials(): SavedLogin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedLogin;
    if (!saved?.username || !saved?.password) return null;
    return saved;
  } catch {
    return null;
  }
}

/** Set up default wallets for a brand-new user. */
function initUserData(userId: string) {
  const walletKey = `money_buddy_wallets_${userId}`;
  if (!localStorage.getItem(walletKey)) {
    localStorage.setItem(walletKey, JSON.stringify([
      { id: 'gpay_hdfc', name: 'GPay HDFC', emoji: '📱' },
      { id: 'gpay_yes', name: 'GPay Yes Bank', emoji: '📱' },
      { id: 'cash', name: 'Cash', emoji: '💵' },
    ]));
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/** Restore session on app load — uses saved session or saved username/password. */
export async function restoreAuth(): Promise<boolean> {
  if (getSession()) return true;

  const saved = getSavedLoginCredentials();
  if (!saved) return false;

  const result = await login(saved.username, saved.password, { saveCredentials: false });
  return result.ok;
}

/** Copy any pre-login local data into the new user's scoped keys (one-time). */
function migrateLegacyData(userId: string) {
  const migratedFlag = `money_buddy_migrated_${userId}`;
  if (localStorage.getItem(migratedFlag)) return;

  for (const key of LEGACY_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) {
      localStorage.setItem(`${key}_${userId}`, value);
    }
  }
  localStorage.setItem(migratedFlag, '1');
}

export async function register(
  username: string,
  password: string,
  displayName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedName = displayName.trim();
  if (!trimmedUser || trimmedUser.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters' };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters' };
  }
  if (!trimmedName) {
    return { ok: false, error: 'Please enter your name' };
  }

  const users = getUsers();
  if (users.some(u => u.username === trimmedUser)) {
    return { ok: false, error: 'That username is already taken' };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const user: UserAccount = {
    id: crypto.randomUUID(),
    username: trimmedUser,
    passwordHash,
    salt: saltToHex(salt),
    displayName: trimmedName,
    createdAt: Date.now(),
  };

  saveUsers([...users, user]);
  setSession(user);
  initUserData(user.id);
  migrateLegacyData(user.id);
  saveLoginCredentials(trimmedUser, password);
  return { ok: true };
}

export async function login(
  username: string,
  password: string,
  options: { saveCredentials?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedUser = username.trim().toLowerCase();
  const user = getUsers().find(u => u.username === trimmedUser);
  if (!user) return { ok: false, error: 'Wrong username or password' };

  const hash = await hashPassword(password, saltFromHex(user.salt));
  if (hash !== user.passwordHash) return { ok: false, error: 'Wrong username or password' };

  setSession(user);
  initUserData(user.id);
  if (options.saveCredentials !== false) {
    saveLoginCredentials(trimmedUser, password);
  }
  return { ok: true };
}

export function updateDisplayName(name: string) {
  const session = getSession();
  if (!session) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const users = getUsers().map(u =>
    u.id === session.userId ? { ...u, displayName: trimmed } : u,
  );
  saveUsers(users);
  setSession({ ...users.find(u => u.id === session.userId)! });
}
