import { describe, expect, it } from "vitest";
import css from "../index.css?raw";
import {
  MATERIAL_CELL,
  MATERIAL_SCALE,
  applyMaterials,
  materialNames,
  materialSizePx,
  materialTiles,
  materialUrl,
  roomTileCharsAreEmber,
  schoolAccentSurfaces,
  studyRoomFill,
  tileChars,
} from "./materials";

describe("room materials", () => {
  it("tiles the study hall from night, slate, wood, and darkwood only", () => {
    expect(materialSizePx).toBe(MATERIAL_CELL * MATERIAL_SCALE);
    expect(MATERIAL_SCALE).toBe(4);
    for (const name of materialNames) {
      const rows = materialTiles[name];
      expect(rows).toHaveLength(MATERIAL_CELL);
      for (const row of rows) expect(row).toHaveLength(MATERIAL_CELL);
      expect(roomTileCharsAreEmber(name)).toBe(true);
      expect(tileChars(name).some((ch) => "bvkiefmp".includes(ch))).toBe(false);
    }
    expect(tileChars("plaster").sort()).toEqual(["n", "s"]);
    expect(tileChars("floor").sort()).toEqual(["d", "w"]);
    expect(tileChars("desk").sort()).toEqual(["d", "w"]);
    expect(studyRoomFill.wall).toBe("plaster");
    expect(studyRoomFill.floor).toBe("floor");
  });

  it("keeps school accent on the book and the apron rail", () => {
    expect([...schoolAccentSurfaces]).toEqual(["book", "apron-rail"]);
    expect(css).not.toMatch(/school-slate/);
    expect(css).not.toMatch(/\.agent-desk-floor\s*\{[^}]*plum/);
    expect(css).not.toMatch(/10px 0 0 var\(--plum\)/);
  });

  it("encodes each fill as a 16×16 png, not a gradient mask", () => {
    expect(css).not.toContain("mask-image: linear-gradient");
    expect(css).not.toContain("-webkit-mask-image: linear-gradient");
    for (const name of materialNames) {
      const url = materialUrl(name);
      expect(url.startsWith('url("data:image/png;base64,')).toBe(true);
      const b64 = url.slice(url.indexOf(",") + 1, -2);
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(String.fromCharCode(...bytes.slice(12, 16))).toBe("IHDR");
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint32(16)).toBe(MATERIAL_CELL);
      expect(view.getUint32(20)).toBe(MATERIAL_CELL);
    }
  });

  it("publishes the tile urls on the document", () => {
    const root = document.createElement("div");
    applyMaterials(root);
    expect(root.style.getPropertyValue("--mat-size")).toBe("64px");
    expect(root.style.getPropertyValue("--mat-plaster")).toContain("data:image/png");
    expect(root.style.getPropertyValue("--mat-floor")).toContain("data:image/png");
    expect(root.style.getPropertyValue("--mat-floor")).not.toContain("gradient");
  });
});
