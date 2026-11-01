import { founderEmber } from "../design/palette";
import type { FormFactor } from "../hooks/useFormFactor";

/** The pointer must stay off the top bar before the wood recedes. */
export const CHROME_LEAVE_MS = 400;

/** Restore lands inside two frames at 60Hz. The dim eases across four. */
export const CHROME_RESTORE_MS = 32;
export const CHROME_DIM_MS = 160;

export type ChromePose = "full" | "dim";
export type ChromeInput = "pointer" | "tap";
export type ChromeZone = "top" | "control" | "room" | "other";

export type RecedeEvent =
  | { type: "arrive" }
  | { type: "enter" }
  | { type: "leave"; at: number }
  | { type: "tick"; at: number }
  | { type: "tap-room" }
  | { type: "tap-chrome" };

export type RecedeState = {
  pose: ChromePose;
  pendingLeaveAt: number | null;
};

export function initialRecede(): RecedeState {
  return { pose: "full", pendingLeaveAt: null };
}

/**
 * Desktop dims only after the pointer has been off the top bar for 400ms.
 * A tablet tap on the room dims. A tap on a chrome control restores.
 * Arrival always starts full, so a new room does not open already faded.
 */
export function reduceRecede(state: RecedeState, event: RecedeEvent, input: ChromeInput): RecedeState {
  if (event.type === "arrive") return initialRecede();
  if (input === "pointer") {
    if (event.type === "enter") return { pose: "full", pendingLeaveAt: null };
    if (event.type === "leave") return { pose: state.pose, pendingLeaveAt: event.at };
    if (event.type === "tick") {
      if (state.pendingLeaveAt === null) return state;
      if (event.at - state.pendingLeaveAt < CHROME_LEAVE_MS) return state;
      return { pose: "dim", pendingLeaveAt: null };
    }
    return state;
  }
  if (event.type === "tap-room") return { pose: "dim", pendingLeaveAt: null };
  if (event.type === "tap-chrome") return { pose: "full", pendingLeaveAt: null };
  return state;
}

/** Fine-pointer desktop tracks the pointer. Tablet portrait and landscape use taps. */
export function chromeInputForLayout(layout: FormFactor): ChromeInput {
  return layout === "desktop" ? "pointer" : "tap";
}

/** Reduced motion snaps in one frame. Motion may use two. */
export function chromeFrames(still: boolean): 1 | 2 {
  return still ? 1 : 2;
}

export function chromeTransitionMs(pose: ChromePose, still: boolean): number {
  if (still) return 0;
  return pose === "full" ? CHROME_RESTORE_MS : CHROME_DIM_MS;
}

/**
 * Dim ink stays inside Founder Ember.
 * Paper on night is the readable pair. The outline is paper, so a gray
 * screen can find the label without ember or flame.
 */
export const dimChrome = {
  ground: founderEmber.night,
  label: founderEmber.paper,
  outline: founderEmber.paper,
  selected: founderEmber.ember,
  selectedInk: founderEmber.night,
} as const;

/** The mail mouth never drops out with the bar. */
export const MAIL_MOUTH_OPACITY = 1;

export function luma(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function chromeZone(target: EventTarget | null): ChromeZone {
  if (!(target instanceof Element)) return "other";
  if (target.closest(".command-ledger")) return "other";
  if (target.closest(".pixel-bar")) return "top";
  if (target.closest(".toggle-dock")) return "control";
  if (target.closest(".hall, .study, .stub, .design")) return "room";
  return "other";
}
