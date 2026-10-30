import { useEffect, useState, type FormEvent } from "react";
import { Sprite } from "../design/Sprite";
import { deskLampOn, forgeNote } from "../design/sprites";
import { useFormFactor } from "../hooks/useFormFactor";
import { usePaperSettle } from "../study/paperSettle";
import { useStillFrame } from "../hooks/useStillFrame";
import type { Note } from "../storage/noteRepository";
import { noteRepo } from "../storage/services";
import { useSession } from "../storage/session";
import {
  bookLabel,
  booksPerShelf,
  listShelfNotes,
  saveShelfNote,
  shelfBays,
  spineLines,
  spineMark,
} from "./shelfNote";

type LibraryShelfProps = {
  teamId: string;
  preview?: boolean;
};

type OpenSheet = { kind: "new" } | { kind: "note"; note: Note };

export function LibraryShelf({ teamId, preview = false }: LibraryShelfProps) {
  const layout = useFormFactor();
  const still = useStillFrame();
  const session = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<OpenSheet | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    setReady(false);
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

  const closeSheet = () => {
    setOpen(null);
    setDraft("");
    setNotice(null);
  };

  const openNote = (note: Note) => {
    setOpen({ kind: "note", note });
    setDraft(note.content);
    setNotice(null);
  };

  const placeSheet = () => {
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

  const settle = usePaperSettle(open ? "lifted" : "desk", still);
  const perRow = booksPerShelf(layout);
  const bays = shelfBays(notes, perRow);
  const sheetScale = layout === "portrait" ? 3 : 2;
  const heading = open?.kind === "note" ? bookLabel(open.note, notes) : "New sheet";

  return (
    <section
      className="library-room"
      data-ready={ready ? "true" : "false"}
      data-empty={ready && notes.length === 0 ? "true" : "false"}
      data-open={open ? "true" : "false"}
      data-vault="human"
      data-material="plaster"
      aria-label="Human shelf"
    >
      <div className="bookcase">
        {open ? null : (
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
          {bays.map((bay, bayIndex) => (
            <div key={bayIndex} className="shelf-bay" data-empty={bay.length === 0 ? "true" : "false"}>
              {bay.map((note) => {
                const index = notes.indexOf(note);
                const mark = spineMark(index);
                const label = bookLabel(note, notes);
                const lines = spineLines(label);
                return (
                  <button
                    key={note.id}
                    type="button"
                    className="spine"
                    data-tone={mark.tone}
                    data-band={mark.band}
                    aria-label={label}
                    onClick={() => openNote(note)}
                  >
                    <span className="spine-body" aria-hidden="true">
                      <span className="spine-band" />
                    </span>
                    <span className="spine-title" data-label="pixel" aria-hidden="true">
                      {lines.map((line, lineIndex) => (
                        <span key={`${lineIndex}-${line}`} className="spine-line">
                          {line}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
              {ready && notes.length === 0 && !open && bayIndex === 1 ? (
                <div className="shelf-empty" role="status">
                  <p>The shelf is bare.</p>
                  <p className="shelf-next">Place a sheet.</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="case-base">
          <button type="button" className="place-sheet" onClick={placeSheet}>
            <Sprite rows={forgeNote} scale={sheetScale} title="" />
            Place a sheet
          </button>
        </div>
      </div>
      <div className="library-floor" data-material="floor" aria-hidden="true" />
      {open ? (
        <div
          className="library-paper paper-slot"
          data-pose="lifted"
          data-still={still ? "true" : "false"}
          data-settle={open && settle ? settle : undefined}
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
