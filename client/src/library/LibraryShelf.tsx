import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Sprite } from "../design/Sprite";
import { deskLampOn, forgeNote } from "../design/sprites";
import { savedSheetStatus } from "../design/statusFrame";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import type { Note } from "../storage/noteRepository";
import { noteRepo } from "../storage/services";
import { useSession } from "../storage/session";
import { usePaperSettle } from "../study/paperSettle";
import { EmptyShelf } from "./EmptyShelf";
import { ShelfSpine } from "./ShelfSpine";
import {
  SHELF_LABEL,
  buildShelves,
  canOpenHumanSpine,
  type ShelfEntry,
  type ShelfKind,
} from "./shelfLayout";
import { bookLabel, booksPerShelf, listShelfNotes, saveShelfNote, spineMark } from "./shelfNote";
import { isKitPinned, setKitPinned, subscribeShelfPrefs } from "./shelfPrefs";

type LibraryShelfProps = {
  teamId: string;
  preview?: boolean;
};

type OpenSheet =
  | { kind: "new" }
  | { kind: "note"; note: Note }
  | { kind: "overflow"; shelf: ShelfKind; entries: ShelfEntry[] };

const REFUSAL = "Only you can open this sheet.";

export function LibraryShelf({ teamId, preview = false }: LibraryShelfProps) {
  const layout = useFormFactor();
  const still = useStillFrame();
  const session = useSession();
  const kitPinned = useSyncExternalStore(subscribeShelfPrefs, () => isKitPinned(teamId), () => true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<OpenSheet | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState<Partial<Record<ShelfKind, string>>>({});
  const overflowCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    setReady(false);
    setQuery({});
    setOpen(null);
    setDraft("");
    setNotice(null);
    listShelfNotes(teamId, noteRepo)
      .then((rows) => {
        if (!live) return;
        setNotes(rows);
        setReady(true);
      })
      .catch(() => {
        if (!live) return;
        setNotes([]);
        setReady(true);
      });
    return () => {
      live = false;
    };
  }, [teamId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(null);
      setDraft("");
      setNotice(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open?.kind !== "overflow") return;
    overflowCloseRef.current?.focus();
  }, [open]);

  const closeSheet = () => {
    setOpen(null);
    setDraft("");
    setNotice(null);
  };

  const refuseEdit = () => {
    setOpen(null);
    setDraft("");
    setNotice(REFUSAL);
  };

  const openNote = (note: Note) => {
    if (!canOpenHumanSpine(session.principal)) {
      refuseEdit();
      return;
    }
    setOpen({ kind: "note", note });
    setDraft(note.content);
    setNotice(null);
  };

  const placeSheet = () => {
    if (!canOpenHumanSpine(session.principal)) {
      refuseEdit();
      return;
    }
    setOpen({ kind: "new" });
    setDraft("");
    setNotice(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const existing = open?.kind === "note" ? open.note : null;
      const result = await saveShelfNote({
        teamId,
        content: draft,
        principal: session.principal,
        existing,
        repo: noteRepo,
      });
      if (!result.ok) {
        setNotice(
          result.reason === "empty" ? "Write a line before you save it." : "Only you can write on this sheet.",
        );
        return;
      }
      const rows = await listShelfNotes(teamId, noteRepo);
      setNotes(rows);
      setOpen({ kind: "note", note: result.note });
      setDraft(result.note.content);
      setNotice("Saved on the shelf.");
    } catch {
      setNotice("That note could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const onFilter = (kind: ShelfKind, value: string) => {
    setQuery((prev) => ({ ...prev, [kind]: value }));
    setOpen((current) => (current?.kind === "overflow" && current.shelf === kind ? null : current));
  };

  const settle = usePaperSettle(open?.kind === "new" || open?.kind === "note" ? "lifted" : "desk", still);
  const editing = open?.kind === "new" || open?.kind === "note";
  const shelves = buildShelves({
    notes,
    query,
    kitPinned,
    capacity: booksPerShelf(layout),
  });
  const sheetScale = layout === "portrait" ? 3 : 2;
  const heading = open?.kind === "note" ? bookLabel(open.note, notes) : "New sheet";

  return (
    <section
      className="library-room"
      data-ready={ready ? "true" : "false"}
      data-empty={ready && notes.length === 0 ? "true" : "false"}
      data-open={editing ? "true" : "false"}
      data-still={still ? "true" : "false"}
      data-pinned-kit={kitPinned ? "true" : "false"}
      data-vault="human"
      data-material="plaster"
      aria-label="Human shelf"
    >
      <div className="bookcase">
        {editing ? null : (
          <header className="library-head">
            <h1>Library</h1>
            <p>Human notes for this team.</p>
          </header>
        )}
        <figure className="library-lamp">
          <Sprite rows={deskLampOn} scale={2} title="Desk lamp, lit" />
        </figure>
        <div className="case-crown" aria-hidden="true" />
        <div className="shelf-bays" data-material="panel">
          {shelves.map((shelf) => {
            const filtering = (query[shelf.kind] ?? "").trim().length > 0;
            const bare = shelf.kind === "notes" && ready && notes.length === 0 && !editing;
            const none = filtering && shelf.visible.length === 0 && shelf.overflow.length === 0;
            return (
              <div
                key={shelf.kind}
                className="shelf-bay"
                data-kind={shelf.kind}
                data-pinned={shelf.pinned ? "true" : "false"}
                data-overflow={shelf.overflow.length}
                data-empty={bare ? "true" : "false"}
              >
                <div className="shelf-plate">
                  <div className="shelf-plate-top">
                    <span className="shelf-kind" data-label="pixel">
                      {shelf.label}
                    </span>
                    {shelf.kind === "kit" ? (
                      <button
                        type="button"
                        className="brass-pin scene-button shelf-pin"
                        data-pin={kitPinned ? "in" : "out"}
                        aria-pressed={kitPinned}
                        aria-label={kitPinned ? "Unpin default kit" : "Pin default kit"}
                        onClick={() => setKitPinned(teamId, !kitPinned)}
                      >
                        <span className="pin-mark" aria-hidden="true">
                          <span className="pin-head" />
                          <span className="pin-stem" />
                        </span>
                        <span className="scene-caption">{kitPinned ? "Unpin" : "Pin"}</span>
                      </button>
                    ) : null}
                  </div>
                  <input
                    className="shelf-filter"
                    aria-label={`Filter ${shelf.label}`}
                    placeholder="Narrow"
                    autoComplete="off"
                    value={query[shelf.kind] ?? ""}
                    onChange={(event) => onFilter(shelf.kind, event.target.value)}
                  />
                </div>
                <div className="shelf-books" data-empty={bare ? "true" : "false"}>
                  {shelf.visible.map((entry, index) => {
                    const mark = spineMark(index);
                    return (
                      <ShelfSpine
                        key={entry.id}
                        id={entry.id}
                        label={entry.title}
                        tone={mark.tone}
                        band={mark.band}
                        status={entry.note ? savedSheetStatus() : entry.status}
                        still={still}
                        onClick={entry.note ? () => openNote(entry.note as Note) : undefined}
                      />
                    );
                  })}
                  {shelf.overflow.length > 0 ? (
                    <button
                      type="button"
                      className="spine spine-more"
                      data-tone="paper"
                      data-band="broad"
                      data-overflow={shelf.overflow.length}
                      aria-label={`+${shelf.overflow.length} more on ${shelf.label}`}
                      onClick={() => setOpen({ kind: "overflow", shelf: shelf.kind, entries: shelf.overflow })}
                    >
                      <span className="spine-body" aria-hidden="true">
                        <span className="spine-band" />
                      </span>
                      <span className="spine-title" data-label="pixel" aria-hidden="true">
                        <span className="spine-line">+{shelf.overflow.length}</span>
                      </span>
                    </button>
                  ) : null}
                  {bare ? <EmptyShelf still={still} onAdd={placeSheet} /> : null}
                  {none ? <p className="shelf-none">None on this shelf.</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="case-base">
          <button type="button" className="place-sheet" onClick={placeSheet}>
            <Sprite rows={forgeNote} scale={sheetScale} title="" />
            Place a sheet
          </button>
          {notice && !editing ? (
            <p className="shelf-refusal" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
      <div className="library-floor" data-material="floor" aria-hidden="true" />
      {open?.kind === "overflow" ? (
        <div
          className="overflow-slip"
          role="region"
          aria-label={`More on ${SHELF_LABEL[open.shelf]}`}
          data-still={still ? "true" : "false"}
          data-pose="shown"
        >
          <button type="button" className="set-down" ref={overflowCloseRef} onClick={closeSheet}>
            Set it down
          </button>
          <h2>More on {SHELF_LABEL[open.shelf]}</h2>
          <ul className="overflow-titles">
            {open.entries.map((entry) => (
              <li key={entry.id}>
                {entry.note ? (
                  <button type="button" className="overflow-title" onClick={() => openNote(entry.note as Note)}>
                    {entry.title}
                  </button>
                ) : (
                  <span className="overflow-title">{entry.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {editing ? (
        <div
          className="library-paper paper-slot"
          data-pose="lifted"
          data-still={still ? "true" : "false"}
          data-settle={settle ? settle : undefined}
        >
          <div className="paper is-lit">
            <button type="button" className="set-down" onClick={closeSheet}>
              Set it down
            </button>
            <div className="paper-log">
              <h1>{heading}</h1>
              <form className="shelf-form" onSubmit={save}>
                <label className="shelf-label" htmlFor={preview ? undefined : "shelf-note"}>
                  Your note
                  <textarea
                    id={preview ? undefined : "shelf-note"}
                    rows={layout === "portrait" ? 8 : 6}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setNotice(null);
                    }}
                  />
                </label>
                <button type="submit" className="save-note" disabled={saving}>
                  Save this note
                </button>
              </form>
              {notice ? (
                <p className="shelf-status" role="status">
                  {notice}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
