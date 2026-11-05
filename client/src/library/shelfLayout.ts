import { savedSheetStatus } from "../design/statusFrame";
import { learningPaths } from "../fixtures/learning";
import type { Note, PrincipalRole } from "../storage/noteRepository";
import type { AgentStatus } from "../team/chatStore";
import { bookLabel } from "./shelfNote";

/** Work-library kinds. Notes are vault sheets. Paths and the kit are titles only. */
export const SHELF_KINDS = ["notes", "paths", "kit"] as const;
export type ShelfKind = (typeof SHELF_KINDS)[number];

export const SHELF_LABEL: Record<ShelfKind, string> = {
  notes: "Notes",
  paths: "Paths",
  kit: "Default kit",
};

/**
 * Starter spines for the pinned kit.
 * They are catalog titles. Nothing here is a Human Vault note.
 */
export const defaultKit: readonly { id: string; title: string }[] = [
  { id: "kit-seal", title: "Founder seal" },
  { id: "kit-lamp", title: "Lamp card" },
  { id: "kit-margin", title: "Margin rule" },
  { id: "kit-forge", title: "Forge list" },
  { id: "kit-quill", title: "Quill" },
  { id: "kit-ledger", title: "Desk ledger" },
];

export type ShelfEntry = {
  id: string;
  kind: ShelfKind;
  title: string;
  /** Set only for a human vault sheet. Catalog spines stay null. */
  note: Note | null;
  status: AgentStatus;
};

export type PackedShelf = {
  kind: ShelfKind;
  label: string;
  pinned: boolean;
  visible: ShelfEntry[];
  overflow: ShelfEntry[];
};

/** Pinned kit leads. Otherwise the shelves stay in kind order. */
export function shelfKindOrder(kitPinned: boolean): ShelfKind[] {
  if (kitPinned) return ["kit", "notes", "paths"];
  return ["notes", "paths", "kit"];
}

/** A machine may see a spine. It may not open one for edit. */
export function canOpenHumanSpine(principal: PrincipalRole): boolean {
  return principal === "human";
}

/** Shelf-label query. Blank shows the whole shelf. Matching is local to the title. */
export function narrowByLabel<T extends { title: string }>(items: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) => item.title.toLowerCase().includes(needle));
}

/**
 * Keep every visible spine at full width.
 * When the row would crush another label, the last slot becomes +N
 * and the rest of the titles wait in the overflow list.
 */
export function packShelf<T>(items: readonly T[], capacity: number): { visible: T[]; overflow: T[] } {
  const cap = Math.max(1, Math.floor(capacity));
  if (items.length <= cap) return { visible: [...items], overflow: [] };
  const shown = Math.max(1, cap - 1);
  return { visible: items.slice(0, shown), overflow: items.slice(shown) };
}

function catalog(kind: ShelfKind, id: string, title: string): ShelfEntry {
  return { id, kind, title, note: null, status: "idle" };
}

export function entriesForKind(kind: ShelfKind, notes: readonly Note[]): ShelfEntry[] {
  if (kind === "notes") {
    return notes.map((note) => ({
      id: note.id,
      kind,
      title: bookLabel(note, notes),
      note,
      status: savedSheetStatus(),
    }));
  }
  if (kind === "paths") {
    return learningPaths.map((path) => catalog("paths", `path:${path.doorId}`, path.title));
  }
  return defaultKit.map((item) => catalog("kit", item.id, item.title));
}

export function buildShelves(input: {
  notes: readonly Note[];
  query: Partial<Record<ShelfKind, string>>;
  kitPinned: boolean;
  capacity: number;
}): PackedShelf[] {
  return shelfKindOrder(input.kitPinned).map((kind) => {
    const narrowed = narrowByLabel(entriesForKind(kind, input.notes), input.query[kind] ?? "");
    const packed = packShelf(narrowed, input.capacity);
    return {
      kind,
      label: SHELF_LABEL[kind],
      pinned: kind === "kit" && input.kitPinned,
      visible: packed.visible,
      overflow: packed.overflow,
    };
  });
}
