import type { Door } from "../fixtures/doors";

/** Ajar frame, then the doorway comes forward, then the route may change. */
export const AJAR_MS = 560;
export const ENTER_MS = 1560;

export type DoorPhase = "closed" | "ajar" | "through";

export type DoorOpenStep = {
  at: number;
  phase: Exclude<DoorPhase, "closed"> | "enter";
};

/**
 * Click schedule. Reduced motion skips the hall animation and navigates at once.
 * `enter` is the only step that may change the URL, and it is last.
 */
export function doorOpenSchedule(reduceMotion: boolean): readonly DoorOpenStep[] {
  if (reduceMotion) return [{ at: 0, phase: "enter" }];
  return [
    { at: 0, phase: "ajar" },
    { at: AJAR_MS, phase: "through" },
    { at: ENTER_MS, phase: "enter" },
  ];
}

export function doorPath(door: Pick<Door, "id" | "section">): string {
  return door.section === "work" ? `/team/${door.id}` : `/learn/${door.id}`;
}
