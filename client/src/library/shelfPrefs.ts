/**
 * Which shelf leads on this desk.
 * localStorage only. No vault table, no network.
 * A missing mark keeps the default kit pinned, so that shelf stays first.
 */

const KEY = "founder-os.library-shelf";

export type ShelfPrefs = {
  /** Explicit false unpins that team. Absent means pinned. */
  kitPinned: Record<string, boolean>;
};

const listeners = new Set<() => void>();

function emptyPrefs(): ShelfPrefs {
  return { kitPinned: {} };
}

function asTeamId(value: string): string {
  const next = value.trim();
  if (!next || next.length > 64) return "";
  return next;
}

function asPinned(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = asTeamId(key);
    if (!id || typeof item !== "boolean") continue;
    out[id] = item;
  }
  return out;
}

function read(): ShelfPrefs {
  if (typeof localStorage === "undefined") return emptyPrefs();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPrefs();
    const parsed = JSON.parse(raw) as { kitPinned?: unknown };
    return { kitPinned: asPinned(parsed.kitPinned) };
  } catch {
    return emptyPrefs();
  }
}

let memory: ShelfPrefs = read();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(memory));
  }
  emit();
}

export function getShelfPrefs(): ShelfPrefs {
  return memory;
}

export function subscribeShelfPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadShelfPrefs() {
  memory = read();
  emit();
}

export function resetShelfPrefsForTests() {
  memory = emptyPrefs();
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  emit();
}

/** The default kit leads unless this desk has explicitly unpinned it. */
export function isKitPinned(teamId: string, prefs: ShelfPrefs = memory): boolean {
  return prefs.kitPinned[teamId] !== false;
}

export function setKitPinned(teamId: string, pinned: boolean): boolean {
  const id = asTeamId(teamId);
  if (!id) return false;
  if (memory.kitPinned[id] === pinned) return true;
  memory = { ...memory, kitPinned: { ...memory.kitPinned, [id]: pinned } };
  persist();
  return true;
}
