import { founderEmber, schoolAccent } from "../design/palette";

/**
 * Work and School are separate spaces.
 * Work keeps Founder Ember: night walls, wood floor, round ember pools, a round vignette.
 * School keeps that structure and lays a school-accent wash in straight shafts and a desk band.
 * The shapes differ in luminance, so grayscale still separates them.
 * No vault, no audio.
 */

export type SpaceId = "work" | "school";
export type SpacePattern = "pools" | "shafts" | "band";

export const SPACE_COLS = 60;
export const SPACE_ROWS = 40;
export const SPACE_FADE_MS = 240;
export const SPACE_FADE_FRAMES = 4;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

type RGB = { r: number; g: number; b: number };

function parse(hex: string): RGB {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

const NIGHT = parse(founderEmber.night);
const SLATE = parse(founderEmber.slate);
const WOOD = parse(founderEmber.wood);
const DARK = parse(founderEmber.darkwood);
const EMBER = parse(founderEmber.ember);
const FLAME = parse(founderEmber.flame);
const SKY = parse(schoolAccent.sky);
const NAVY = parse(schoolAccent.navy);
const SCHOOL = parse(schoolAccent.schoolSlate);
const INK = parse(schoolAccent.ink);

const EMBER_HEX = new Set(Object.values(founderEmber).map((hex) => hex.toLowerCase()));
const SCHOOL_HEX = new Set(Object.values(schoolAccent).map((hex) => hex.toLowerCase()));

export function spaceSwapFrames(still: boolean): number {
  return still ? 1 : SPACE_FADE_FRAMES;
}

export function wallPattern(space: SpaceId): SpacePattern {
  return space === "school" ? "shafts" : "pools";
}

export function deskPattern(space: SpaceId): SpacePattern {
  return space === "school" ? "band" : "pools";
}

export function channelLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function put(buf: Uint8ClampedArray, cols: number, x: number, y: number, color: RGB, alpha = 255) {
  const i = (y * cols + x) * 4;
  buf[i] = color.r;
  buf[i + 1] = color.g;
  buf[i + 2] = color.b;
  buf[i + 3] = alpha;
}

function same(buf: Uint8ClampedArray, i: number, color: RGB): boolean {
  return buf[i] === color.r && buf[i + 1] === color.g && buf[i + 2] === color.b && buf[i + 3] === 255;
}

function threshAt(x: number, y: number): number {
  return BAYER[y % 4][x % 4];
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = (x + 0.5 - cx) / rx;
  const dy = (y + 0.5 - cy) / ry;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Full hall: pixel night walls, floor boards, space light, then a vignette. */
export function paintSpaceBackdrop(space: SpaceId, cols = SPACE_COLS, rows = SPACE_ROWS): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(cols * rows * 4);
  const wallEnd = Math.round(rows * 0.62);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const wall = y < wallEnd;
      const thresh = threshAt(x, y);
      let color = wall ? NIGHT : WOOD;
      if (wall && x % 12 === 0) color = SLATE;
      if (!wall && y % 5 === 0) color = DARK;
      color = space === "work" ? workLight(x, y, cols, rows, wallEnd, thresh, color) : schoolLight(x, y, cols, wallEnd, thresh, color);
      color = vignette(space, x, y, cols, rows, thresh, color);
      put(buf, cols, x, y, color);
    }
  }
  return buf;
}

function workLight(
  x: number,
  y: number,
  cols: number,
  rows: number,
  wallEnd: number,
  thresh: number,
  color: RGB,
): RGB {
  const pools = [
    { cx: cols * 0.34, cy: wallEnd + (rows - wallEnd) * 0.55, rx: 8, ry: 5 },
    { cx: cols * 0.68, cy: wallEnd + (rows - wallEnd) * 0.62, rx: 7, ry: 4.5 },
  ];
  for (const pool of pools) {
    const radius = inEllipse(x, y, pool.cx, pool.cy, pool.rx, pool.ry);
    if (radius > 1 || y < wallEnd) continue;
    if (radius < 0.38) return FLAME;
    if (radius < 0.72) return thresh < 8 ? FLAME : EMBER;
    return thresh < 4 ? EMBER : color;
  }
  return color;
}

function schoolLight(x: number, y: number, cols: number, wallEnd: number, thresh: number, color: RGB): RGB {
  const shafts = [
    [Math.floor(cols * 0.2), Math.floor(cols * 0.32)],
    [Math.floor(cols * 0.62), Math.floor(cols * 0.76)],
  ];
  const inShaft = shafts.some(([x0, x1]) => x >= x0 && x <= x1);
  const deskBand = y >= wallEnd - 2 && y <= wallEnd + 1;
  if (deskBand && x > 4 && x < cols - 5) return thresh < 8 ? SKY : NAVY;
  if (y < wallEnd && inShaft) {
    if (thresh < 8) return SKY;
    if (thresh < 12) return NAVY;
    return SCHOOL;
  }
  if (y >= wallEnd && inShaft) return thresh < 8 ? NAVY : INK;
  return color;
}

function vignette(space: SpaceId, x: number, y: number, cols: number, rows: number, thresh: number, color: RGB): RGB {
  if (space === "school") {
    const corner = (x < 5 || x >= cols - 5) && (y < 5 || y >= rows - 5);
    return corner ? (thresh < 8 ? INK : NIGHT) : color;
  }
  const dx = (x + 0.5 - cols / 2) / (cols / 2);
  const dy = (y + 0.5 - rows / 2) / (rows / 2);
  const radius = Math.hypot(dx, dy);
  if (radius > 0.93) return thresh < 8 ? NIGHT : DARK;
  return color;
}

/** Light on a room wall. Unlit cells stay clear so the plaster tile shows through. */
export function paintWallWash(space: SpaceId, cols = 48, rows = 32): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(cols * rows * 4);
  if (space === "work") {
    const cx = cols * 0.5;
    const cy = rows * 0.46;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const radius = inEllipse(x, y, cx, cy, cols * 0.22, rows * 0.28);
        if (radius > 1) continue;
        const thresh = threshAt(x, y);
        put(buf, cols, x, y, radius < 0.45 ? FLAME : thresh < 8 ? FLAME : EMBER);
      }
    }
    return buf;
  }
  const shafts = [
    [Math.floor(cols * 0.18), Math.floor(cols * 0.34)],
    [Math.floor(cols * 0.62), Math.floor(cols * 0.8)],
  ];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!shafts.some(([x0, x1]) => x >= x0 && x <= x1)) continue;
      const thresh = threshAt(x, y);
      put(buf, cols, x, y, thresh < 8 ? SKY : thresh < 12 ? NAVY : SCHOOL);
    }
  }
  return buf;
}

/** Light on a desk top. Work is a pool. School is a full-width cool band. */
export function paintDeskWash(space: SpaceId, cols = 48, rows = 16): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(cols * rows * 4);
  if (space === "work") {
    const cx = cols * 0.42;
    const cy = rows * 0.58;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const radius = inEllipse(x, y, cx, cy, cols * 0.28, rows * 0.42);
        if (radius > 1) continue;
        const thresh = threshAt(x, y);
        put(buf, cols, x, y, radius < 0.4 ? FLAME : thresh < 6 ? EMBER : FLAME);
      }
    }
    return buf;
  }
  const y0 = Math.floor(rows * 0.35);
  const y1 = Math.ceil(rows * 0.7);
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      put(buf, cols, x, y, threshAt(x, y) < 8 ? SKY : NAVY);
    }
  }
  return buf;
}

export function countHex(buf: Uint8ClampedArray, hex: string): number {
  const color = parse(hex);
  let count = 0;
  for (let i = 0; i < buf.length; i += 4) {
    if (same(buf, i, color)) count += 1;
  }
  return count;
}

export function hexesUsed(buf: Uint8ClampedArray): string[] {
  const found = new Set<string>();
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    const hex = `#${[buf[i], buf[i + 1], buf[i + 2]].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
    found.add(hex);
  }
  return [...found];
}

export function staysInPalette(buf: Uint8ClampedArray, space: SpaceId): boolean {
  return hexesUsed(buf).every((hex) => EMBER_HEX.has(hex) || (space === "school" && SCHOOL_HEX.has(hex)));
}

export type SpaceRead = {
  schoolAccent: number;
  brightFloor: number;
  shaftColumns: number;
};

/** Luminance-only read of a hall backdrop. Pools are bright floor spots. Shafts are mid-gray wall columns. */
export function readBackdrop(buf: Uint8ClampedArray, cols = SPACE_COLS, rows = SPACE_ROWS): SpaceRead {
  const wallEnd = Math.round(rows * 0.62);
  let schoolAccent = 0;
  let brightFloor = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const hex = `#${[buf[i], buf[i + 1], buf[i + 2]].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
    if (SCHOOL_HEX.has(hex) && buf[i + 3] === 255) schoolAccent += 1;
    const y = Math.floor(i / 4 / cols);
    const luma = channelLuma(buf[i], buf[i + 1], buf[i + 2]);
    if (y >= wallEnd && luma >= 140 && buf[i + 3] === 255) brightFloor += 1;
  }
  let shaftColumns = 0;
  for (let x = 0; x < cols; x += 1) {
    let mid = 0;
    const span = wallEnd - 2;
    for (let y = 0; y < span; y += 1) {
      const i = (y * cols + x) * 4;
      const luma = channelLuma(buf[i], buf[i + 1], buf[i + 2]);
      if (luma >= 70 && luma <= 130) mid += 1;
    }
    if (span > 0 && mid / span >= 0.65) shaftColumns += 1;
  }
  return { schoolAccent, brightFloor, shaftColumns };
}

export function wallWashIsPools(buf: Uint8ClampedArray, cols: number): boolean {
  let bright = 0;
  let shafts = 0;
  const rows = buf.length / 4 / cols;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    if (channelLuma(buf[i], buf[i + 1], buf[i + 2]) >= 140) bright += 1;
  }
  for (let x = 0; x < cols; x += 1) {
    let mid = 0;
    for (let y = 0; y < rows; y += 1) {
      const i = (y * cols + x) * 4;
      if (buf[i + 3] === 0) continue;
      const luma = channelLuma(buf[i], buf[i + 1], buf[i + 2]);
      if (luma >= 70 && luma <= 130) mid += 1;
    }
    if (mid / rows >= 0.65) shafts += 1;
  }
  return bright > 12 && shafts === 0;
}

export function wallWashIsShafts(buf: Uint8ClampedArray, cols: number): boolean {
  let bright = 0;
  let shafts = 0;
  const rows = buf.length / 4 / cols;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    if (channelLuma(buf[i], buf[i + 1], buf[i + 2]) >= 140) bright += 1;
  }
  for (let x = 0; x < cols; x += 1) {
    let mid = 0;
    for (let y = 0; y < rows; y += 1) {
      const i = (y * cols + x) * 4;
      if (buf[i + 3] === 0) continue;
      const luma = channelLuma(buf[i], buf[i + 1], buf[i + 2]);
      if (luma >= 70 && luma <= 130) mid += 1;
    }
    if (mid / rows >= 0.65) shafts += 1;
  }
  return bright === 0 && shafts >= 6;
}

/** A school desk band fills at least one row. A work pool does not. */
export function deskBandRows(buf: Uint8ClampedArray, cols: number): number {
  const rows = buf.length / 4 / cols;
  let bands = 0;
  for (let y = 0; y < rows; y += 1) {
    let filled = 0;
    let cool = 0;
    for (let x = 0; x < cols; x += 1) {
      const i = (y * cols + x) * 4;
      if (buf[i + 3] !== 255) continue;
      filled += 1;
      const luma = channelLuma(buf[i], buf[i + 1], buf[i + 2]);
      if (luma < 120) cool += 1;
    }
    if (filled === cols && cool === cols) bands += 1;
  }
  return bands;
}

export function blitPixels(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray, cols: number, rows: number): boolean {
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const source = off.getContext("2d");
  if (!source) return false;
  const image = source.createImageData(cols, rows);
  image.data.set(pixels);
  source.putImageData(image, 0, 0);
  return blitSource(canvas, off, cols, rows, "");
}

const layerSource = new Map<string, HTMLCanvasElement>();

function sourceFor(space: SpaceId, kind: "hall" | "wall" | "desk"): { canvas: HTMLCanvasElement; cols: number; rows: number } | null {
  const key = `${kind}:${space}`;
  const hit = layerSource.get(key);
  if (hit) {
    return { canvas: hit, cols: hit.width, rows: hit.height };
  }
  const pixels = kind === "wall" ? paintWallWash(space) : kind === "desk" ? paintDeskWash(space) : paintSpaceBackdrop(space);
  const cols = kind === "hall" ? SPACE_COLS : 48;
  const rows = kind === "wall" ? 32 : kind === "desk" ? 16 : SPACE_ROWS;
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const source = off.getContext("2d");
  if (!source) return null;
  const image = source.createImageData(cols, rows);
  image.data.set(pixels);
  source.putImageData(image, 0, 0);
  layerSource.set(key, off);
  return { canvas: off, cols, rows };
}

function blitSource(
  canvas: HTMLCanvasElement,
  source: HTMLCanvasElement,
  cols: number,
  rows: number,
  stampKey: string,
): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const parent = canvas.parentElement;
  const width = Math.max(1, Math.round(parent?.clientWidth || canvas.clientWidth || cols));
  const height = Math.max(1, Math.round(parent?.clientHeight || canvas.clientHeight || rows));
  if (width < 2 || height < 2) return false;
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const targetW = width * dpr;
  const targetH = height * dpr;
  const stamp = stampKey ? `${stampKey}:${targetW}x${targetH}` : "";
  if (stamp && canvas.dataset.blit === stamp && canvas.width === targetW && canvas.height === targetH) return true;
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(source, 0, 0, targetW, targetH);
  if (stamp) canvas.dataset.blit = stamp;
  return true;
}

/**
 * Hall, wall, and desk washes. The small source is built once, then scaled into the
 * element with nearest-neighbor. CSS stretch of that source is not the same stipple
 * once the viewport is not an integer multiple of the grid, so the backing store
 * stays at device resolution.
 */
export function paintSpaceLayer(canvas: HTMLCanvasElement, space: SpaceId, kind: "hall" | "wall" | "desk" = "hall"): boolean {
  const src = sourceFor(space, kind);
  if (!src) return false;
  return blitSource(canvas, src.canvas, src.cols, src.rows, `${kind}:${space}`);
}
