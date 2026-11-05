import { afterEach, describe, expect, it } from "vitest";
import {
  isTileCount,
  reloadDeskTiles,
  resetDeskTilesForTests,
  setTileCount,
  tileCount,
} from "./deskTiles";
import tilesSource from "./deskTiles.ts?raw";
import gridSource from "./DeskGrid.tsx?raw";

const KEY = "founder-os.desk-tiles";

afterEach(() => {
  resetDeskTilesForTests();
});

describe("desk tile prefs", () => {
  it("stores 2, 3, or 4 and reloads from this desk only", () => {
    expect(tileCount()).toBe(3);
    expect(isTileCount(3)).toBe(true);
    expect(setTileCount(2)).toBe(true);
    expect(tileCount()).toBe(2);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({ count: 2 });
    setTileCount(4);
    reloadDeskTiles();
    expect(tileCount()).toBe(4);
    expect(setTileCount(4)).toBe(true);
    expect(setTileCount(1)).toBe(false);
    expect(setTileCount(5)).toBe(false);
    expect(tileCount()).toBe(4);
  });

  it("ignores a broken or out-of-range local record", () => {
    localStorage.setItem(KEY, "{");
    reloadDeskTiles();
    expect(tileCount()).toBe(3);
    localStorage.setItem(KEY, JSON.stringify({ count: 9 }));
    reloadDeskTiles();
    expect(tileCount()).toBe(3);
  });

  it("keeps the layout off both vaults", () => {
    const source = `${tilesSource}\n${gridSource}`;
    expect(source).not.toMatch(/humanNotes|machineNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(|indexedDB/);
  });
});
