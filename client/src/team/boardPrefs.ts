/**
 * Team-board marks that stay on this desk.
 * localStorage only. No vault table, no network.
 */

const KEY = "founder-os.team-board";
const MAX_LABEL = 32;
const MAX_NAME = 24;

export type NameMark = {
  name: string;
  title: string;
};

export type BoardPrefs = {
  /** Newest pin first, per team. */
  pins: Record<string, string[]>;
  /** Canonical tool name → local label, per team. */
  labels: Record<string, Record<string, string>>;
  /** Plaque text only. The fixture agent is left alone. */
  names: Record<string, NameMark>;
  /** Last swap mark. It does not move the fixture. */
  marks: Record<string, string>;
};

const listeners = new Set<() => void>();

function emptyPrefs(): BoardPrefs {
  return { pins: {}, labels: {}, names: {}, marks: {} };
}

function asId(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const next = value.trim();
  if (!next || next.length > max) return "";
  return next;
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const id = asId(item, 64);
    if (!id || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = asId(key, 64);
    const label = asId(item, MAX_LABEL);
    if (!id || !label) continue;
    out[id] = label;
  }
  return out;
}

function asNameMap(value: unknown): Record<string, NameMark> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, NameMark> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = asId(key, 80);
    if (!id || !item || typeof item !== "object") continue;
    const name = asId((item as { name?: unknown }).name, MAX_NAME);
    if (!name) continue;
    const title = asId((item as { title?: unknown }).title, MAX_NAME);
    out[id] = { name, title };
  }
  return out;
}

function asMapOfRecords(value: unknown): Record<string, Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, Record<string, string>> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = asId(key, 64);
    if (!id) continue;
    out[id] = asRecord(item);
  }
  return out;
}

function asMapOfLists(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    const id = asId(key, 64);
    if (!id) continue;
    out[id] = asIdList(item);
  }
  return out;
}

function read(): BoardPrefs {
  if (typeof localStorage === "undefined") return emptyPrefs();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPrefs();
    const parsed = JSON.parse(raw) as {
      pins?: unknown;
      labels?: unknown;
      names?: unknown;
      marks?: unknown;
    };
    return {
      pins: asMapOfLists(parsed.pins),
      labels: asMapOfRecords(parsed.labels),
      names: asNameMap(parsed.names),
      marks: asRecord(parsed.marks),
    };
  } catch {
    return emptyPrefs();
  }
}

let memory: BoardPrefs = read();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(memory));
  }
  emit();
}

export function getBoardPrefs(): BoardPrefs {
  return memory;
}

export function subscribeBoardPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadBoardPrefs() {
  memory = read();
  emit();
}

export function resetBoardPrefsForTests() {
  memory = emptyPrefs();
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  emit();
}

export function seatKey(teamId: string, agentId: string): string {
  return `${teamId}:${agentId}`;
}

type Seat = { id: string };

/** Pinned agents lead, newest pin first. Everyone else keeps roster order. */
export function seatOrder<T extends Seat>(agents: readonly T[], pins: readonly string[]): T[] {
  const pinned: T[] = [];
  for (const id of pins) {
    const agent = agents.find((item) => item.id === id);
    if (agent && !pinned.includes(agent)) pinned.push(agent);
  }
  const rest = agents.filter((agent) => !pinned.includes(agent));
  return [...pinned, ...rest];
}

export function togglePin(teamId: string, agentId: string): boolean {
  const current = memory.pins[teamId] ?? [];
  const pinned = current.includes(agentId);
  const next = pinned ? current.filter((id) => id !== agentId) : [agentId, ...current.filter((id) => id !== agentId)];
  memory = { ...memory, pins: { ...memory.pins, [teamId]: next } };
  persist();
  return !pinned;
}

export function toolLabel(teamId: string, canonical: string, prefs: BoardPrefs = memory): string {
  const local = prefs.labels[teamId]?.[canonical]?.trim() ?? "";
  return local.length > 0 ? local : canonical;
}

/** A local label is plain desk language. Blank, long, and address-shaped text is refused. */
export function setToolLabel(teamId: string, canonical: string, label: string): boolean {
  const next = label.trim();
  if (!canonical.trim() || !next || next.length > MAX_LABEL) return false;
  if (/https?:|\/api\//i.test(next)) return false;
  const teamLabels = { ...(memory.labels[teamId] ?? {}) };
  if (next === canonical) delete teamLabels[canonical];
  else teamLabels[canonical] = next;
  memory = { ...memory, labels: { ...memory.labels, [teamId]: teamLabels } };
  persist();
  return true;
}

export function plaqueMark(teamId: string, agentId: string, prefs: BoardPrefs = memory): NameMark | undefined {
  return prefs.names[seatKey(teamId, agentId)];
}

export function keepPlaqueMark(teamId: string, agentId: string, mark: NameMark): boolean {
  const name = mark.name.trim();
  const title = mark.title.trim();
  if (!name || name.length > MAX_NAME || title.length > MAX_NAME) return false;
  if (/https?:|\/api\//i.test(name) || /https?:|\/api\//i.test(title)) return false;
  memory = {
    ...memory,
    names: { ...memory.names, [seatKey(teamId, agentId)]: { name, title } },
  };
  persist();
  return true;
}

export function markSwap(teamId: string, agentId: string, otherId: string): boolean {
  const from = agentId.trim();
  const to = otherId.trim();
  if (!from || !to || from === to) return false;
  memory = { ...memory, marks: { ...memory.marks, [seatKey(teamId, from)]: to } };
  persist();
  return true;
}
