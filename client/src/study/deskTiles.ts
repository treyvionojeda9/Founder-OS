/**
 * Overview tile count for this desk.
 * localStorage only. No vault table, no network, no approval.
 * Focus is a scene pose and is not stored.
 */

const KEY = "founder-os.desk-tiles";

export const TILE_COUNTS = [2, 3, 4] as const;
export type TileCount = (typeof TILE_COUNTS)[number];

/** Wait long enough to tell a double-tap from a single tap. */
export const TILE_TAP_MS = 400;

const listeners = new Set<() => void>();

export function isTileCount(value: number): value is TileCount {
  return value === 2 || value === 3 || value === 4;
}

function read(): TileCount {
  if (typeof localStorage === "undefined") return 3;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 3;
    const parsed = JSON.parse(raw) as { count?: unknown };
    const count = typeof parsed.count === "number" ? parsed.count : Number(parsed.count);
    return isTileCount(count) ? count : 3;
  } catch {
    return 3;
  }
}

let memory: TileCount = read();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify({ count: memory }));
  }
  emit();
}

export function tileCount(): TileCount {
  return memory;
}

export function subscribeDeskTiles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadDeskTiles() {
  memory = read();
  emit();
}

export function resetDeskTilesForTests() {
  memory = 3;
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  emit();
}

/** A count outside 2–4 is refused and the stored layout is left as it was. */
export function setTileCount(count: number): boolean {
  if (!isTileCount(count)) return false;
  if (count === memory) return true;
  memory = count;
  persist();
  return true;
}
