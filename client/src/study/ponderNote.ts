import type { Note, NoteRepository, PrincipalRole } from "../storage/noteRepository";
import type { RawInkPoint } from "../storage/strokes";
import { createHumanNoteId } from "../storage/ulid";
import { sealPonderInk } from "./ponderInk";

export type KeepRefusal = "empty" | "machine";

export type KeepResult = { ok: true; note: Note } | { ok: false; reason: KeepRefusal };

export function ponderProjectId(doorId: string): string {
  return `school:${doorId}`;
}

/** Latest human note for this desk. Machine notes are not listed here. */
export async function loadPonderNote(doorId: string, repo: NoteRepository): Promise<Note | null> {
  const notes = await repo.listByProject(ponderProjectId(doorId));
  return notes.reduce<Note | null>((best, note) => {
    if (!best || note.revision > best.revision) return note;
    return best;
  }, null);
}

/**
 * Human-authored ponder text and ink. A machine principal returns before any
 * vault call. The only write is saveHumanEdit, and only after the person asks
 * to keep the note. Typed notes stay plain `content`; ink is a separate field.
 */
export async function keepPonderNote(input: {
  doorId: string;
  content: string;
  ink?: readonly { points: readonly RawInkPoint[] }[] | null;
  principal: PrincipalRole;
  existing: Note | null;
  repo: NoteRepository;
  now?: Date;
  createId?: () => string;
}): Promise<KeepResult> {
  if (input.principal !== "human") return { ok: false, reason: "machine" };

  const content = input.content.trim();
  const ink = sealPonderInk(input.ink);
  if (!content && ink.length === 0) return { ok: false, reason: "empty" };

  const note: Note = {
    id: input.existing?.id ?? (input.createId ?? createHumanNoteId)(),
    projectId: ponderProjectId(input.doorId),
    vault: "human",
    content,
    revision: input.existing ? input.existing.revision + 1 : 1,
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
  if (ink.length > 0) note.ink = ink;
  await input.repo.saveHumanEdit(note, input.principal);
  return { ok: true, note };
}
