import type { Note, NoteRepository, PrincipalRole } from "../storage/noteRepository";
import { createHumanNoteId } from "../storage/ulid";

export type ShelfRefusal = "empty" | "machine";

export type ShelfResult = { ok: true; note: Note } | { ok: false; reason: ShelfRefusal };

const TONES = ["plum", "wood", "ember", "paper"] as const;
const BANDS = ["high", "mid", "low", "broad"] as const;

export type SpineTone = (typeof TONES)[number];
export type SpineBand = (typeof BANDS)[number];

/**
 * Human shelf for the open work team.
 * School ponder notes stay at `school:${doorId}` and are not copied here.
 * Ponder Keep has no note fixtures, so this shelf starts empty until a person saves.
 */
export function workProjectId(teamId: string): string {
  return `work:${teamId}`;
}

export function shelfTitle(content: string): string {
  const line = content.trim().split("\n")[0] ?? "";
  if (!line) return "Untitled sheet";
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** Neighboring spines differ in cover and band so grayscale can still tell them apart. */
export function spineMark(index: number): { tone: SpineTone; band: SpineBand } {
  return {
    tone: TONES[index % TONES.length],
    band: BANDS[(index + 1) % BANDS.length],
  };
}

export function booksPerShelf(layout: "portrait" | "landscape" | "desktop"): number {
  return layout === "portrait" ? 3 : 5;
}

export function shelfBays<T>(items: readonly T[], perRow: number, minBays = 3): T[][] {
  const size = Math.max(1, perRow);
  const bays: T[][] = [];
  for (let i = 0; i < items.length; i += size) bays.push(items.slice(i, i + size));
  while (bays.length < minBays) bays.push([]);
  return bays;
}

export function bookLabel(note: Note, siblings: readonly Note[]): string {
  const title = shelfTitle(note.content);
  const same = siblings.filter((item) => shelfTitle(item.content) === title);
  if (same.length < 2) return title;
  return `${title}, revision ${note.revision}`;
}

/** Upright pixel rows. Seven glyphs a line, broken on words, so a spine never rotates type. */
export function spineLines(label: string, cols = 7): string[] {
  const words = label.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return ["Sheet"];
  const width = Math.max(1, cols);
  const lines: string[] = [];
  let current = "";
  const take = (word: string) => {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
      return;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  };
  for (const word of words) take(word);
  if (current) lines.push(current);
  return lines;
}

/** Human Vault notes for this team, newest first. Machine notes are never listed. */
export async function listShelfNotes(teamId: string, repo: NoteRepository): Promise<Note[]> {
  const notes = await repo.listByProject(workProjectId(teamId));
  return notes
    .filter((note) => note.vault === "human")
    .sort((a, b) => {
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
}

/**
 * Human-authored shelf text. A machine principal returns before any vault call.
 * The only write is saveHumanEdit, and only after the person asks to save.
 */
export async function saveShelfNote(input: {
  teamId: string;
  content: string;
  principal: PrincipalRole;
  existing: Note | null;
  repo: NoteRepository;
  now?: Date;
  createId?: () => string;
}): Promise<ShelfResult> {
  const content = input.content.trim();
  if (!content) return { ok: false, reason: "empty" };
  if (input.principal !== "human") return { ok: false, reason: "machine" };

  const note: Note = {
    id: input.existing?.id ?? (input.createId ?? createHumanNoteId)(),
    projectId: workProjectId(input.teamId),
    vault: "human",
    content,
    revision: input.existing ? input.existing.revision + 1 : 1,
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
  await input.repo.saveHumanEdit(note, input.principal);
  return { ok: true, note };
}
