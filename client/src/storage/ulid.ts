const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Crockford ULID: 10 time chars + 16 random chars. */
export function ulid(now = Date.now()): string {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i += 1) {
    time = ENCODING[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let random = "";
  for (let i = 0; i < 16; i += 1) {
    random += ENCODING[bytes[i] & 31];
  }
  return time + random;
}

export function createHumanNoteId(now?: number): string {
  return `HN-${ulid(now)}`;
}

export function createMachineNoteId(now?: number): string {
  return `MN-${ulid(now)}`;
}
