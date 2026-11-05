import { founderEmber, schoolAccent } from "../design/palette";
import type { AgentStatus } from "../team/chatStore";

function channelLuma(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * A lamp pool has to read lighter than the wood top once the colour is gone.
 * School accent's brightest tone (sky) sits on the wood, so it cannot be the pool.
 */
export function schoolAccentFitsLampPool(minLift = 40): boolean {
  const wood = channelLuma(founderEmber.wood);
  const brightest = Math.max(...Object.values(schoolAccent).map((hex) => channelLuma(hex)));
  return brightest - wood >= minLift;
}

/** Work rooms use ember. School uses a school pool only when that pool would still read as light. */
export function lampPoolPalette(room: "work" | "school"): "ember" | "school" {
  if (room === "school" && schoolAccentFitsLampPool()) return "school";
  return "ember";
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type PoolSpec = {
  cols: number;
  rows: number;
};

export function poolSpec(status: AgentStatus): PoolSpec {
  if (status === "working") return { cols: 44, rows: 22 };
  if (status === "failed") return { cols: 26, rows: 16 };
  return { cols: 18, rows: 5 };
}

export function washSpec(status: AgentStatus): PoolSpec {
  if (status === "working") return { cols: 20, rows: 18 };
  if (status === "failed") return { cols: 12, rows: 12 };
  return { cols: 10, rows: 4 };
}

function prepare(canvas: HTMLCanvasElement, cols: number, rows: number, scale: number) {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  canvas.width = cols * scale * dpr;
  canvas.height = rows * scale * dpr;
  canvas.style.width = `${cols * scale}px`;
  canvas.style.height = `${rows * scale}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cols * scale, rows * scale);
  return ctx;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

/** Wide stippled pool, a short contact bar, or a broken ring. Shapes differ, not only colours. */
export function paintDeskPool(canvas: HTMLCanvasElement, status: AgentStatus) {
  const { cols, rows } = poolSpec(status);
  const scale = status === "working" ? 6 : 4;
  const ctx = prepare(canvas, cols, rows, scale);
  if (!ctx) return;
  const { flame, ember, wood, darkwood, slate, plum } = founderEmber;

  if (status === "idle") {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (y === 0 && x % 3 !== 0) continue;
        dot(ctx, x, y, scale, y === rows - 1 ? darkwood : slate);
      }
    }
    return;
  }

  if (status === "failed") {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const dx = (x - cols * 0.5) / (cols * 0.42);
        const dy = (y - rows * 0.55) / (rows * 0.42);
        const radius = Math.sqrt(dx * dx + dy * dy);
        const thresh = BAYER[y % 4][x % 4];
        const spark = (x === 4 && y === 3) || (x === 8 && y === 6) || (x === 18 && y === 4);
        if (spark) {
          dot(ctx, x, y, scale, flame);
          continue;
        }
        if (radius > 0.42 && radius < 0.78 && thresh < 6) dot(ctx, x, y, scale, plum);
      }
    }
    return;
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const dx = (x - cols * 0.34) / (cols * 0.52);
      const dy = (y - rows * 0.58) / (rows * 0.62);
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius > 1) continue;
      const thresh = BAYER[y % 4][x % 4] / 16;
      let color: string | null = null;
      if (radius < 0.34) color = flame;
      else if (radius < 0.55) color = thresh < 0.45 ? flame : ember;
      else if (radius < 0.78) color = thresh < 0.35 ? ember : thresh < 0.62 ? wood : null;
      else color = thresh < 0.14 ? wood : null;
      if (color) dot(ctx, x, y, scale, color);
    }
  }
}

/** Light that lands on the sheet. Idle is a thin shadow, not a smaller copy of the pool. */
export function paintPaperWash(canvas: HTMLCanvasElement, status: AgentStatus) {
  const { cols, rows } = washSpec(status);
  const scale = 4;
  const ctx = prepare(canvas, cols, rows, scale);
  if (!ctx) return;
  const { flame, ember, wood, darkwood, plum } = founderEmber;

  if (status === "idle") {
    for (let x = 0; x < cols; x += 1) dot(ctx, x, rows - 1, scale, x % 4 === 0 ? wood : darkwood);
    return;
  }

  if (status === "failed") {
    const sparks: [number, number][] = [
      [2, 2],
      [5, 4],
      [3, 8],
      [9, 3],
    ];
    for (const [x, y] of sparks) dot(ctx, x, y, scale, plum);
    return;
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const dx = x / cols;
      const dy = (y - rows * 0.2) / rows;
      const radius = Math.sqrt(dx * dx * 1.4 + dy * dy);
      if (radius > 1) continue;
      const thresh = BAYER[y % 4][x % 4] / 16;
      let color: string | null = null;
      if (radius < 0.35) color = thresh < 0.6 ? flame : ember;
      else if (radius < 0.7) color = thresh < 0.35 ? ember : thresh < 0.55 ? wood : null;
      else color = thresh < 0.15 ? wood : null;
      if (color) dot(ctx, x, y, scale, color);
    }
  }
}
