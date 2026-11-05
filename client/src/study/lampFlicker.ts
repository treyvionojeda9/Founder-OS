import { deskLampFlickerDip, deskLampFlickerLift, deskLampOn } from "../design/sprites/deskLamp";
import type { SpriteGrid } from "../design/sprites/types";

/** One step of the working-lamp cycle. Five steps make the full loop. */
export const LAMP_FLICKER_FRAME_MS = 220;

/** Mostly the lit lamp. A short lift, back to rest, a short dip. Not a strobe. */
export const LAMP_FLICKER_CYCLE_MS = LAMP_FLICKER_FRAME_MS * 5;

export const LAMP_FLICKER_PATTERN = [0, 0, 1, 0, 2] as const;

export const lampFlickerFrames: readonly SpriteGrid[] = [deskLampOn, deskLampFlickerLift, deskLampFlickerDip];

/** Reduced motion and e-ink hold the lit frame. Otherwise the pattern walks 0, 0, 1, 0, 2. */
export function lampFlickerIndex(tick: number, still: boolean): number {
  if (still) return 0;
  const count = LAMP_FLICKER_PATTERN.length;
  const wrapped = Math.trunc(tick) % count;
  const step = wrapped < 0 ? wrapped + count : wrapped;
  return LAMP_FLICKER_PATTERN[step] ?? 0;
}

/** Which art frame is showing at this point in the cycle. */
export function lampFlickerSlot(elapsedMs: number, still: boolean): number {
  if (still) return 0;
  const tick = Math.floor(elapsedMs / LAMP_FLICKER_FRAME_MS);
  return lampFlickerIndex(tick, false);
}
