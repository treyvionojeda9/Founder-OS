import { describe, expect, it } from "vitest";
import { founderEmber, schoolAccent } from "../design/palette";
import {
  countHex,
  deskBandRows,
  deskPattern,
  paintDeskWash,
  paintSpaceBackdrop,
  paintWallWash,
  readBackdrop,
  spaceSwapFrames,
  staysInPalette,
  wallPattern,
  wallWashIsPools,
  wallWashIsShafts,
} from "./spaceSkin";

describe("work and school spaces", () => {
  it("paints a warmer ember floor for work and a cooler shaft wash for school", () => {
    const work = paintSpaceBackdrop("work");
    const school = paintSpaceBackdrop("school");
    const workRead = readBackdrop(work);
    const schoolRead = readBackdrop(school);

    expect(workRead, JSON.stringify(workRead)).toMatchObject({ schoolAccent: 0, shaftColumns: 0 });
    expect(workRead.brightFloor).toBeGreaterThan(20);
    expect(schoolRead.brightFloor).toBe(0);
    expect(schoolRead.shaftColumns).toBeGreaterThanOrEqual(8);
    expect(schoolRead.schoolAccent).toBeGreaterThan(workRead.schoolAccent);
    expect(countHex(work, founderEmber.flame)).toBeGreaterThan(8);
    expect(countHex(work, founderEmber.ember)).toBeGreaterThan(8);
    expect(countHex(school, schoolAccent.sky)).toBeGreaterThan(8);
    expect(countHex(school, schoolAccent.navy)).toBeGreaterThan(8);
    expect(countHex(work, founderEmber.night)).toBeGreaterThan(40);
    expect(countHex(school, founderEmber.night)).toBeGreaterThan(40);
    expect(countHex(work, founderEmber.wood)).toBeGreaterThan(20);
    expect(countHex(school, founderEmber.wood)).toBeGreaterThan(20);
  });

  it("stays inside Founder Ember plus the school accent", () => {
    expect(staysInPalette(paintSpaceBackdrop("work"), "work")).toBe(true);
    expect(staysInPalette(paintSpaceBackdrop("school"), "school")).toBe(true);
    expect(staysInPalette(paintWallWash("work"), "work")).toBe(true);
    expect(staysInPalette(paintWallWash("school"), "school")).toBe(true);
    expect(staysInPalette(paintDeskWash("work"), "work")).toBe(true);
    expect(staysInPalette(paintDeskWash("school"), "school")).toBe(true);
    expect(countHex(paintSpaceBackdrop("work"), schoolAccent.sky)).toBe(0);
    expect(countHex(paintWallWash("school"), founderEmber.flame)).toBe(0);
  });

  it("keeps the wall and desk washes readable as different shapes in grayscale", () => {
    const workWall = paintWallWash("work");
    const schoolWall = paintWallWash("school");
    const workDesk = paintDeskWash("work");
    const schoolDesk = paintDeskWash("school");
    expect(wallPattern("work")).toBe("pools");
    expect(wallPattern("school")).toBe("shafts");
    expect(deskPattern("work")).toBe("pools");
    expect(deskPattern("school")).toBe("band");
    expect(wallWashIsPools(workWall, 48)).toBe(true);
    expect(wallWashIsShafts(schoolWall, 48)).toBe(true);
    expect(wallWashIsPools(schoolWall, 48)).toBe(false);
    expect(deskBandRows(workDesk, 48)).toBe(0);
    expect(deskBandRows(schoolDesk, 48)).toBeGreaterThan(0);
  });

  it("crossfades in four frames and cuts to one frame when motion is reduced", () => {
    expect(spaceSwapFrames(false)).toBe(4);
    expect(spaceSwapFrames(true)).toBe(1);
  });
});
