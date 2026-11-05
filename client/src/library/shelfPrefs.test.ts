import { afterEach, describe, expect, it } from "vitest";
import {
  getShelfPrefs,
  isKitPinned,
  reloadShelfPrefs,
  resetShelfPrefsForTests,
  setKitPinned,
} from "./shelfPrefs";

const KEY = "founder-os.library-shelf";

afterEach(() => {
  resetShelfPrefsForTests();
});

describe("library shelf prefs", () => {
  it("pins the default kit until this desk unpins it", () => {
    expect(isKitPinned("hale-design-lab")).toBe(true);
    expect(setKitPinned("hale-design-lab", false)).toBe(true);
    expect(isKitPinned("hale-design-lab")).toBe(false);
    expect(isKitPinned("cloud-agent-team")).toBe(true);
    expect(setKitPinned("hale-design-lab", true)).toBe(true);
    expect(getShelfPrefs().kitPinned["hale-design-lab"]).toBe(true);
  });

  it("reloads the pin from local storage and ignores a broken record", () => {
    setKitPinned("hale-design-lab", false);
    reloadShelfPrefs();
    expect(isKitPinned("hale-design-lab")).toBe(false);
    expect(localStorage.getItem(KEY)).toContain("false");
    localStorage.setItem(KEY, "{");
    reloadShelfPrefs();
    expect(isKitPinned("hale-design-lab")).toBe(true);
    expect(getShelfPrefs()).toEqual({ kitPinned: {} });
    expect(setKitPinned("  ", true)).toBe(false);
  });
});
