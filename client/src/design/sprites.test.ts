import { describe, expect, it } from "vitest";
import { paletteByChar } from "./palette";
import { grayscaleGrid } from "./spriteGrid";
import { deskLampFailed, deskLampOff, deskLampOn, spriteCatalog } from "./sprites";

describe("sprite grids", () => {
  it("maps every character to the palette and keeps rows the same width", () => {
    expect(spriteCatalog.length).toBeGreaterThan(0);
    for (const sprite of spriteCatalog) {
      const width = sprite.rows[0].length;
      expect(width).toBeGreaterThan(0);
      for (const row of sprite.rows) {
        expect(row.length).toBe(width);
        for (const ch of row) {
          expect(ch in paletteByChar).toBe(true);
        }
      }
    }
  });

  it("keeps lamp on, off, and failed different after grayscale conversion", () => {
    const on = grayscaleGrid(deskLampOn);
    const off = grayscaleGrid(deskLampOff);
    const failed = grayscaleGrid(deskLampFailed);
    expect(on).not.toEqual(off);
    expect(on).not.toEqual(failed);
    expect(off).not.toEqual(failed);
  });
});
