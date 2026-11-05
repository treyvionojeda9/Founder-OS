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
 * Stepped vignette. Night is already the darkest palette swatch, so the
 * mask uses black cells in hard bands rather than a new sprite colour.
 */
export function paintVignette(ctx: CanvasRenderingContext2D, width: number, height: number, cell: number) {
  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const nx = (x / width - 0.5) * 2;
      const ny = (y / height - 0.5) * 2;
      const r = Math.hypot(nx * 0.92, ny);
      let band = 0;
      if (r > 0.96) band = 16;
      else if (r > 0.82) band = 11;
      else if (r > 0.68) band = 6;
      if (band === 0) continue;
      const thresh = BAYER[Math.floor(y / cell) % 4][Math.floor(x / cell) % 4];
      if (band > thresh) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
}
