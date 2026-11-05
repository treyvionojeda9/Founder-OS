import { useLayoutEffect, useRef } from "react";
import { StatusFrame } from "../design/StatusFrame";
import { applyDrawerChoice, drawerFrames, papersFor, stepDrawer } from "./deskDrawer";

type DeskDrawerProps = {
  teamId: string;
  agentId: string;
  agentName: string;
  describedBy: string;
  open: boolean;
  still: boolean;
  cursor: number;
  /** The desk already expands in place. Pass false only when that path is absent. */
  expandWired?: boolean;
  onToggle: () => void;
  onHighlight: (index: number) => void;
  onChoose: (index: number) => void;
};

/**
 * Pixel pull under the desk front, and the local paper list it opens.
 * Tap or Enter on the pull. The list is a skim. It does not approve.
 * The pull stays out of the desk tab walk so pause and the next desk keep their places.
 */
export function DeskDrawer({
  teamId,
  agentId,
  agentName,
  describedBy,
  open,
  still,
  cursor,
  expandWired = true,
  onToggle,
  onHighlight,
  onChoose,
}: DeskDrawerProps) {
  const pullRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const papers = papersFor(teamId, agentId);
  const frames = drawerFrames(still);
  const listId = `desk-drawer-${agentId}`;

  useLayoutEffect(() => {
    const pull = pullRef.current;
    const host = pull?.closest("li");
    const front = host?.querySelector<HTMLElement>(".agent-desk-front");
    if (!pull || !host || !front) return;

    const place = () => {
      const face = front.getBoundingClientRect();
      const box = host.getBoundingClientRect();
      if (face.width < 2 || box.width < 2) return;
      const x = face.right - box.left - 4;
      const y = face.top - box.top + face.height * 0.55;
      host.style.setProperty("--pull-x", `${x}px`);
      host.style.setProperty("--pull-y", `${y}px`);
      host.style.setProperty("--drawer-top", `${face.bottom - box.top + 4}px`);
      pull.dataset.placed = "true";
      host.querySelector<HTMLElement>(".desk-drawer")?.setAttribute("data-placed", "true");
    };

    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
    };
  }, [agentId, open]);

  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
  }, [open]);

  const choose = (index: number) => {
    onHighlight(index);
    if (applyDrawerChoice({ expandWired, index }).expand) onChoose(index);
  };

  return (
    <>
      <button
        ref={pullRef}
        type="button"
        className="desk-drawer-pull"
        tabIndex={-1}
        data-agent={agentId}
        data-open={open ? "true" : "false"}
        data-pattern={open ? "pulled" : "shut"}
        data-still={still ? "true" : "false"}
        data-frames={frames}
        data-lighting="ember"
        data-reach="local"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        aria-label={open ? "Close desk drawer" : "Desk drawer"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <span className="drawer-lip" aria-hidden="true" />
        <span className="drawer-knob" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={listRef}
          id={listId}
          className="desk-drawer"
          role="listbox"
          tabIndex={0}
          aria-label={`${agentName} work in progress`}
          aria-activedescendant={cursor >= 0 ? papers[cursor]?.id : undefined}
          data-agent={agentId}
          data-lighting="ember"
          data-reach="local"
          data-still={still ? "true" : "false"}
          data-frames={frames}
          data-count={papers.length}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              event.stopPropagation();
              onHighlight(stepDrawer(cursor, papers.length, event.key === "ArrowDown" ? 1 : -1));
              return;
            }
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (cursor < 0) return;
            choose(cursor);
          }}
        >
          <p className="desk-drawer-kicker">Work in progress</p>
          <div className="desk-drawer-list">
            {papers.map((paper, index) => {
              const marked = index === cursor;
              return (
                <div
                  key={paper.id}
                  id={paper.id}
                  role="option"
                  aria-selected={marked}
                  data-paper={paper.id}
                  data-status={paper.status}
                  data-selected={marked ? "true" : "false"}
                  data-pattern={marked ? "mark" : "plain"}
                  className="desk-drawer-row"
                  onMouseEnter={() => onHighlight(index)}
                  onClick={(event) => {
                    event.stopPropagation();
                    choose(index);
                  }}
                >
                  <StatusFrame className="desk-drawer-frame" status={paper.status} still={still} />
                  <span className="desk-drawer-title">{paper.title}</span>
                </div>
              );
            })}
          </div>
          <p className="desk-drawer-note">Local fixture · not verified</p>
        </div>
      ) : null}
    </>
  );
}
