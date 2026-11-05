import { founderEmber } from "../design/palette";

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Full-viewport warm light. Cells stay on the Founder Ember colours. */
export function paintWarmLight(ctx: CanvasRenderingContext2D, width: number, height: number, cell: number) {
  ctx.fillStyle = founderEmber.ember;
  ctx.fillRect(0, 0, width, height);
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const thresh = BAYER[Math.floor(y / cell) % 4][Math.floor(x / cell) % 4];
      ctx.fillStyle = thresh < 5 ? founderEmber.flame : thresh > 11 ? founderEmber.wood : founderEmber.ember;
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

/**
 * Stepped hall vignette. Solid rings of slate then black — no Bayer checker.
 * Night is the page colour, so the open middle stays unpainted.
 */
export function paintVignette(ctx: CanvasRenderingContext2D, width: number, height: number, cell: number) {
  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const nx = ((x + cell * 0.5) / width - 0.5) * 2;
      const ny = ((y + cell * 0.5) / height - 0.5) * 2;
      const r = Math.hypot(nx * 0.92, ny);
      let color: string | null = null;
      if (r > 0.92) color = "#000000";
      else if (r > 0.74) color = founderEmber.slate;
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cell, cell);
    }
  }
}
