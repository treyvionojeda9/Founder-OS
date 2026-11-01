/**
 * Work halt for one desk. This is a UI fixture.
 * It does not approve, publish, or write the Human Vault or the Machine Vault.
 */
const paused = new Set<string>();
const listeners = new Set<() => void>();
let snapshot = "";

function key(teamId: string, agentId: string): string {
  return `${teamId}:${agentId}`;
}

function emit() {
  snapshot = [...paused].sort().join("|");
  for (const listener of listeners) listener();
}

export function pauseSnapshot(): string {
  return snapshot;
}

export function isWorkPaused(teamId: string, agentId: string): boolean {
  return paused.has(key(teamId, agentId));
}

/** Returns the next halted state. Nothing outside this set is touched. */
export function toggleWorkPause(teamId: string, agentId: string): boolean {
  const id = key(teamId, agentId);
  const next = !paused.has(id);
  if (next) paused.add(id);
  else paused.delete(id);
  emit();
  return next;
}

export function subscribeWorkPause(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetWorkPauseForTests() {
  paused.clear();
  emit();
}
