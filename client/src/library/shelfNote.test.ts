import { afterEach, describe, expect, it, vi } from "vitest";
import shelfSource from "./shelfNote.ts?raw";
import librarySource from "./LibraryShelf.tsx?raw";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import type { Note } from "../storage/noteRepository";
import {
  bookLabel,
  booksPerShelf,
  listShelfNotes,
  saveShelfNote,
  shelfBays,
  shelfTitle,
  spineLines,
  spineMark,
  workProjectId,
} from "./shelfNote";

afterEach(async () => {
  sessionSource.principal = "human";
  vi.restoreAllMocks();
  localDb.close();
  await localDb.delete();
});

function human(partial: Partial<Note> & Pick<Note, "id" | "content" | "updatedAt">): Note {
  return {
    projectId: "work:hale-design-lab",
    vault: "human",
    revision: 1,
    ...partial,
  };
}

describe("shelf notes", () => {
  it("lists human notes for this team, newest first", async () => {
    await noteRepo.saveHumanEdit(
      human({ id: "HN-OLDER", content: "Lamp hours on the forge.", updatedAt: "2026-10-29T09:00:00.000Z" }),
      "human",
    );
    await noteRepo.saveHumanEdit(
      human({ id: "HN-NEWER", content: "A margin I kept.", updatedAt: "2026-10-29T10:00:00.000Z" }),
      "human",
    );
    await noteRepo.saveHumanEdit(
      human({
        id: "HN-OTHER",
        projectId: "work:cloud-agent-team",
        content: "Another team's sheet.",
        updatedAt: "2026-10-29T11:00:00.000Z",
      }),
      "human",
    );
    await noteRepo.saveHumanEdit(
      human({
        id: "HN-SCHOOL",
        projectId: "school:reading-room",
        content: "A sentence of my own.",
        updatedAt: "2026-10-29T12:00:00.000Z",
      }),
      "human",
    );
    await noteRepo.saveMachineOutput(
      {
        id: "MN-SHELFMACHINE0000000001",
        projectId: workProjectId("hale-design-lab"),
        vault: "machine",
        content: "A machine draft that must stay off the shelf.",
        revision: 1,
        updatedAt: "2026-10-29T13:00:00.000Z",
      },
      "machine",
    );

    const shelf = await listShelfNotes("hale-design-lab", noteRepo);
    expect(shelf.map((note) => note.id)).toEqual(["HN-NEWER", "HN-OLDER"]);
    expect(shelf.every((note) => note.vault === "human")).toBe(true);
    expect(await localDb.machineNotes.count()).toBe(1);
  });

  it("saves through the human path and refuses an empty sheet or a machine principal", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const empty = await saveShelfNote({
      teamId: "hale-design-lab",
      content: "   ",
      principal: "human",
      existing: null,
      repo: noteRepo,
    });
    const machine = await saveShelfNote({
      teamId: "hale-design-lab",
      content: "A machine line.",
      principal: "machine",
      existing: null,
      repo: noteRepo,
    });
    expect(empty).toEqual({ ok: false, reason: "empty" });
    expect(machine).toEqual({ ok: false, reason: "machine" });
    expect(saveHuman).not.toHaveBeenCalled();

    const first = await saveShelfNote({
      teamId: "hale-design-lab",
      content: "  Lamp hours on the forge.  ",
      principal: "human",
      existing: null,
      repo: noteRepo,
      now: new Date("2026-10-29T12:00:00.000Z"),
      createId: () => "HN-SHELF1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.note).toMatchObject({
      id: "HN-SHELF1",
      projectId: "work:hale-design-lab",
      vault: "human",
      content: "Lamp hours on the forge.",
      revision: 1,
    });

    const second = await saveShelfNote({
      teamId: "hale-design-lab",
      content: "Revised by hand.",
      principal: "human",
      existing: first.note,
      repo: noteRepo,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.note.revision).toBe(2);
    expect(await localDb.humanNotes.count()).toBe(1);
    expect(await localDb.machineNotes.count()).toBe(0);
    expect(saveHuman).toHaveBeenCalledTimes(2);
  });

  it("keeps neighboring spines distinct and starts from an empty case", () => {
    expect(workProjectId("hale-design-lab")).toBe("work:hale-design-lab");
    expect(shelfTitle("  First line\nsecond")).toBe("First line");
    expect(shelfTitle("")).toBe("Untitled sheet");
    expect(shelfTitle("x".repeat(90)).endsWith("…")).toBe(true);
    expect(shelfTitle("x".repeat(90)).length).toBe(80);
    const first = spineMark(0);
    const second = spineMark(1);
    expect(first).not.toEqual(second);
    expect(booksPerShelf("portrait")).toBe(3);
    expect(booksPerShelf("desktop")).toBe(5);
    expect(shelfBays(["a"], 3)).toEqual([["a"], [], []]);
    expect(bookLabel(human({ id: "HN-A", content: "Same", updatedAt: "t" }), [])).toBe("Same");
    expect(spineLines("A margin I kept.").join(" ")).toBe("A margin I kept.");
    expect(spineLines("Lamp hours on the forge.").join(" ")).toBe("Lamp hours on the forge.");
    expect(spineLines("A margin I kept.").every((line) => line.length <= 7)).toBe(true);
    expect(spineLines("supercalifragilistic").join("")).toBe("supercalifragilistic");
    expect(spineLines("   ")).toEqual(["Sheet"]);
  });

  it("has no machine vault write on the shelf path", () => {
    expect(shelfSource).not.toMatch(/saveMachineOutput|machineNotes/);
    expect(shelfSource).toMatch(/saveHumanEdit/);
    expect(librarySource).not.toMatch(/saveMachineOutput|machineNotes|fetch\(/);
  });
});
