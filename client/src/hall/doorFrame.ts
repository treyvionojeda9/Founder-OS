import { doorSpec } from "../design/sprites/doorFaces";

/** Where the open leaf's hole sits, in viewport pixels, after the door has straightened. */
export type DoorFrame = {
  ox: number;
  oy: number;
  scale: number;
  /** Integer reciprocal. The glimpse and the dolly share `scale(1 / glimpseN)`. */
  glimpseN: number;
  pixelScale: number;
  /** Resting hall pose, so the ghost matches the door it returns to. */
  yaw: number;
  z: number;
  drop: number;
  perspective: number;
};

export type FramePoint = { x: number; y: number };

/**
 * offsetLeft collapses toward 0 when a transformed door sits on the left edge.
 * A near-zero axis is only trusted when the painted box agrees; otherwise the
 * visible box is the opening the leaf actually shows.
 */
export function resolveFrameOrigin(
  layout: FramePoint,
  box: { left: number; top: number },
): FramePoint {
  const x = layout.x > 1 ? layout.x : box.left;
  const y = layout.y > 1 ? layout.y : box.top;
  return { x, y };
}

/** Keep the opening rectangle inside the viewport so a left door is not clipped at x≈0. */
export function containOpening(
  ox: number,
  oy: number,
  openingW: number,
  openingH: number,
  viewportW: number,
  viewportH: number,
): FramePoint {
  const halfW = Math.max(0, openingW / 2);
  const halfH = Math.max(0, openingH / 2);
  const maxX = Math.max(halfW, viewportW - halfW);
  const maxY = Math.max(halfH, viewportH - halfH);
  return {
    x: Math.round(Math.min(maxX, Math.max(halfW, ox))),
    y: Math.round(Math.min(maxY, Math.max(halfH, oy))),
  };
}

export function openingScale(openingW: number, openingH: number, viewportW: number, viewportH: number): number {
  const vw = Math.max(1, viewportW);
  const vh = Math.max(1, viewportH);
  return Math.max(0.08, Math.min(openingW / vw, openingH / vh));
}

/**
 * Integer reciprocal for the view through the opening.
 * Half scale, clipped by the door, shows the room. Fitting the whole page
 * (1/6, 1/9, …) shrinks it to a stamp the leaf gap cannot read.
 */
export function glimpseDenominator(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 2;
  const fit = Math.max(1, Math.ceil(1 / raw));
  return Math.min(2, fit);
}

/** Layout origin, ignoring yaw. The straighten beat ends on this point. */
export function layoutOrigin(el: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x: x - window.scrollX, y: y - window.scrollY };
}

function readPose(door: Element | null): { yaw: number; z: number; drop: number; perspective: number } {
  if (!door || typeof window === "undefined") return { yaw: 0, z: 0, drop: 0, perspective: 860 };
  const style = getComputedStyle(door);
  const num = (name: string) => {
    const value = Number.parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : 0;
  };
  const wrap = door.closest(".door-wrap");
  const perspective = wrap ? Number.parseFloat(getComputedStyle(wrap).perspective) : 860;
  return {
    yaw: num("--yaw"),
    z: num("--z"),
    drop: num("--drop"),
    perspective: Number.isFinite(perspective) && perspective > 0 ? Math.round(perspective) : 860,
  };
}

export function frameFromRig(rig: HTMLElement, pixelScale: number): DoorFrame {
  const layout = layoutOrigin(rig);
  const box = rig.getBoundingClientRect();
  const origin = resolveFrameOrigin(layout, { left: box.left, top: box.top });
  const openingW = doorSpec.openingW * pixelScale;
  const openingH = doorSpec.openingH * pixelScale;
  const center = containOpening(
    origin.x + (doorSpec.openingX + doorSpec.openingW / 2) * pixelScale,
    origin.y + (doorSpec.openingY + doorSpec.openingH / 2) * pixelScale,
    openingW,
    openingH,
    window.innerWidth || 800,
    window.innerHeight || 1200,
  );
  const scale = openingScale(openingW, openingH, window.innerWidth, window.innerHeight);
  const pose = readPose(rig.closest(".door"));
  return {
    ox: center.x,
    oy: center.y,
    scale,
    glimpseN: glimpseDenominator(scale),
    pixelScale,
    ...pose,
  };
}

export function fallbackFrame(): DoorFrame {
  const vw = window.innerWidth || 800;
  const vh = window.innerHeight || 1200;
  const scale = 0.2;
  return {
    ox: vw / 2,
    oy: vh / 2,
    scale,
    glimpseN: glimpseDenominator(scale),
    pixelScale: 8,
    yaw: 0,
    z: 0,
    drop: 0,
    perspective: 860,
  };
}
