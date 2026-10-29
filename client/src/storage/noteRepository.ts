// Founder OS - local Human Vault / Machine Vault / append-only revisions.
import Dexie, { type Table } from "dexie";
import type { RawInkStroke } from "./strokes";

export type Note = {
  id: string;
  projectId: string;
  vault: "human" | "machine";
  content: string;
  revision: number;
  updatedAt: string;
  /** Human ink JSON. Omitted on typed notes so older rows stay text. */
  ink?: RawInkStroke[];
};

export type PrincipalRole = "human" | "machine";

export type HumanRevision = {
  noteId: string;
  revision: number;
  content: string;
  projectId: string;
  vault: "human";
  updatedAt: string;
  ink?: RawInkStroke[];
};

export type SettingRow = {
  key: string;
  value: string;
};

/** Read at call time so a SessionContext can swap the signed-in principal. */
export type SessionSource = {
  principal: PrincipalRole;
};

export interface NoteRepository {
  get(id: string): Promise<Note | undefined>;
  saveHumanEdit(note: Note, principal?: PrincipalRole): Promise<void>;
  saveMachineOutput(note: Note, principal?: PrincipalRole): Promise<void>;
  listByProject(projectId: string): Promise<Note[]>;
}

const LEGACY_NOTES = "id, projectId, vault, revision, updatedAt";

export class FounderOSLocalDatabase extends Dexie {
  humanNotes!: Table<Note, string>;
  humanRevisions!: Table<HumanRevision, [string, number]>;
  machineNotes!: Table<Note, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = "FounderOSLocalDB") {
    super(name);
    this.version(1).stores({
      notes: LEGACY_NOTES,
    });
    this.version(2)
      .stores({
        notes: null,
        humanNotes: "id, projectId, vault, revision, updatedAt",
        humanRevisions: "[noteId+revision], noteId",
        machineNotes: "id, projectId, vault, revision, updatedAt",
        settings: "key",
      })
      .upgrade(async (tx) => {
        const legacy = await tx.table("notes").toArray();
        for (const row of legacy as Note[]) {
          if (row.vault === "machine") {
            await tx.table("machineNotes").put(row);
            continue;
          }
          const human: Note = { ...row, vault: "human" };
          await tx.table("humanNotes").put(human);
          const revision: HumanRevision = {
            noteId: human.id,
            revision: human.revision,
            content: human.content,
            projectId: human.projectId,
            vault: "human",
            updatedAt: human.updatedAt,
          };
          await tx.table("humanRevisions").put(revision);
        }
      });
  }
}

export class IndexedDBNoteRepository implements NoteRepository {
  constructor(
    private readonly db: FounderOSLocalDatabase,
    private readonly session: SessionSource,
  ) {}

  private actor(explicit?: PrincipalRole): PrincipalRole {
    return explicit ?? this.session.principal;
  }

  async get(id: string): Promise<Note | undefined> {
    await this.db.open();
    const human = await this.db.humanNotes.get(id);
    if (human) return human;
    return this.db.machineNotes.get(id);
  }

  async getRevision(noteId: string, revision: number): Promise<HumanRevision | undefined> {
    await this.db.open();
    return this.db.humanRevisions.get([noteId, revision]);
  }

  async saveHumanEdit(note: Note, principal?: PrincipalRole): Promise<void> {
    const actor = this.actor(principal);
    if (actor !== "human") {
      throw new Error("SECURITY_BOUNDARY_VIOLATION: Non-human principal cannot write to Human Vault.");
    }
    if (note.vault !== "human") {
      throw new Error("VAULT_MISMATCH: saveHumanEdit only accepts human vault records.");
    }
    if (!note.id.startsWith("HN-")) {
      throw new Error("ID_PREFIX: Human Vault ids must start with HN-.");
    }

    await this.db.open();
    const existing = await this.db.humanNotes.get(note.id);
    const expected = existing ? existing.revision + 1 : 1;
    const prior = await this.db.humanRevisions.get([note.id, note.revision]);
    if (note.revision !== expected || prior) {
      throw new Error("REVISION_CONFLICT");
    }

    const stored: Note = { ...note, vault: "human" };
    if (!stored.ink?.length) delete stored.ink;

    const revision: HumanRevision = {
      noteId: stored.id,
      revision: stored.revision,
      content: stored.content,
      projectId: stored.projectId,
      vault: "human",
      updatedAt: stored.updatedAt,
    };
    if (stored.ink) revision.ink = stored.ink;
    await this.db.transaction("rw", this.db.humanNotes, this.db.humanRevisions, async () => {
      await this.db.humanRevisions.add(revision);
      await this.db.humanNotes.put(stored);
    });
  }

  async saveMachineOutput(note: Note, principal?: PrincipalRole): Promise<void> {
    void principal;
    if (note.vault !== "machine") {
      throw new Error("SECURITY_BOUNDARY_VIOLATION: Machine output must reside in Machine Vault.");
    }
    await this.db.open();
    const humanHit = await this.db.humanNotes.get(note.id);
    if (humanHit || note.id.startsWith("HN-")) {
      throw new Error("SECURITY_BOUNDARY_VIOLATION: Machine output cannot write a Human Vault id.");
    }
    if (!note.id.startsWith("MN-")) {
      throw new Error("ID_PREFIX: Machine Vault ids must start with MN-.");
    }
    await this.db.machineNotes.put(note);
  }

  /** Human Vault only. Machine notes stay in listMachineByProject so the layers never merge. */
  async listByProject(projectId: string): Promise<Note[]> {
    await this.db.open();
    return this.db.humanNotes.where("projectId").equals(projectId).toArray();
  }

  async listMachineByProject(projectId: string): Promise<Note[]> {
    await this.db.open();
    return this.db.machineNotes.where("projectId").equals(projectId).toArray();
  }
}
