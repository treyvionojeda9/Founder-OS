import type { SpriteGrid } from "./types";

/**
 * Source-pixel metrics for the hall door. Every face is an integer grid
 * drawn at the same scale, so the jamb, leaf, and opening stay aligned.
 */
export const doorSpec = {
  frameW: 32,
  frameH: 48,
  depth: 6,
  openingX: 5,
  openingY: 4,
  openingW: 22,
  openingH: 40,
  leafX: 6,
  leafY: 16,
  leafW: 20,
  leafH: 27,
  spring: 16,
} as const;

export const leafLogoSlot = { x: 4, y: 3 } as const;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

function join(rows: string[][]): SpriteGrid {
  return rows.map((row) => row.join(""));
}

function blank(width: number, height: number, fill = "."): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function inArch(x: number, y: number, x0: number, x1: number, spring: number, top: number): boolean {
  if (x < x0 || x > x1 || y < top) return false;
  if (y >= spring) return true;
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = spring - top;
  const dx = (x - cx) / rx;
  const dy = (spring - y) / ry;
  return dx * dx + dy * dy <= 1;
}

function paintFrame(): SpriteGrid {
  const { frameW, frameH, openingX, openingY, openingW, spring } = doorSpec;
  const rows = blank(frameW, frameH);
  const innerX0 = openingX;
  const innerX1 = openingX + openingW - 1;
  const innerTop = openingY;
  const innerBottom = openingY + doorSpec.openingH - 1;
  const outerX0 = innerX0 - 3;
  const outerX1 = innerX1 + 3;

  for (let y = 0; y < frameH; y += 1) {
    for (let x = 0; x < frameW; x += 1) {
      const outer = inArch(x, y, outerX0, outerX1, spring, 1) && y <= innerBottom + 2;
      const inner = inArch(x, y, innerX0, innerX1, spring, innerTop) && y <= innerBottom;
      if (!outer || inner) continue;
      const nearInner =
        inArch(x + 1, y, innerX0, innerX1, spring, innerTop) ||
        inArch(x - 1, y, innerX0, innerX1, spring, innerTop) ||
        inArch(x, y + 1, innerX0, innerX1, spring, innerTop) ||
        inArch(x, y - 1, innerX0, innerX1, spring, innerTop);
      const lit = x <= outerX0 + 1;
      rows[y][x] = nearInner ? "w" : lit ? "w" : "d";
    }
  }

  const key = Math.round((outerX0 + outerX1) / 2);
  if (rows[2]?.[key] && rows[2][key] !== ".") rows[2][key] = "e";
  if (rows[2]?.[key - 1] && rows[2][key - 1] !== ".") rows[2][key - 1] = "f";

  for (let x = outerX0; x <= outerX1; x += 1) {
    if (rows[innerBottom + 1]) rows[innerBottom + 1][x] = x % 4 === 0 ? "e" : "d";
    if (rows[innerBottom + 2]) rows[innerBottom + 2][x] = "d";
  }

  return join(rows);
}

function paintLeaf(): SpriteGrid {
  const { leafW, leafH } = doorSpec;
  const rows = blank(leafW, leafH, "w");
  for (let x = 0; x < leafW; x += 1) {
    rows[0][x] = "d";
    rows[leafH - 1][x] = "d";
  }
  for (let y = 0; y < leafH; y += 1) {
    rows[y][0] = "d";
    rows[y][leafW - 1] = "d";
    if (y % 6 === 2) rows[y][1] = "d";
  }

  const wx = 3;
  const wy = 2;
  const ww = 14;
  const wh = 14;
  for (let y = wy; y < wy + wh; y += 1) {
    for (let x = wx; x < wx + ww; x += 1) {
      const edge = x === wx || y === wy || x === wx + ww - 1 || y === wy + wh - 1;
      rows[y][x] = edge ? "d" : "n";
    }
  }

  const panelTop = wy + wh + 1;
  const mid = Math.floor(leafW / 2);
  for (let y = panelTop; y < leafH - 2; y += 1) {
    rows[y][2] = "d";
    rows[y][mid] = "d";
    rows[y][leafW - 3] = "d";
    if (y === panelTop || y === leafH - 3) {
      for (let x = 2; x < leafW - 2; x += 1) rows[y][x] = "d";
    }
  }

  const knobX = leafW - 4;
  const knobY = panelTop + 3;
  rows[knobY][knobX] = "e";
  rows[knobY][knobX + 1] = "f";
  rows[knobY + 1][knobX] = "d";
  rows[knobY + 1][knobX + 1] = "e";
  return join(rows);
}

function paintLeafBack(): SpriteGrid {
  const { leafW, leafH } = doorSpec;
  const rows = blank(leafW, leafH, "d");
  for (let y = 0; y < leafH; y += 1) {
    for (let x = 0; x < leafW; x += 1) {
      rows[y][x] = x === 0 || y === 0 || x === leafW - 1 || y === leafH - 1 || x % 5 === 0 ? "d" : "w";
    }
  }
  return join(rows);
}

function paintEdge(): SpriteGrid {
  const { depth, leafH } = doorSpec;
  const rows = blank(depth, leafH, "d");
  for (let y = 0; y < leafH; y += 1) {
    rows[y][0] = "d";
    rows[y][depth - 1] = "w";
    if (y % 4 === 0) rows[y][1] = "w";
  }
  return join(rows);
}

function paintJamb(): SpriteGrid {
  const { depth, spring, openingY, openingH } = doorSpec;
  const height = openingY + openingH - spring;
  const rows = blank(depth, height, "d");
  for (let y = 0; y < height; y += 1) {
    rows[y][0] = "d";
    rows[y][depth - 1] = "w";
    if (y % 3 === 0) rows[y][1] = "w";
  }
  return join(rows);
}

function paintInterior(): SpriteGrid {
  const { openingW, openingH } = doorSpec;
  const rows = blank(openingW, openingH, "n");
  for (let y = 0; y < openingH; y += 1) {
    for (let x = 0; x < openingW; x += 1) {
      if ((x + y) % 7 === 0) rows[y][x] = "s";
    }
  }
  return join(rows);
}

/** Stepped flame, ember, then wood. The gap shows light, not a Bayer checker. */
function paintSpill(): SpriteGrid {
  const { openingW, openingH } = doorSpec;
  const rows = blank(openingW, openingH, ".");
  const cx = (openingW - 1) / 2;
  const cy = (openingH - 1) / 2;
  for (let y = 0; y < openingH; y += 1) {
    for (let x = 0; x < openingW; x += 1) {
      const dx = (x - cx) / (cx * 0.98);
      const dy = (y - cy) / (cy * 0.98);
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 1) continue;
      if (r < 0.34) rows[y][x] = "f";
      else if (r < 0.66) rows[y][x] = "e";
      else rows[y][x] = "w";
    }
  }
  return join(rows);
}

/** Concentric flame, ember, and wood. `shift` pulls the second frame in a step. */
function paintPool(shift: number): SpriteGrid {
  const width = 48;
  const height = 22;
  const rows = blank(width, height);
  const cx = (width - 1) / 2;
  const cy = height - 1;
  const tighten = shift > 0 ? 0.08 : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - cx) / (width * 0.5);
      const dy = (y - cy) / (height * 1.05);
      const r = Math.sqrt(dx * dx + dy * dy) + tighten;
      if (r > 1) continue;
      if (r < 0.3) rows[y][x] = "f";
      else if (r < 0.58) rows[y][x] = "e";
      else if (r < 0.84) rows[y][x] = "w";
    }
  }
  return join(rows);
}

function paintContact(): SpriteGrid {
  const width = 28;
  const height = 6;
  const rows = blank(width, height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - cx) / (width * 0.5);
      const dy = (y - cy) / (height * 0.5);
      const r = Math.sqrt(dx * dx + dy * dy);
      const thresh = BAYER[y % 4][x % 4];
      if (r > 1) continue;
      if (r < 0.45) rows[y][x] = thresh < 10 ? "s" : "d";
      else if (r < 0.75) rows[y][x] = thresh < 6 ? "s" : ".";
      else rows[y][x] = thresh < 3 ? "s" : ".";
    }
  }
  return join(rows);
}

function paintWash(): SpriteGrid {
  const { frameW, frameH } = doorSpec;
  const rows = blank(frameW, frameH, "e");
  const cx = (frameW - 1) / 2;
  const cy = (frameH - 1) / 2;
  for (let y = 0; y < frameH; y += 1) {
    for (let x = 0; x < frameW; x += 1) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const thresh = BAYER[y % 4][x % 4];
      if (r < 0.45) rows[y][x] = thresh < 9 ? "f" : "e";
      else if (r < 0.8) rows[y][x] = thresh < 5 ? "f" : "e";
      else rows[y][x] = thresh < 8 ? "e" : "w";
    }
  }
  return join(rows);
}

function paintSide(): SpriteGrid {
  const { depth, frameH, spring } = doorSpec;
  const height = frameH - spring;
  const rows = blank(depth, height, "d");
  for (let y = 0; y < height; y += 1) {
    rows[y][0] = "d";
    if (depth > 2) rows[y][1] = y % 2 === 0 ? "w" : "d";
    rows[y][depth - 1] = "w";
  }
  return join(rows);
}

export const doorFrame = paintFrame();
export const doorLeaf = paintLeaf();
export const doorLeafBack = paintLeafBack();
export const doorLeafEdge = paintEdge();
export const doorJamb = paintJamb();
export const doorInterior = paintInterior();
export const doorSpill = paintSpill();
export const lightPoolA = paintPool(0);
export const lightPoolB = paintPool(2);
export const contactShadow = paintContact();
export const doorWash = paintWash();
export const doorSide = paintSide();

export const jambHeight = doorSpec.openingY + doorSpec.openingH - doorSpec.spring;
export const sideHeight = doorSpec.frameH - doorSpec.spring;
