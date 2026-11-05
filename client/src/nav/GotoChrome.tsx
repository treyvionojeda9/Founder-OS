import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doors } from "../fixtures/doors";
import { useStillFrame } from "../hooks/useStillFrame";
import { settingsRepo } from "../storage/services";
import { teamById } from "../team/chatStore";
import {
  CHORD_MS,
  buildLedger,
  collectSnapshot,
  isTypingTarget,
  reduceChord,
  roomHeading,
  type ChordState,
  type GotoPlace,
  type LedgerItem,
} from "./chord";
import { LEDGER_EVENT } from "./FlamePress";
import {
  fallbackRoom,
  getRoom,
  nextGotoSeq,
  publishRoom,
  rememberedTeam,
  stampMatchesPath,
  useRoomStamp,
} from "./room";

/**
 * Go-to chords and the paper command ledger.
 * Items only open a door, a desk, or a page that is already in the hall.
 * They never approve and they never write a vault.
 */
export function GotoChrome() {
  const navigate = useNavigate();
  const location = useLocation();
  const still = useStillFrame();
  const stamp = useRoomStamp();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [armedAt, setArmedAt] = useState<number | null>(null);
  const chord = useRef<ChordState>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const activeRef = useRef(0);
  const itemsRef = useRef<LedgerItem[]>([]);
  const stampRef = useRef(stamp);
  openRef.current = open;
  activeRef.current = active;
  stampRef.current = stamp;

  const items = open ? buildLedger(collectSnapshot(document, stamp), doors, stamp.teamId ? (teamById(stamp.teamId) ?? null) : null) : [];
  itemsRef.current = items;

  useLayoutEffect(() => {
    if (stampMatchesPath(getRoom(), location.pathname)) return;
    publishRoom(fallbackRoom(location.pathname));
  }, [location.pathname, stamp.room, stamp.teamId, stamp.learnId]);

  useEffect(() => {
    document.documentElement.dataset.chord = armedAt === null ? "idle" : "armed";
  }, [armedAt]);

  useEffect(() => {
    if (armedAt === null) return;
    const wait = Math.max(0, CHORD_MS - (Date.now() - armedAt));
    const timer = window.setTimeout(() => {
      chord.current = null;
      setArmedAt(null);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [armedAt]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const frame = window.requestAnimationFrame(() => listRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, stamp.room]);

  useEffect(() => {
    const id = items[active]?.id;
    if (!open || !id) return;
    document.getElementById(`ledger-opt-${id}`)?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, items]);

  const go = (place: GotoPlace) => {
    const seq = nextGotoSeq();
    if (place === "work" || place === "school") {
      void settingsRepo.setSection(place).catch(() => undefined);
      navigate("/home", { state: { gotoSection: place, gotoSeq: seq } });
      return;
    }
    const current = stampRef.current.teamId;
    const teamId = current && teamById(current) ? current : rememberedTeam();
    navigate(`/team/${teamId}`, { state: { gotoPlace: place, gotoSeq: seq } });
  };

  const run = (entry: LedgerItem) => {
    const sheet = document.querySelector("dialog.command-ledger");
    if (sheet instanceof HTMLDialogElement && sheet.open && typeof sheet.close === "function") sheet.close();
    setOpen(false);
    const action = entry.action;
    window.setTimeout(() => {
      if (action.type === "goto") {
        go(action.place);
        return;
      }
      if (action.type === "href") {
        navigate(action.to);
        return;
      }
      const node = document.querySelector(action.selector);
      if (!(node instanceof HTMLElement)) return;
      if (action.type === "focus") node.focus();
      else node.click();
    }, 0);
  };
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const onLedger = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);
      const now = Date.now();
      const result = reduceChord(
        chord.current,
        {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          repeat: event.repeat,
        },
        now,
        typing,
      );
      if (result.ledger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        chord.current = null;
        setArmedAt(null);
        setOpen((value) => !value);
        return;
      }
      if (result.place) {
        event.preventDefault();
        event.stopImmediatePropagation();
        chord.current = null;
        setArmedAt(null);
        runRef.current({
          id: "chord",
          label: "",
          hint: "",
          group: "anywhere",
          action: { type: "goto", place: result.place },
        });
        return;
      }
      if (result.consume) event.preventDefault();
      if (result.state) {
        chord.current = result.state;
        setArmedAt(result.state.armedAt);
      } else if (chord.current) {
        chord.current = null;
        setArmedAt(null);
      }

      if (!openRef.current || typing) return;
      const rows = itemsRef.current;
      if (event.key === "Tab") {
        const root = document.querySelector(".command-ledger");
        if (!(root instanceof HTMLElement)) return;
        const items = [...root.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])")].filter(
          (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0,
        );
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.shiftKey ? items[(index <= 0 ? items.length : index) - 1] : items[(index + 1) % items.length];
        next?.focus();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const node = document.querySelector("dialog.command-ledger");
        if (node instanceof HTMLDialogElement && node.open && typeof node.close === "function") node.close();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActive((index) => Math.min(rows.length - 1, index + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActive((index) => Math.max(0, index - 1));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActive(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActive(Math.max(0, rows.length - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const entry = rows[activeRef.current];
        if (entry) runRef.current(entry);
      }
    };
    window.addEventListener(LEDGER_EVENT, onLedger);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener(LEDGER_EVENT, onLedger);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.closest("dialog");
    if (!(node instanceof HTMLDialogElement)) return;
    try {
      if (!node.open) node.showModal();
    } catch {
      node.setAttribute("open", "");
    }
    node.dataset.modal = node.open ? "true" : "false";
    return () => {
      if (node.open && typeof node.close === "function") node.close();
    };
  }, [open]);

  if (!open) return null;

  let seen: "room" | "anywhere" | null = null;
  const heading = roomHeading(stamp.room);

  return (
    <dialog
      className="command-ledger"
      aria-modal="true"
      aria-label="Command ledger"
      data-ledger="open"
      onCancel={(event) => {
        event.preventDefault();
        setOpen(false);
      }}
      data-room={stamp.room}
      data-still={still ? "true" : "false"}
      data-frames={still ? "1" : "4"}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="ledger-sheet">
        <h2 className="ledger-title">Ledger</h2>
        <div
          ref={listRef}
          className="ledger-list"
          role="listbox"
          aria-label="Commands"
          aria-activedescendant={items[active] ? `ledger-opt-${items[active].id}` : undefined}
          tabIndex={0}
        >
          {items.map((entry, index) => {
            const label = entry.group === "room" ? heading : "Anywhere";
            const show = seen !== entry.group;
            seen = entry.group;
            return (
              <div key={entry.id}>
                {show ? (
                  <p className="ledger-group" data-group={entry.group}>
                    {label}
                  </p>
                ) : null}
                <div
                  id={`ledger-opt-${entry.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active ? "true" : "false"}
                  data-group={entry.group}
                  data-pattern={index === active ? "mark" : "plain"}
                  className="ledger-option"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(entry)}
                >
                  <span className="ledger-label">{entry.label}</span>
                  <span className="ledger-hint">{entry.hint}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
