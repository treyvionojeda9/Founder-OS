import { paletteByChar } from "./palette";
import { assertSpriteGrid } from "./spriteGrid";
import type { SpriteGrid } from "./sprites/types";

export type SpriteLayer = {
  rows: SpriteGrid;
  x: number;
  y: number;
};

/** Same array every render. A fresh `[]` default would repaint every sprite on each parent render. */
export const NO_LAYERS: readonly SpriteLayer[] = [];

const gridIds = new WeakMap<SpriteGrid, number>();
let nextGridId = 1;
const rasterCache = new Map<string, HTMLCanvasElement>();

function gridId(rows: SpriteGrid): number {
  const known = gridIds.get(rows);
  if (known) return known;
  const id = nextGridId;
  nextGridId += 1;
  gridIds.set(rows, id);
  return id;
}

function rasterKey(rows: SpriteGrid, layers: readonly SpriteLayer[]): string {
  const layerKey = layers.map((layer) => `${layer.x},${layer.y},${gridId(layer.rows)}`).join("|");
  return `${gridId(rows)}|${layerKey}`;
}

function paintGrid(
  ctx: CanvasRenderingContext2D,
  rows: SpriteGrid,
  originX: number,
  originY: number,
  scale: number,
) {
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const color = paletteByChar[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect((originX + x) * scale, (originY + y) * scale, scale, scale);
    }
  }
}

function raster(rows: SpriteGrid, layers: readonly SpriteLayer[]): HTMLCanvasElement | null {
  const key = rasterKey(rows, layers);
  const hit = rasterCache.get(key);
  if (hit) return hit;
  const cols = rows[0].length;
  const height = rows.length;
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = height;
  const ctx = off.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  paintGrid(ctx, rows, 0, 0, 1);
  for (const layer of layers) paintGrid(ctx, layer.rows, layer.x, layer.y, 1);
  rasterCache.set(key, off);
  return off;
}

/**
 * Draw one source pixel per grid cell. CSS scales it by an integer (`image-rendering: pixelated`),
 * so the backing store stays the grid instead of grid × scale × device pixel ratio.
 */
export function paintSpriteCanvas(
  canvas: HTMLCanvasElement,
  rows: SpriteGrid,
  scale: number,
  layers: readonly SpriteLayer[] = NO_LAYERS,
) {
  assertSpriteGrid(rows);
  for (const layer of layers) assertSpriteGrid(layer.rows);
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error("Sprite scale must be a positive integer");
  }
  const cols = rows[0].length;
  const height = rows.length;
  const key = rasterKey(rows, layers);
  if (canvas.dataset.spriteKey === key && canvas.width === cols && canvas.height === height) return;
  const src = raster(rows, layers);
  if (!src) return;
  if (canvas.width !== cols) canvas.width = cols;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cols, height);
  ctx.drawImage(src, 0, 0);
  canvas.dataset.spriteKey = key;
}

export function primeSprites(
  items: readonly { rows: SpriteGrid; scale: number; layers?: readonly SpriteLayer[] }[],
) {
  if (typeof document === "undefined") return;
  const scratch = document.createElement("canvas");
  for (const item of items) {
    paintSpriteCanvas(scratch, item.rows, item.scale, item.layers ?? NO_LAYERS);
  }
}
