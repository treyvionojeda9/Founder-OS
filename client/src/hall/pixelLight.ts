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
