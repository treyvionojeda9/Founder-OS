import { afterEach, describe, expect, it, vi } from "vitest";
import type { NoteRepository } from "../storage/noteRepository";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { sealPonderInk } from "./ponderInk";
import { keepPonderNote, loadPonderNote } from "./ponderNote";

const mark = sealPonderInk([
  {
    points: [
      { x: 0.15, y: 0.4, t_ms: 0, p: 0.5 },
      { x: 0.62, y: 0.7, t_ms: 30, p: 0.8 },
    ],
  },
]);

function closedVault(): NoteRepository {
  const refuse = async () => {
    throw new Error("vault");
  };
  return { get: refuse, saveHumanEdit: refuse, saveMachineOutput: refuse, listByProject: refuse };
}

afterEach(async () => {
  sessionSource.principal = "human";
  localDb.close();
  await localDb.delete();
});

describe("ponder notes", () => {
  it("keeps a typed note through the human save path", async () => {
    const first = await keepPonderNote({
      doorId: "reading-room",
      content: "  A sentence of my own.  ",
      principal: "human",
      existing: null,
      repo: noteRepo,
      now: new Date("2026-10-29T12:00:00.000Z"),
      createId: () => "HN-PONDER1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.note).toMatchObject({
      id: "HN-PONDER1",
      projectId: "school:reading-room",
      vault: "human",
      content: "A sentence of my own.",
      revision: 1,
    });
    expect(await loadPonderNote("reading-room", noteRepo)).toMatchObject({ content: "A sentence of my own." });

    const second = await keepPonderNote({
      doorId: "reading-room",
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
  });

  it("does not call the vault for an empty sheet or a machine principal", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const empty = await keepPonderNote({
      doorId: "reading-room",
      content: "   ",
      principal: "human",
      existing: null,
      repo: noteRepo,
    });
    const machine = await keepPonderNote({
      doorId: "reading-room",
      content: "A machine line.",
      principal: "machine",
      existing: null,
      repo: noteRepo,
    });
    expect(empty).toEqual({ ok: false, reason: "empty" });
    expect(machine).toEqual({ ok: false, reason: "machine" });
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("keeps ink with no typed line, and keeps text beside ink", async () => {
    const inkOnly = await keepPonderNote({
      doorId: "reading-room",
      content: "   ",
      ink: mark,
      principal: "human",
      existing: null,
      repo: noteRepo,
      now: new Date("2026-10-29T18:00:00.000Z"),
      createId: () => "HN-INK1",
    });
    expect(inkOnly.ok).toBe(true);
    if (!inkOnly.ok) return;
    expect(inkOnly.note.content).toBe("");
    expect(inkOnly.note.ink).toEqual(mark);
    expect(inkOnly.note.vault).toBe("human");
    expect(await loadPonderNote("reading-room", noteRepo)).toMatchObject({ ink: mark });
    expect((await localDb.humanRevisions.get(["HN-INK1", 1]))?.ink).toEqual(mark);
    expect(await localDb.machineNotes.count()).toBe(0);

    const withText = await keepPonderNote({
      doorId: "reading-room",
      content: "Words beside the mark.",
      ink: mark,
      principal: "human",
      existing: inkOnly.note,
      repo: noteRepo,
    });
    expect(withText.ok).toBe(true);
    if (!withText.ok) return;
    expect(withText.note).toMatchObject({ content: "Words beside the mark.", revision: 2 });
    expect(withText.note.ink).toEqual(mark);

    const typed = await keepPonderNote({
      doorId: "reading-room",
      content: "Only the words.",
      ink: [],
      principal: "human",
      existing: withText.note,
      repo: noteRepo,
    });
    expect(typed.ok).toBe(true);
    if (!typed.ok) return;
    expect(typed.note.ink).toBeUndefined();
    expect(typed.note.content).toBe("Only the words.");
    const loaded = await loadPonderNote("reading-room", noteRepo);
    expect(loaded?.content).toBe("Only the words.");
    expect(loaded?.ink).toBeUndefined();
  });

  it("refuses a machine principal before any vault call when the sheet has ink", async () => {
    const machine = await keepPonderNote({
      doorId: "reading-room",
      content: "Not for the machine.",
      ink: mark,
      principal: "machine",
      existing: null,
      repo: closedVault(),
    });
    expect(machine).toEqual({ ok: false, reason: "machine" });
  });
});
