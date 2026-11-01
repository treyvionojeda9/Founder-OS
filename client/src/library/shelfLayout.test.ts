import { describe, expect, it } from "vitest";
import type { Note } from "../storage/noteRepository";
import layoutSource from "./shelfLayout.ts?raw";
import prefsSource from "./shelfPrefs.ts?raw";
import librarySource from "./LibraryShelf.tsx?raw";
import {
  buildShelves,
  canOpenHumanSpine,
  defaultKit,
  narrowByLabel,
  packShelf,
  shelfKindOrder,
} from "./shelfLayout";

function sheet(id: string, content: string, updatedAt: string): Note {
  return {
    id,
    projectId: "work:hale-design-lab",
    vault: "human",
    content,
    revision: 1,
    updatedAt,
  };
}

describe("scalable shelves", () => {
  it("groups notes, paths, and the kit, with the pinned kit first", () => {
    const notes = [sheet("HN-A", "A margin I kept.", "2026-10-29T10:00:00.000Z")];
    const pinned = buildShelves({ notes, query: {}, kitPinned: true, capacity: 5 });
    expect(pinned.map((shelf) => shelf.kind)).toEqual(["kit", "notes", "paths"]);
    expect(pinned[0]?.pinned).toBe(true);
    expect(pinned[0]?.label).toBe("Default kit");
    expect(pinned[1]?.visible.map((entry) => entry.title)).toEqual(["A margin I kept."]);
    expect(pinned[1]?.visible[0]?.note?.id).toBe("HN-A");
    expect(pinned[1]?.visible[0]?.status).toBe("done");
    expect(pinned[2]?.visible.map((entry) => entry.title)).toEqual(["Reading Room path", "Field Notes path"]);
    expect(pinned[2]?.visible.every((entry) => entry.note === null && entry.status === "idle")).toBe(true);
    expect(pinned[0]?.visible.every((entry) => entry.note === null)).toBe(true);
    expect(shelfKindOrder(false)).toEqual(["notes", "paths", "kit"]);
    const loose = buildShelves({ notes, query: {}, kitPinned: false, capacity: 5 });
    expect(loose.map((shelf) => shelf.kind)).toEqual(["notes", "paths", "kit"]);
    expect(loose.every((shelf) => shelf.pinned === false)).toBe(true);
  });

  it("reserves the last slot as +N instead of squeezing another spine", () => {
    expect(packShelf(["a", "b", "c"], 3)).toEqual({ visible: ["a", "b", "c"], overflow: [] });
    expect(packShelf(["a", "b", "c", "d"], 3)).toEqual({ visible: ["a", "b"], overflow: ["c", "d"] });
    expect(packShelf(["a", "b", "c", "d", "e", "f"], 5)).toEqual({
      visible: ["a", "b", "c", "d"],
      overflow: ["e", "f"],
    });
    const crowded = buildShelves({ notes: [], query: {}, kitPinned: true, capacity: 3 });
    const kit = crowded[0];
    expect(kit?.visible).toHaveLength(2);
    expect(kit?.overflow.map((entry) => entry.title)).toEqual([
      "Margin rule",
      "Forge list",
      "Quill",
      "Desk ledger",
    ]);
    expect(defaultKit).toHaveLength(6);
  });

  it("narrows one shelf from its label and leaves the others whole", () => {
    expect(narrowByLabel([{ title: "Quill" }, { title: "Forge list" }], "  quill ")).toEqual([{ title: "Quill" }]);
    expect(narrowByLabel([{ title: "Quill" }], "   ")).toEqual([{ title: "Quill" }]);
    const shelves = buildShelves({
      notes: [sheet("HN-A", "A margin I kept.", "2026-10-29T10:00:00.000Z")],
      query: { kit: "seal" },
      kitPinned: true,
      capacity: 5,
    });
    expect(shelves[0]?.visible.map((entry) => entry.title)).toEqual(["Founder seal"]);
    expect(shelves[0]?.overflow).toEqual([]);
    expect(shelves[1]?.visible).toHaveLength(1);
    expect(shelves[2]?.visible).toHaveLength(2);
  });

  it("refuses a machine principal before a human spine can open", () => {
    expect(canOpenHumanSpine("human")).toBe(true);
    expect(canOpenHumanSpine("machine")).toBe(false);
  });

  it("keeps layout, prefs, and the shelf off machine vault writes", () => {
    const source = `${layoutSource}\n${prefsSource}\n${librarySource}`;
    expect(layoutSource).not.toMatch(/saveHumanEdit|saveMachineOutput|humanNotes|machineNotes|indexedDB|fetch\(/);
    expect(prefsSource).not.toMatch(/saveHumanEdit|saveMachineOutput|humanNotes|machineNotes|indexedDB|fetch\(/);
    expect(librarySource).not.toMatch(/saveMachineOutput|machineNotes|fetch\(/);
    expect(source).toMatch(/localStorage/);
    expect(source).not.toMatch(/saveMachineOutput/);
  });
});
