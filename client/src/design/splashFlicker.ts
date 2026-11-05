import { splashFlameCore, splashFlameLift, splashFlameSettle } from "./sprites/splashFlame";
import type { SpriteGrid } from "./sprites/types";

/** Three discrete pixel frames. Long enough to read, short enough to see on the splash. */
export const SPLASH_FLAME_FRAME_MS = 180;

export const splashFlameFrames: readonly SpriteGrid[] = [splashFlameCore, splashFlameLift, splashFlameSettle];

/** Reduced motion holds the core frame. Otherwise the tick walks 0, 1, 2. */
export function splashFlameIndex(tick: number, still: boolean): number {
  if (still) return 0;
  const count = splashFlameFrames.length;
  const wrapped = Math.trunc(tick) % count;
  return wrapped < 0 ? wrapped + count : wrapped;
}
