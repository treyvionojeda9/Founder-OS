import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { assignmentKey, closedBook } from "../design/sprites";
import { learningPathFor } from "../fixtures/learning";
import { doors } from "../fixtures/doors";
import { useDoorShut } from "../hall/doorApi";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import { PaperWash, StudyStage, type PaperPose } from "../study/StudyStage";
import { keepPonderNote, loadPonderNote } from "../study/ponderNote";
import type { Note } from "../storage/noteRepository";
import { noteRepo } from "../storage/services";
import { useSession } from "../storage/session";

type LearnStubProps = {
  doorId?: string;
  preview?: boolean;
};

export function LearnStub({ doorId: doorIdProp, preview = false }: LearnStubProps) {
  const params = useParams();
  const id = doorIdProp ?? params.id ?? "";
  const door = doors.find((item) => item.id === id);
  const path = learningPathFor(id);
  const shut = useDoorShut();
  const layout = useFormFactor();
  const still = useStillFrame();
  const session = useSession();
  const lampScale = layout === "portrait" ? 4 : 3;
  const bookScale = layout === "portrait" ? 5 : 4;
  const keyScale = layout === "portrait" ? 8 : 7;
  const [pose, setPose] = useState<PaperPose>("desk");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<Note | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pathOpen, setPathOpen] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bookRef = useRef<HTMLButtonElement>(null);
  const touched = useRef(false);

  useEffect(() => {
    let live = true;
    setReady(false);
    loadPonderNote(id, noteRepo)
      .then((note) => {
        if (!live) return;
        if (note && !touched.current) {
          setDraft(note.content);
          setSaved(note);
        } else if (note) {
          setSaved(note);
        }
        setReady(true);
      })
      .catch(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !pathOpen || preview) return;
    try {
      if (!node.open) node.showModal();
    } catch {
      node.setAttribute("open", "");
    }
    return () => {
      if (node.open && typeof node.close === "function") node.close();
      node.removeAttribute("open");
    };
  }, [pathOpen, preview]);

  useEffect(() => {
    if (pose !== "lifted" && !pathOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pathOpen) {
        setPathOpen(false);
        bookRef.current?.focus();
        return;
      }
      setPose("desk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pose, pathOpen]);

  const lift = () => setPose("lifted");

  const onPaperClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, textarea, input, select, label")) return;
    lift();
  };

  const onPaperKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, textarea, input, select, a")) return;
    if (target !== event.currentTarget && !target.classList.contains("paper-log")) return;
    event.preventDefault();
    lift();
  };

  const keep = async (event: FormEvent) => {
    event.preventDefault();
    if (keeping) return;
    setKeeping(true);
    try {
      const result = await keepPonderNote({
        doorId: id,
        content: draft,
        principal: session.principal,
        existing: saved,
        repo: noteRepo,
      });
      if (!result.ok) {
        setNotice(result.reason === "empty" ? "Write a line before you keep it." : "Only you can keep this note.");
        return;
      }
      setSaved(result.note);
      setDraft(result.note.content);
      setNotice("Kept with your notes.");
    } catch {
      setNotice("That note could not be kept.");
    } finally {
      setKeeping(false);
    }
  };

  const closeBook = () => {
    setPathOpen(false);
    bookRef.current?.focus();
  };

  return (
    <main
      className="study learn-room"
      data-room="learn"
      data-paper={pose}
      data-ready={ready ? "true" : "false"}
      data-assignment={path?.assignment ? "true" : "false"}
      data-preview={preview ? "true" : "false"}
    >
      <div className="pixel-bar">
        <header className="study-bar">
          <button type="button" className="text-link" onClick={() => shut(id)}>
            Back
          </button>
          <p className="study-team">{door?.name ?? "School"}</p>
        </header>
      </div>
      <div className="study-scene">
        <StudyStage
          variant="school"
          lampStatus="working"
          lampScale={lampScale}
          pose={pose}
          still={still}
          overlay={
            <>
              <button
                ref={bookRef}
                type="button"
                className="book-prop"
                aria-expanded={pathOpen}
                aria-controls={preview || !pathOpen ? undefined : "path-panel"}
                aria-label="Open the current path"
                onClick={() => setPathOpen(true)}
              >
                <Sprite rows={closedBook} scale={bookScale} title="" />
              </button>
              {path?.assignment ? (
                <figure className="key-prop">
                  <Sprite rows={assignmentKey} scale={keyScale} title="Assignment key" />
                </figure>
              ) : null}
            </>
          }
          paper={
            <div className="paper is-lit" onClick={onPaperClick} onKeyDown={onPaperKeyDown}>
              <PaperWash status="working" />
              {pose === "lifted" ? (
                <button
                  type="button"
                  className="set-down"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPose("desk");
                  }}
                >
                  Set it down
                </button>
              ) : null}
              <div className="paper-log" tabIndex={0} aria-label="Ponder">
                <h1>Ponder</h1>
                {pose === "lifted" ? (
                  <form className="ponder-form" onSubmit={keep} onClick={(event) => event.stopPropagation()}>
                    <label className="ponder-label" htmlFor={preview ? undefined : "ponder-note"}>
                      Your note
                      <textarea
                        id={preview ? undefined : "ponder-note"}
                        rows={layout === "portrait" ? 6 : 5}
                        value={draft}
                        onChange={(event) => {
                          touched.current = true;
                          setDraft(event.target.value);
                          setNotice(null);
                        }}
                      />
                    </label>
                    <button type="submit" className="keep-note" disabled={keeping}>
                      Keep this note
                    </button>
                  </form>
                ) : (
                  <p className="ponder-preview">{draft.trim() ? draft : "A blank sheet. Lift it to write."}</p>
                )}
                {notice ? (
                  <p className="ponder-status" role="status">
                    {notice}
                  </p>
                ) : null}
              </div>
            </div>
          }
        />
      </div>
      {!preview && pathOpen ? (
        <dialog
          ref={dialogRef}
          id="path-panel"
          className="path-panel"
          aria-labelledby="path-title"
          aria-modal="true"
        >
          <h2 id="path-title">{path?.title ?? "No path on this desk"}</h2>
          <p className="path-note">A fixture. No course is loaded.</p>
          {path ? (
            <>
              <h3>Current task</h3>
              <p className="path-task">{path.task.title}</p>
              <p>{path.task.detail}</p>
              {path.assignment ? (
                <>
                  <h3>Assignment</h3>
                  <p className="path-task">{path.assignment.title}</p>
                  <p>{path.assignment.prompt}</p>
                </>
              ) : (
                <p>No assignment on this desk.</p>
              )}
            </>
          ) : (
            <p>This desk has no path yet.</p>
          )}
          <button type="button" className="text-link sheet-close" onClick={closeBook}>
            Close the book
          </button>
        </dialog>
      ) : null}
    </main>
  );
}
