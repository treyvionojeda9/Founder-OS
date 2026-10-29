import type { Door } from "../fixtures/doors";
import type { FormFactor } from "../hooks/useFormFactor";

export type DoorPose = {
  /** Degrees. Positive turns a left-hand door toward center. */
  yaw: number;
  /** Pixels. Negative sits further from the camera. */
  z: number;
  /** Pixels. Outer doors drop slightly so the row reads as an arc. */
  drop: number;
};

/** One door stands alone. Two stand side by side. Three or more arc. */
export function doorPose(index: number, count: number): DoorPose {
  if (count < 3 || count <= 0) return { yaw: 0, z: 0, drop: 0 };
  const mid = (count - 1) / 2;
  const t = (index - mid) / mid;
  const mag = Math.abs(t);
  return {
    yaw: -Math.round(t * 28) || 0,
    z: -Math.round(mag * 120) || 0,
    drop: Math.round(mag * 10) || 0,
  };
}

/**
 * Integer sprite scale. One and two doors are a full 2× the old ×4 sprite.
 * Three on a portrait tablet step down one notch so the arc still has room.
 */
export function doorPixelScale(layout: FormFactor, count: number): number {
  if (count <= 1) return 10;
  if (count === 2) return 8;
  if (layout === "portrait") return 7;
  return 8;
}

/** `?count=1` and `?count=2` are hall previews for the stage layout. */
export function doorsForSearch(all: readonly Door[], search: string): Door[] {
  const count = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("count");
  const work = all.filter((door) => door.section === "work");
  if (count === "1") return work.slice(0, 1);
  if (count === "2") return work.slice(0, 2);
  return [...all];
}
