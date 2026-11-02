import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { assignmentKey, readingBook, readingQuill } from "../design/sprites";
import { learningPathFor } from "../fixtures/learning";
import { doors } from "../fixtures/doors";
import { useDoorShut } from "../hall/doorApi";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import { PaperWash, StudyStage, type PaperPose } from "../study/StudyStage";
import { focusNode, pickSchoolDoor, readDeepRequest } from "../nav/deepLink";
import { publishRoom } from "../nav/room";
import { PathMap } from "../study/PathMap";
import { InkPage } from "../study/InkPage";
import { ponderBody } from "../study/ponderContent";
import { isRevisionConflict } from "../study/ponderInk";
import { keepPonderNote, loadPonderNote } from "../study/ponderNote";
import type { Note } from "../storage/noteRepository";
import { noteRepo } from "../storage/services";
import { useSession } from "../storage/session";

export { primeLearnArt } from "../study/primeLearnArt";

type LearnStubProps = {
  doorId?: string;
  preview?: boolean;
};

export const LearnStub = memo(function LearnStub({ doorId: doorIdProp, preview = false }: LearnStubProps) {
  const params = useParams();
  const location = useLocation();
  const request = useMemo(() => {
    if (preview || doorIdProp) return null;
    return readDeepRequest(location.pathname, location.search, location.hash);
  }, [preview, doorIdProp, location.pathname, location.search, location.hash]);
  const routedDoor = request?.surface === "path" ? pickSchoolDoor(request.rawId, request.boundId) : "";
  const id = doorIdProp ?? params.id ?? routedDoor;
  const door = doors.find((item) => item.id === id);
  const path = learningPathFor(id);
  const shut = useDoorShut();
  const layout = useFormFactor();
  const still = useStillFrame();
  const session = useSession();
  const lampScale = layout === "portrait" ? 4 : 3;
  const bookScale = layout === "portrait" ? 5 : 4;
  const keyScale = layout === "portrait" ? 5 : 6;
  const quillScale = layout === "portrait" ? 4 : 3;
  const [pose, setPose] = useState<PaperPose>("desk");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<Note | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pathOpen, setPathOpen] = useState(request?.surface === "path");
  const [sheetId, setSheetId] = useState<string | null>(
    request?.surface === "path" ? focusNode(request.rawId, id) : null,
  );
  const [keeping, setKeeping] = useState(false);
  const [inkDoor, setInkDoor] = useState(id);
  const [inkCount, setInkCount] = useState(0);
  if (inkDoor !== id) {
    setInkDoor(id);
    setInkCount(0);
  }
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
          setDraft(ponderBody(note.content));
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

  const closeBook = () => {
    const node = dialogRef.current;
    // Close while the dialog is still mounted. Focusing the book first does
    // nothing: a modal dialog makes the desk inert, then unmounting the dialog
    // drops focus on the document.
    if (node?.open && typeof node.close === "function") node.close();
    setSheetId(null);
    setPathOpen(false);
    bookRef.current?.focus();
  };

  const closeSheet = () => {
    const nodeId = sheetId;
    setSheetId(null);
    if (nodeId) document.getElementById(`path-node-${nodeId}`)?.focus();
  };

  const linkKey = `${location.pathname}${location.search}${location.hash}`;
  const appliedLink = useRef<string | null>(null);

  useEffect(() => {
    if (preview || doorIdProp) return;
    if (appliedLink.current === linkKey) return;
    appliedLink.current = linkKey;
    if (request?.surface !== "path") return;
    const door = params.id ?? pickSchoolDoor(request.rawId, request.boundId);
    setPathOpen(true);
    setSheetId(focusNode(request.rawId, door));
  }, [preview, doorIdProp, linkKey, request, params.id]);

  useLayoutEffect(() => {
    if (preview) return;
    publishRoom({ room: "learn", teamId: null, learnId: id });
  }, [preview, id]);

  useEffect(() => {
    if (pose !== "lifted" && !pathOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pathOpen) {
        if (sheetId) {
          event.preventDefault();
          closeSheet();
          return;
        }
        closeBook();
        return;
      }
      setPose("desk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pose, pathOpen, sheetId]);

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
    const write = (existing: Note | null) =>
      keepPonderNote({
        doorId: id,
        content: draft,
        principal: session.principal,
        existing,
        repo: noteRepo,
      });
    const apply = (result: Awaited<ReturnType<typeof keepPonderNote>>) => {
      if (!result.ok) {
        setNotice(result.reason === "empty" ? "Write a line before you keep it." : "Only you can keep this note.");
        return;
      }
      setSaved(result.note);
      setDraft(ponderBody(result.note.content));
      setNotice("Kept with your notes.");
    };
    try {
      apply(await write(saved));
    } catch (error) {
      if (!isRevisionConflict(error)) {
        setNotice("That note could not be kept.");
        return;
      }
      try {
        apply(await write(await loadPonderNote(id, noteRepo)));
      } catch {
        setNotice("That note could not be kept.");
      }
    } finally {
      setKeeping(false);
    }
  };

  return (
    <main
      className="study learn-room"
      data-room="learn"
      data-place="learn"
      data-paper={pose}
      data-focus={pose === "lifted" ? "sheet" : "room"}
      data-ready={ready ? "true" : "false"}
      data-assignment={path?.assignment ? "true" : "false"}
      data-preview={preview ? "true" : "false"}
      data-deep={request?.surface ?? "room"}
      data-deep-focus={sheetId ?? "none"}
      data-path={pathOpen ? "open" : "shut"}
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
                <Sprite rows={readingBook} scale={bookScale} title="" />
              </button>
              {path?.assignment ? (
                <figure className="key-prop">
                  <Sprite rows={assignmentKey} scale={keyScale} title="Assignment key" />
                </figure>
              ) : null}
            </>
          }
          paper={
            <div
              className="paper is-lit"
              data-ink="ready"
              onClick={onPaperClick}
              onKeyDown={onPaperKeyDown}
            >
              <span className="ink-margin" aria-hidden="true" />
              <PaperWash status="working" />
              <figure className="ink-rest" aria-hidden="true">
                <Sprite rows={readingQuill} scale={quillScale} title="" />
              </figure>
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
                {preview ? null : (
                  <InkPage
                    key={id}
                    doorId={id}
                    interactive={pose === "lifted"}
                    enabled={ready}
                    principal={session.principal}
                    note={saved}
                    onNote={setSaved}
                    onStrokeCount={setInkCount}
                    onStatus={setNotice}
                  />
                )}
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
                  <p className="ponder-preview">
                    {draft.trim()
                      ? draft
                      : inkCount > 0
                        ? "Ink on this sheet. Lift it to continue."
                        : "A blank sheet. Lift it to write."}
                  </p>
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
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !sheetId) return;
            event.preventDefault();
            event.stopPropagation();
            closeSheet();
          }}
          onCancel={(event) => {
            if (!sheetId) return;
            event.preventDefault();
            closeSheet();
          }}
        >
          <h2 id="path-title">{path?.title ?? "No path on this desk"}</h2>
          <p className="path-note">A fixture. No course is loaded.</p>
          {path ? (
            <PathMap
              path={path}
              still={still}
              openId={sheetId}
              onOpen={setSheetId}
              onCloseSheet={closeSheet}
            />
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
});
