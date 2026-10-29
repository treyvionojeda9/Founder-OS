import { paletteByChar } from "./palette";
import type { SpriteGrid } from "./sprites/types";

export function assertSpriteGrid(rows: SpriteGrid): void {
  if (rows.length === 0) {
    throw new Error("Sprite grid is empty");
  }
  const width = rows[0].length;
  if (width === 0) {
    throw new Error("Sprite grid has an empty row");
  }
  for (const row of rows) {
    if (row.length !== width) {
      throw new Error("Sprite rows must share one width");
    }
    for (const ch of row) {
      if (!(ch in paletteByChar)) {
        throw new Error(`Sprite character "${ch}" is not in the palette`);
      }
    }
  }
}

/** Integer luma per pixel. Empty cells are -1 so they stay comparable. */
export function grayscaleGrid(rows: SpriteGrid): number[][] {
  assertSpriteGrid(rows);
  return rows.map((row) =>
    [...row].map((ch) => {
      const hex = paletteByChar[ch];
      if (!hex) return -1;
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }),
  );
}
