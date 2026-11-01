import { afterEach, describe, expect, it } from "vitest";
import {
  getBoardPrefs,
  keepPlaqueMark,
  markSwap,
  reloadBoardPrefs,
  resetBoardPrefsForTests,
  seatOrder,
  setToolLabel,
  togglePin,
  toolLabel,
} from "./boardPrefs";
import prefsSource from "./boardPrefs.ts?raw";
import boardSource from "./TeamBoard.tsx?raw";

const KEY = "founder-os.team-board";

afterEach(() => {
  resetBoardPrefsForTests();
});

const agents = [
  { id: "ceo", name: "CEO" },
  { id: "atelier", name: "Atelier" },
  { id: "courier", name: "Courier" },
];

describe("team board local prefs", () => {
  it("pins the newest agent first and leaves the rest in roster order", () => {
    expect(seatOrder(agents, []).map((agent) => agent.id)).toEqual(["ceo", "atelier", "courier"]);
    expect(togglePin("hale", "courier")).toBe(true);
    expect(seatOrder(agents, getBoardPrefs().pins.hale ?? []).map((agent) => agent.id)).toEqual([
      "courier",
      "ceo",
      "atelier",
    ]);
    expect(togglePin("hale", "atelier")).toBe(true);
    expect(seatOrder(agents, getBoardPrefs().pins.hale ?? []).map((agent) => agent.id)).toEqual([
      "atelier",
      "courier",
      "ceo",
    ]);
    expect(togglePin("hale", "atelier")).toBe(false);
    expect(seatOrder(agents, getBoardPrefs().pins.hale ?? []).map((agent) => agent.id)).toEqual([
      "courier",
      "ceo",
      "atelier",
    ]);
  });

  it("reloads pin, label, and swap marks from local storage", () => {
    togglePin("hale", "courier");
    expect(setToolLabel("hale", "Swatch sheet", "Swatch card")).toBe(true);
    expect(markSwap("hale", "atelier", "courier")).toBe(true);
    expect(keepPlaqueMark("hale", "atelier", { name: "Painter", title: "Swatch keeper" })).toBe(true);
    reloadBoardPrefs();
    const prefs = getBoardPrefs();
    expect(prefs.pins.hale).toEqual(["courier"]);
    expect(toolLabel("hale", "Swatch sheet", prefs)).toBe("Swatch card");
    expect(prefs.marks["hale:atelier"]).toBe("courier");
    expect(prefs.names["hale:atelier"]).toEqual({ name: "Painter", title: "Swatch keeper" });
    expect(localStorage.getItem(KEY)).toContain("Swatch card");
  });

  it("refuses a blank, long, or address-shaped label and keeps the fixture name", () => {
    expect(setToolLabel("hale", "Swatch sheet", "  ")).toBe(false);
    expect(setToolLabel("hale", "Swatch sheet", "https://swatch.example")).toBe(false);
    expect(setToolLabel("hale", "Swatch sheet", "/api/tools")).toBe(false);
    expect(setToolLabel("hale", "Swatch sheet", "x".repeat(33))).toBe(false);
    expect(toolLabel("hale", "Swatch sheet")).toBe("Swatch sheet");
    expect(setToolLabel("hale", "Swatch sheet", "Swatch card")).toBe(true);
    expect(setToolLabel("hale", "Swatch sheet", "Swatch sheet")).toBe(true);
    expect(getBoardPrefs().labels.hale).toEqual({});
    expect(keepPlaqueMark("hale", "ceo", { name: " ", title: "Founder" })).toBe(false);
    expect(markSwap("hale", "ceo", "ceo")).toBe(false);
  });

  it("ignores a broken local record", () => {
    localStorage.setItem(KEY, "{");
    reloadBoardPrefs();
    expect(getBoardPrefs()).toEqual({ pins: {}, labels: {}, names: {}, marks: {} });
  });

  it("keeps the board and its marks off both vaults", () => {
    const source = `${prefsSource}\n${boardSource}`;
    expect(source).not.toMatch(/humanNotes|machineNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(|indexedDB/);
  });
});
