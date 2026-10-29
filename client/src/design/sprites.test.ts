import { describe, expect, it } from "vitest";
import { founderEmber, paletteByChar } from "./palette";
import { grayscaleGrid } from "./spriteGrid";
import { deskLampFailed, deskLampOff, deskLampOn, groundContact, spriteCatalog } from "./sprites";

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

  it("keeps the ground contact lighter than night so the mark survives grayscale", () => {
    const night = grayscaleGrid(["n"])[0][0];
    const contact = grayscaleGrid(groundContact)
      .flat()
      .filter((luma) => luma >= 0);
    expect(founderEmber.night).toBe("#1B1A24");
    expect(contact.length).toBeGreaterThan(0);
    for (const luma of contact) expect(luma).toBeGreaterThan(night);
  });
});
