/**
 * Quiet / Sound for a space.
 * localStorage only. No samples ship with this build, so Sound stores the pref and stays silent.
 * Nothing here opens a vault.
 */

export const SPACE_SOUND_KEY = "founder-os.space-sound";

export type SpaceSound = "quiet" | "sound";

/** Empty on purpose. Playback waits until a sample exists. */
export const SPACE_SOUND_SAMPLES: readonly string[] = [];

const listeners = new Set<() => void>();

function asSound(value: string | null): SpaceSound {
  return value === "sound" ? "sound" : "quiet";
}

function read(): SpaceSound {
  if (typeof localStorage === "undefined") return "quiet";
  try {
    return asSound(localStorage.getItem(SPACE_SOUND_KEY));
  } catch {
    return "quiet";
  }
}

let memory: SpaceSound = read();

function emit() {
  for (const listener of listeners) listener();
}

export function readSpaceSound(): SpaceSound {
  return memory;
}

export function subscribeSpaceSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadSpaceSound() {
  memory = read();
  emit();
}

export function resetSpaceSoundForTests() {
  memory = "quiet";
  if (typeof localStorage !== "undefined") localStorage.removeItem(SPACE_SOUND_KEY);
  emit();
}

export function writeSpaceSound(next: SpaceSound): SpaceSound {
  const sound = asSound(next);
  memory = sound;
  if (typeof localStorage !== "undefined") localStorage.setItem(SPACE_SOUND_KEY, sound);
  emit();
  return sound;
}

/** True only when Sound is on and a sample is actually available. */
export function spaceSoundPlays(mode: SpaceSound = memory, samples: readonly string[] = SPACE_SOUND_SAMPLES): boolean {
  return mode === "sound" && samples.length > 0;
}

/** Hook for the fixture. With no samples this does not start audio. */
export function audibleSpaceSound(mode: SpaceSound = memory): boolean {
  return spaceSoundPlays(mode);
}
