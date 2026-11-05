import { doorSpec } from "../design/sprites/doorFaces";

/** Where the open leaf's hole sits, in viewport pixels, after the door has straightened. */
export type DoorFrame = {
  ox: number;
  oy: number;
  scale: number;
  /** Integer reciprocal. The glimpse and the dolly share `scale(1 / glimpseN)`. */
  glimpseN: number;
  pixelScale: number;
};

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

export function frameFromRig(rig: HTMLElement, pixelScale: number): DoorFrame {
  const layout = layoutOrigin(rig);
  const box = rig.getBoundingClientRect();
  const origin = layout.x > 1 || layout.y > 1 ? layout : { x: box.left, y: box.top };
  const openingW = doorSpec.openingW * pixelScale;
  const openingH = doorSpec.openingH * pixelScale;
  const scale = openingScale(openingW, openingH, window.innerWidth, window.innerHeight);
  return {
    ox: Math.round(origin.x + (doorSpec.openingX + doorSpec.openingW / 2) * pixelScale),
    oy: Math.round(origin.y + (doorSpec.openingY + doorSpec.openingH / 2) * pixelScale),
    scale,
    glimpseN: glimpseDenominator(scale),
    pixelScale,
  };
}

export function fallbackFrame(): DoorFrame {
  const vw = window.innerWidth || 800;
  const vh = window.innerHeight || 1200;
  const scale = 0.2;
  return { ox: vw / 2, oy: vh / 2, scale, glimpseN: glimpseDenominator(scale), pixelScale: 8 };
}
