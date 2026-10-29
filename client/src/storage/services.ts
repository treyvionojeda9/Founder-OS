import { FounderOSLocalDatabase, IndexedDBNoteRepository, type PrincipalRole } from "./noteRepository";

export const localDb = new FounderOSLocalDatabase();

/** Mutable source read by the note repository on every write. */
export const sessionSource: { principal: PrincipalRole } = { principal: "human" };

export const noteRepo = new IndexedDBNoteRepository(localDb, sessionSource);

export class SettingsRepository {
  constructor(private readonly db: FounderOSLocalDatabase) {}

  async getSection(): Promise<"work" | "school"> {
    await this.db.open();
    const row = await this.db.settings.get("homeSection");
    return row?.value === "school" ? "school" : "work";
  }

  async setSection(value: "work" | "school"): Promise<void> {
    await this.db.open();
    await this.db.settings.put({ key: "homeSection", value });
  }
}

export const settingsRepo = new SettingsRepository(localDb);
