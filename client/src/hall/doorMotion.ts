import type { Door } from "../fixtures/doors";

/**
 * Leaf swing, then the doorway dollies forward, then the route changes.
 * The crossfade finishes REVEAL_MS after the route changes.
 * Reduced motion skips every beat and navigates at once.
 */
export const DOLLY_MS = 300;
export const ENTER_MS = 720;
export const REVEAL_MS = 180;
export const SEQUENCE_MS = ENTER_MS + REVEAL_MS;

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
