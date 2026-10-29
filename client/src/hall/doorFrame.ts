import { doorSpec } from "../design/sprites/doorFaces";

/** Where the open leaf's hole sits, in viewport pixels, after the door has straightened. */
export type DoorFrame = {
  ox: number;
  oy: number;
  scale: number;
  pixelScale: number;
};

export function openingScale(openingW: number, openingH: number, viewportW: number, viewportH: number): number {
  const vw = Math.max(1, viewportW);
  const vh = Math.max(1, viewportH);
  return Math.max(0.08, Math.min(openingW / vw, openingH / vh));
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
  return {
    ox: origin.x + (doorSpec.openingX + doorSpec.openingW / 2) * pixelScale,
    oy: origin.y + (doorSpec.openingY + doorSpec.openingH / 2) * pixelScale,
    scale: openingScale(openingW, openingH, window.innerWidth, window.innerHeight),
    pixelScale,
  };
}

export function fallbackFrame(): DoorFrame {
  const vw = window.innerWidth || 800;
  const vh = window.innerHeight || 1200;
  return { ox: vw / 2, oy: vh / 2, scale: 0.2, pixelScale: 8 };
}
