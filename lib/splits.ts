import { SplitGroup, SplitEntry } from './types';
import { userStorageKey } from './auth';

const KEY = 'money_buddy_splits';

function storageKey() {
  return userStorageKey(KEY);
}

export function getSplitGroups(): SplitGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
  } catch {
    return [];
  }
}

function save(groups: SplitGroup[]) {
  localStorage.setItem(storageKey(), JSON.stringify(groups));
}

export function addSplitGroup(name: string, members: string[]): SplitGroup {
  const group: SplitGroup = {
    id: crypto.randomUUID(),
    name,
    members,
    entries: [],
    settled: false,
    createdAt: Date.now(),
  };
  save([...getSplitGroups(), group]);
  return group;
}

export function addSplitEntry(groupId: string, entry: Omit<SplitEntry, 'id' | 'createdAt'>): SplitEntry {
  const full: SplitEntry = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() };
  save(getSplitGroups().map(g =>
    g.id === groupId ? { ...g, entries: [...g.entries, full] } : g
  ));
  return full;
}

export function deleteSplitEntry(groupId: string, entryId: string) {
  save(getSplitGroups().map(g =>
    g.id === groupId ? { ...g, entries: g.entries.filter(e => e.id !== entryId) } : g
  ));
}

export function settleGroup(groupId: string) {
  save(getSplitGroups().map(g =>
    g.id === groupId ? { ...g, settled: true, settledAt: Date.now() } : g
  ));
}

export function updateSplitGroup(groupId: string, patch: Partial<Pick<SplitGroup, 'name' | 'members' | 'pinned'>>) {
  save(getSplitGroups().map(g => g.id === groupId ? { ...g, ...patch } : g));
}

export function deleteSplitGroup(groupId: string) {
  save(getSplitGroups().filter(g => g.id !== groupId));
}

// Per-member net: positive = they owe me, negative = I owe them
export function calcBalances(group: SplitGroup): Record<string, number> {
  const bal: Record<string, number> = Object.fromEntries(group.members.map(m => [m, 0]));
  for (const e of group.entries) {
    const count = e.splitAmong.length;
    if (!count) continue;
    const share = e.totalAmount / count;
    if (e.paidBy === 'me') {
      for (const p of e.splitAmong) {
        if (p !== 'me') bal[p] = (bal[p] ?? 0) + share;
      }
    } else if (e.splitAmong.includes('me')) {
      bal[e.paidBy] = (bal[e.paidBy] ?? 0) - share;
    }
  }
  return bal;
}

// Net across all members: positive = I'm owed overall, negative = I owe overall
export function groupNetTotal(group: SplitGroup): number {
  return Object.values(calcBalances(group)).reduce((a, b) => a + b, 0);
}
