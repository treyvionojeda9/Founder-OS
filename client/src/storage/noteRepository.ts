// Founder OS - Appendix E Step 2: Typed Local Note Repository (Dexie / IndexedDB)
import Dexie, { type Table } from "dexie";

export type Note = {
  id: string;
  projectId: string;
  vault: "human" | "machine";
  content: string;
  revision: number;
  updatedAt: string;
};

export type PrincipalRole = "human" | "machine";

export interface NoteRepository {
  get(id: string): Promise<Note | undefined>;
  saveHumanEdit(note: Note, principal?: PrincipalRole): Promise<void>;
  saveMachineOutput(note: Note, principal?: PrincipalRole): Promise<void>;
  listByProject(projectId: string): Promise<Note[]>;
}

export class FounderOSLocalDatabase extends Dexie {
  notes!: Table<Note, string>;

  constructor() {
    super("FounderOSLocalDB");
    this.version(1).stores({
      notes: "id, projectId, vault, revision, updatedAt",
    });
  }
}

export class IndexedDBNoteRepository implements NoteRepository {
  constructor(private readonly db: FounderOSLocalDatabase) {}

  async get(id: string): Promise<Note | undefined> {
    return this.db.notes.get(id);
  }

  async saveHumanEdit(note: Note, principal: PrincipalRole = "human"): Promise<void> {
    if (principal !== "human") {
      throw new Error("SECURITY_BOUNDARY_VIOLATION: Non-human principal cannot write to Human Vault.");
    }
    if (note.vault !== "human") {
      throw new Error("VAULT_MISMATCH: saveHumanEdit only accepts human vault records.");
    }
    await this.db.notes.put(note);
  }

  async saveMachineOutput(note: Note, principal: PrincipalRole = "machine"): Promise<void> {
    if (note.vault !== "machine") {
      throw new Error("SECURITY_BOUNDARY_VIOLATION: Machine output must reside in Machine Vault.");
    }
    await this.db.notes.put(note);
  }

  async listByProject(projectId: string): Promise<Note[]> {
    return this.db.notes.where("projectId").equals(projectId).toArray();
  }
}
