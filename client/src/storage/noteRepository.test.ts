import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import {
  FounderOSLocalDatabase,
  IndexedDBNoteRepository,
  type Note,
  type SessionSource,
} from "./noteRepository";

const DB_NAME = "founder-os-note-spec";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "HN-01JEXAMPLE42",
    projectId: "default-project",
    vault: "human",
    content: "original human handwritten thought",
    revision: 1,
    updatedAt: "2026-10-28T00:00:00.000Z",
    ...overrides,
  };
}

const opened: FounderOSLocalDatabase[] = [];

async function freshRepo(principal: SessionSource["principal"] = "human") {
  const db = new FounderOSLocalDatabase(DB_NAME);
  opened.push(db);
  const session: SessionSource = { principal };
  const repo = new IndexedDBNoteRepository(db, session);
  return { db, session, repo };
}

afterEach(async () => {
  for (const db of opened) db.close();
  opened.length = 0;
  await Dexie.delete(DB_NAME);
});

describe("IndexedDBNoteRepository", () => {
  it("rejects a machine principal on saveHumanEdit and leaves the store unchanged", async () => {
    const { db, session, repo } = await freshRepo("human");
    const original = note();
    await repo.saveHumanEdit(original);
    const beforeNote = await repo.get(original.id);
    const beforeRevisions = await db.humanRevisions.toArray();

    session.principal = "machine";
    await expect(
      repo.saveHumanEdit(note({ content: "machine overwrite", revision: 2 })),
    ).rejects.toThrow(/SECURITY_BOUNDARY_VIOLATION/);

    expect(await repo.get(original.id)).toEqual(beforeNote);
    expect(await db.humanRevisions.toArray()).toEqual(beforeRevisions);
    expect(await db.machineNotes.toArray()).toEqual([]);
    db.close();
  });

  it("rejects saveMachineOutput for an existing HN- id and keeps the human note byte-identical", async () => {
    const { db, repo } = await freshRepo("human");
    const original = note();
    await repo.saveHumanEdit(original);
    const before = JSON.stringify(await repo.get(original.id));
    const beforeRevision = JSON.stringify(await repo.getRevision(original.id, 1));

    await expect(
      repo.saveMachineOutput(
        note({
          vault: "machine",
          content: "machine tried to reuse the human id",
          revision: 1,
          updatedAt: "2026-10-28T01:00:00.000Z",
        }),
        "machine",
      ),
    ).rejects.toThrow(/SECURITY_BOUNDARY_VIOLATION/);

    expect(JSON.stringify(await repo.get(original.id))).toBe(before);
    expect(JSON.stringify(await repo.getRevision(original.id, 1))).toBe(beforeRevision);
    expect(await db.machineNotes.get(original.id)).toBeUndefined();
    db.close();
  });

  it("appends human revisions and rejects a stale save", async () => {
    const { repo } = await freshRepo("human");
    const first = note({ revision: 1, content: "first", updatedAt: "2026-10-28T00:00:00.000Z" });
    const second = note({ revision: 2, content: "second", updatedAt: "2026-10-28T00:01:00.000Z" });
    await repo.saveHumanEdit(first);
    await repo.saveHumanEdit(second);

    expect(await repo.getRevision(first.id, 1)).toMatchObject({ content: "first", revision: 1 });
    expect(await repo.getRevision(first.id, 2)).toMatchObject({ content: "second", revision: 2 });
    expect((await repo.get(first.id))?.content).toBe("second");

    await expect(
      repo.saveHumanEdit(note({ revision: 2, content: "stale" })),
    ).rejects.toThrow(/REVISION_CONFLICT/);

    expect((await repo.getRevision(first.id, 1))?.content).toBe("first");
    expect((await repo.get(first.id))?.content).toBe("second");
  });
});
