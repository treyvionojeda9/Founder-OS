import { describe, expect, it } from "vitest";
import { founderEmber, paletteByChar } from "./palette";
import { grayscaleGrid } from "./spriteGrid";
import { doorSpec } from "./sprites/doorFaces";
import {
  assignmentKey,
  closedBook,
  contactShadow,
  deskLampFailed,
  deskLampOff,
  deskLampOn,
  doorFrame,
  doorLeaf,
  doorSpill,
  lightPoolA,
  spriteCatalog,
} from "./sprites";

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

  it("keeps the contact shadow and the light pool readable in grayscale", () => {
    const night = grayscaleGrid(["n"])[0][0];
    const contact = grayscaleGrid(contactShadow)
      .flat()
      .filter((luma) => luma >= 0);
    expect(founderEmber.night).toBe("#1B1A24");
    expect(contact.length).toBeGreaterThan(0);
    for (const luma of contact) expect(luma).toBeGreaterThan(night);
    const pool = grayscaleGrid(lightPoolA)
      .flat()
      .filter((luma) => luma >= 0);
    expect(pool.length).toBeGreaterThan(0);
    expect(Math.max(...pool)).toBeGreaterThan(night + 40);
  });

  it("keeps the school book and key readable against the wood top", () => {
    const wood = grayscaleGrid(["w"])[0][0];
    const navy = grayscaleGrid(["v"])[0][0];
    const sky = grayscaleGrid(["b"])[0][0];
    const book = grayscaleGrid(closedBook)
      .flat()
      .filter((luma) => luma >= 0);
    const key = grayscaleGrid(assignmentKey)
      .flat()
      .filter((luma) => luma >= 0);
    expect(Math.abs(navy - wood)).toBeGreaterThanOrEqual(40);
    expect(book.filter((luma) => luma === navy).length).toBeGreaterThan(book.filter((luma) => luma === sky).length);
    expect(key.length).toBeGreaterThan(0);
    for (const luma of key) expect(Math.abs(luma - wood)).toBeGreaterThanOrEqual(30);
  });

  it("paints the door spill as solid ember steps, not a checker", () => {
    const y = Math.floor(doorSpill.length / 2);
    const row = doorSpill[y] ?? "";
    const x = Math.floor(row.length / 2);
    expect(row[x]).toBe("f");
    expect(row[x - 1]).toBe("f");
    expect(row[x + 1]).toBe("f");
    expect(doorSpill.some((line) => line.includes("e"))).toBe(true);
    expect(doorSpill.some((line) => line.includes("."))).toBe(true);
  });

  it("cuts a hole in the frame and keeps the leaf inside that opening", () => {
    const across = doorFrame[doorSpec.spring + 4] ?? "";
    expect(across[doorSpec.openingX + 4]).toBe(".");
    expect(doorLeaf).toHaveLength(doorSpec.leafH);
    expect(doorLeaf[0]).toHaveLength(doorSpec.leafW);
    expect(doorSpec.leafX).toBeGreaterThanOrEqual(doorSpec.openingX);
    expect(doorSpec.leafX + doorSpec.leafW).toBeLessThanOrEqual(doorSpec.openingX + doorSpec.openingW);
    expect(doorSpec.leafY).toBeGreaterThanOrEqual(doorSpec.spring);
  });
});
