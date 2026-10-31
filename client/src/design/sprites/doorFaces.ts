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
  const front: boolean[][] = Array.from({ length: frameH }, () => Array<boolean>(frameW).fill(false));
  const hole: boolean[][] = Array.from({ length: frameH }, () => Array<boolean>(frameW).fill(false));

  for (let y = 0; y < frameH; y += 1) {
    for (let x = 0; x < frameW; x += 1) {
      const outer = inArch(x, y, outerX0, outerX1, spring, 1) && y <= innerBottom + 2;
      const inner = inArch(x, y, innerX0, innerX1, spring, innerTop) && y <= innerBottom;
      if (inner) hole[y][x] = true;
      if (outer && !inner) front[y][x] = true;
    }
  }

  for (let y = 0; y < frameH; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < frameW; x += 1) {
      if (!front[y][x]) continue;
      if (left < 0) left = x;
      right = x;
    }
    if (left < 0 || right < 0) continue;
    for (let x = left; x <= right; x += 1) {
      if (!front[y][x]) continue;
      const fromLeft = x - left;
      const fromRight = right - x;
      const nearHole = Boolean(hole[y]?.[x - 1] || hole[y]?.[x + 1] || hole[y - 1]?.[x] || hole[y + 1]?.[x]);
      if (fromLeft === 0) rows[y][x] = "f";
      else if (fromLeft === 1 && fromRight > 2) rows[y][x] = "e";
      else if (fromRight <= 2 || nearHole) rows[y][x] = "d";
      else rows[y][x] = "w";
    }
    for (let k = 1; k <= 2; k += 1) {
      const x = right + k;
      if (x < frameW && !front[y][x] && !hole[y][x]) rows[y][x] = "d";
    }
  }

  for (let y = 0; y < frameH; y += 1) {
    for (let x = 0; x < frameW; x += 1) {
      if (!hole[y][x]) continue;
      const lip = x === innerX0 || x === innerX1 || !hole[y - 1]?.[x] || !hole[y + 1]?.[x];
      if (lip) rows[y][x] = "d";
    }
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
  for (let y = 0; y < leafH; y += 1) {
    rows[y][0] = "e";
    if (rows[y][1] === "d") rows[y][1] = "w";
    rows[y][leafW - 2] = "d";
    rows[y][leafW - 1] = "d";
  }
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
    if (depth > 2) rows[y][1] = "w";
    rows[y][depth - 1] = y % 3 === 0 ? "f" : "e";
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

/** Night void. The frame's darkwood lip is the recessed reveal in front of this. */
function paintInterior(): SpriteGrid {
  const { openingW, openingH } = doorSpec;
  return join(blank(openingW, openingH, "n"));
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

/** Cells of pad around the frame. The sprite's door sits at this origin. */
export const doorGlowPad = { x: 3, top: 6 } as const;

/**
 * Solid flame, then ember, hugging the arch. Wider above the crown,
 * a short step at the sides. No wood, no Bayer, no filled semicircle.
 * `shift` pulls the second frame in by one step.
 */
function paintPool(shift: number): SpriteGrid {
  const mask = paintFrame().map((row) => [...row].map((ch) => ch !== "."));
  const frameH = mask.length;
  const frameW = mask[0]?.length ?? 0;
  const { x: padX, top: padTop } = doorGlowPad;
  const width = frameW + padX * 2;
  const height = frameH + padTop;
  const rows = blank(width, height);
  const edge: { x: number; y: number }[] = [];
  for (let y = 0; y < frameH; y += 1) {
    for (let x = 0; x < frameW; x += 1) {
      if (!mask[y][x]) continue;
      const rim = !mask[y - 1]?.[x] || !mask[y + 1]?.[x] || !mask[y]?.[x - 1] || !mask[y]?.[x + 1];
      if (rim) edge.push({ x: x + padX, y: y + padTop });
    }
  }
  const outerX0 = doorSpec.openingX - 3;
  const outerX1 = doorSpec.openingX + doorSpec.openingW - 1 + 3;
  const outerBottom = doorSpec.openingY + doorSpec.openingH + 1;
  const tighten = shift > 0 ? 0.7 : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const fx = x - padX;
      const fy = y - padTop;
      if (fy > outerBottom) continue;
      if (fy >= 0 && fy < frameH && fx >= 0 && fx < frameW && mask[fy][fx]) continue;
      if (fy >= 0 && inArch(fx, fy, outerX0, outerX1, doorSpec.spring, 1)) continue;
      let best = 99;
      for (const cell of edge) {
        const dx = x - cell.x;
        const dy = y - cell.y;
        if (dx > 6 || dx < -6 || dy > 6 || dy < -6) continue;
        const d = Math.hypot(dx, dy);
        if (d < best) best = d;
      }
      const d = best + tighten;
      const spring = doorSpec.spring;
      if (fy < spring) {
        if (d <= 1.4) rows[y][x] = "f";
        else if (d <= 3.5) rows[y][x] = "e";
      } else if (fy < spring + 12 && d <= 2.1) {
        rows[y][x] = d <= 1.15 ? "f" : "e";
      } else if (fy < outerBottom - 8 && d <= 1.45) {
        rows[y][x] = "e";
      }
    }
  }
  return join(rows);
}

/**
 * Short stepped contact under the sill. Narrower than the door so the
 * arch floats in the night instead of standing on a floor.
 */
function paintContact(): SpriteGrid {
  const width = 16;
  const height = 4;
  const rows = blank(width, height);
  const reach = [3, 6, 7, 4];
  const cx = (width - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.abs(x - cx) > reach[y]) continue;
      rows[y][x] = y < 2 ? "d" : "s";
    }
  }
  return join(rows);
}

/** Small ember pool under the contact, same stepped shape, no wood. */
function paintFoot(): SpriteGrid {
  const width = 20;
  const height = 3;
  const rows = blank(width, height);
  const reach = [3, 8, 5];
  const cx = (width - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.abs(x - cx) > reach[y]) continue;
      rows[y][x] = y === 0 && Math.abs(x - cx) <= 1 ? "f" : "e";
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

/**
 * Nearest-neighbor hinge swing. The front face keeps whole pixels and the
 * edge face steps out; empty cells on the right are the gap.
 */
function projectLeaf(frontColumns: number, edgeColumns: number): SpriteGrid {
  const front = paintLeaf();
  const edge = paintEdge();
  const height = front.length;
  const width = front[0]?.length ?? 0;
  const edgeW = edge[0]?.length ?? 1;
  const rows = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < frontColumns && x < width; x += 1) {
      const src = Math.min(width - 1, Math.floor((x * width) / frontColumns));
      rows[y][x] = front[y]?.[src] ?? "w";
    }
    for (let e = 0; e < edgeColumns; e += 1) {
      const x = frontColumns + e;
      if (x >= width) break;
      const src = Math.min(edgeW - 1, Math.floor((e * edgeW) / edgeColumns));
      rows[y][x] = edge[y]?.[src] ?? "d";
    }
  }
  return join(rows);
}

export const doorFrame = paintFrame();
export const doorLeaf = paintLeaf();
export const doorLeafAjar = projectLeaf(14, 3);
export const doorLeafOpen = projectLeaf(5, 5);
export const doorLeafBack = paintLeafBack();
export const doorLeafEdge = paintEdge();
export const doorJamb = paintJamb();
export const doorInterior = paintInterior();
export const doorSpill = paintSpill();
export const lightPoolA = paintPool(0);
export const lightPoolB = paintPool(2);
export const contactShadow = paintContact();
export const footGlow = paintFoot();
export const doorWash = paintWash();
export const doorSide = paintSide();

export const jambHeight = doorSpec.openingY + doorSpec.openingH - doorSpec.spring;
export const sideHeight = doorSpec.frameH - doorSpec.spring;
