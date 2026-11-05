import { afterEach, describe, expect, it, vi } from "vitest";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { keepPonderNote, loadPonderNote } from "./ponderNote";

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
});
