import type { Door } from "../fixtures/doors";

/**
 * Three discrete leaf frames, then the room steps forward from the opening.
 * CSS keyframes treat 40% of ENTER_MS as the end of the swing (SWING_MS / ENTER_MS).
 * The route changes at ENTER_MS. A short settle follows. Whole open stays under 450ms.
 * Reduced motion skips every beat and navigates at once.
 */
export const SWING_MS = 160;
/** Phase change while the room is stepping forward. The hall is still the route. */
export const DOLLY_MS = 280;
export const ENTER_MS = 400;
export const REVEAL_MS = 40;
export const SEQUENCE_MS = ENTER_MS + REVEAL_MS;
/** Reverse: the room steps back, then the leaf shuts. Same budget as the open. */
export const SHUT_MS = 400;

/**
 * Reduced motion and slow updates (e-ink) skip the dolly.
 * The route swaps in one frame instead of a multi-frame approach.
 */
export function prefersStillFrames(reducedMotion: boolean, slowUpdate: boolean): boolean {
  return reducedMotion || slowUpdate;
}

export type DoorPhase = "closed" | "swing" | "dolly";

export type DoorOpenStep = {
  at: number;
  phase: Exclude<DoorPhase, "closed"> | "enter";
};

/**
 * Click schedule. `enter` is the only step that may change the URL, and it is last.
 * Swing and dolly both stay on the hall.
 */
export function doorOpenSchedule(reduceMotion: boolean): readonly DoorOpenStep[] {
  if (reduceMotion) return [{ at: 0, phase: "enter" }];
  return [
    { at: 0, phase: "swing" },
    { at: DOLLY_MS, phase: "dolly" },
    { at: ENTER_MS, phase: "enter" },
  ];
}

export function doorPath(door: Pick<Door, "id" | "section">): string {
  return door.section === "work" ? `/team/${door.id}` : `/learn/${door.id}`;
}

export type PortalKind = "team" | "learn";

/** Team and school doors share one portal. Other paths are not rooms. */
export function roomFromPath(path: string): { kind: PortalKind; id: string } | null {
  const match = /^\/(team|learn)\/([^/?#]+)/.exec(path);
  if (!match) return null;
  const id = decodeURIComponent(match[2]);
  if (!id) return null;
  return { kind: match[1] === "learn" ? "learn" : "team", id };
}
