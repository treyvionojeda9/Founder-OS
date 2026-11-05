import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { Sprite } from "../design/Sprite";
import { StatusFrame } from "../design/StatusFrame";
import { STATUS_LEGEND } from "../design/statusFrame";
import { stapler } from "../design/sprites";
import { EmptyDesk } from "../study/EmptyDesk";
import { WorkingLamp } from "../study/WorkingLamp";
import {
  getBoardPrefs,
  keepPlaqueMark,
  markSwap,
  plaqueMark,
  seatOrder,
  setToolLabel,
  subscribeBoardPrefs,
  togglePin,
  toolLabel,
  type BoardPrefs,
} from "./boardPrefs";
import type { TeamAgent, TeamRecord } from "./chatStore";
import { SLOT_KIND_LABEL, SLOT_KINDS, slotValue } from "./plaqueSlots";

type TeamBoardProps = {
  team: TeamRecord;
  still: boolean;
  expandingId: string | null;
  onOpen: (agentId: string) => void;
  /** Open the existing swap slip once, then clear it. Does not hire. */
  seatIntent?: "swap" | null;
  onSeatIntentHandled?: () => void;
};

type Overlay =
  | { kind: "swap"; agentId: string }
  | { kind: "edit"; agentId: string };

const LABEL_ONLY = "Label only. Nothing left this board.";
const KEPT = "Kept on this board. Nothing was sent.";
const REFUSED = "That label stays here.";
const MARKED = "Marked on this board. Nothing was sent.";
const SCENES = ["pin", "swap", "edit"] as const;

function shownName(teamId: string, agent: TeamAgent, prefs: BoardPrefs): string {
  return plaqueMark(teamId, agent.id, prefs)?.name ?? agent.name;
}

function shownTitle(teamId: string, agent: TeamAgent, prefs: BoardPrefs): string | undefined {
  const mark = plaqueMark(teamId, agent.id, prefs);
  if (mark) return mark.title.length > 0 ? mark.title : undefined;
  return agent.title;
}

/**
 * Roster plaques and the stapler tray.
 * Swap, Edit, pins, and tool labels stay in local marks. They do not approve and they do not leave the board.
 */
export function TeamBoard({
  team,
  still,
  expandingId,
  onOpen,
  seatIntent = null,
  onSeatIntentHandled,
}: TeamBoardProps) {
  const lampScale = 3;
  const staplerScale = 3;
  const prefs = useSyncExternalStore(subscribeBoardPrefs, getBoardPrefs, getBoardPrefs);
  const ordered = seatOrder(team.agents, prefs.pins[team.id] ?? []);
  const [slip, setSlip] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const closeOverlay = () => {
    setOverlay(null);
    const returnTo = opener.current;
    opener.current = null;
    if (returnTo?.isConnected) returnTo.focus();
  };

  useEffect(() => {
    if (!slip && !overlay) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (overlay) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      setSlip(false);
      setNote(null);
      setActiveTool(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slip, overlay]);

  useEffect(() => {
    if (seatIntent !== "swap") return;
    const first = seatOrder(team.agents, getBoardPrefs().pins[team.id] ?? [])[0];
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOverlay({ kind: "swap", agentId: first?.id ?? "" });
    onSeatIntentHandled?.();
  }, [seatIntent, team.agents, team.id, onSeatIntentHandled]);

  useEffect(() => {
    if (!overlay) return;
    const root = overlayRef.current;
    root?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button, input, textarea")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay]);

  const openOverlay = (next: Overlay, target: HTMLElement) => {
    opener.current = target;
    if (next.kind === "edit") {
      const agent = team.agents.find((item) => item.id === next.agentId);
      setEditName(agent ? shownName(team.id, agent, getBoardPrefs()) : "");
      setEditTitle(agent ? (shownTitle(team.id, agent, getBoardPrefs()) ?? "") : "");
    }
    setOverlay(next);
  };

  const keepLabel = (event: FormEvent) => {
    event.preventDefault();
    if (!activeTool) return;
    const saved = setToolLabel(team.id, activeTool, draft);
    setNote(saved ? KEPT : REFUSED);
    if (saved) setDraft(toolLabel(team.id, activeTool));
  };

  const keepEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!overlay || overlay.kind !== "edit") return;
    const saved = keepPlaqueMark(team.id, overlay.agentId, { name: editName, title: editTitle });
    setNote(saved ? KEPT : REFUSED);
    if (saved) closeOverlay();
  };

  const overlayAgent = overlay ? ordered.find((agent) => agent.id === overlay.agentId) : undefined;
  const others = overlayAgent ? ordered.filter((agent) => agent.id !== overlayAgent.id) : [];

  return (
    <section
      className="team-board"
      data-still={still ? "true" : "false"}
      data-count={team.agents.length}
      data-mount="wall"
      aria-label="Team board"
      data-material="plaster"
    >
      <div className="board-wall" data-material="plaster" aria-hidden="true" />
      <div className="board-wainscot" data-material="wainscot" aria-hidden="true" />
      <div className="board-floor" data-material="floor" aria-hidden="true" />
      <div className="board-void">
        <div className="board-hanger">
          <div className="board-cleat" aria-hidden="true" />
          <div className="board-face">
            <span className="board-nail nail-a" aria-hidden="true" />
            <span className="board-nail nail-b" aria-hidden="true" />
            <span className="board-nail nail-c" aria-hidden="true" />
            <span className="board-nail nail-d" aria-hidden="true" />
            <header className="board-head">
              <h1>Team</h1>
              <p className="board-team">{team.name}</p>
            </header>
            <p className="board-legend">{STATUS_LEGEND}</p>
            <ul className="plaque-list">
              {ordered.length === 0 ? (
                <li className="plaque-seat" data-empty="true">
                  <EmptyDesk
                    still={still}
                    onSeat={() => {
                      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                      setOverlay({ kind: "swap", agentId: "" });
                    }}
                  />
                </li>
              ) : null}
              {ordered.map((agent) => {
                const pinned = (prefs.pins[team.id] ?? []).includes(agent.id);
                const name = shownName(team.id, agent, prefs);
                const title = shownTitle(team.id, agent, prefs);
                return (
                  <li
                    key={agent.id}
                    className="plaque-seat"
                    data-agent={agent.id}
                    data-pinned={pinned ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className="plaque"
                      data-agent={agent.id}
                      data-status={agent.status}
                      data-plaque="engraved"
                      data-expanding={expandingId === agent.id ? "true" : "false"}
                      onClick={() => onOpen(agent.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowRight") return;
                        event.preventDefault();
                        document.getElementById(sceneId(team.id, agent.id, "pin"))?.focus();
                      }}
                    >
                      <span className="plaque-lamp">
                        <WorkingLamp status={agent.status} scale={lampScale} still={still} />
                      </span>
                      <span className="plaque-plate">
                        <span className="plaque-name">{name}</span>
                        {title ? <span className="plaque-title">{title}</span> : null}
                        <span className="plaque-slots">
                          {SLOT_KINDS.map((kind) => (
                            <span key={kind} className="plaque-slot" data-slot={kind}>
                              <span className="plaque-slot-kind">{SLOT_KIND_LABEL[kind]}</span>
                              <span className="plaque-slot-value">{slotValue(agent, kind)}</span>
                            </span>
                          ))}
                        </span>
                      </span>
                      <StatusFrame className="plaque-state" status={agent.status} still={still} />
                    </button>
                    <div className="seat-tools" role="toolbar" aria-label="Seat">
                      <button
                        type="button"
                        id={sceneId(team.id, agent.id, "pin")}
                        className="brass-pin scene-button"
                        data-agent={agent.id}
                        data-scene="pin"
                        data-pin={pinned ? "in" : "out"}
                        aria-pressed={pinned}
                        tabIndex={-1}
                        onClick={() => togglePin(team.id, agent.id)}
                        onKeyDown={(event) => onSceneKey(event, team.id, agent.id, "pin")}
                      >
                        <span className="pin-mark" aria-hidden="true">
                          <span className="pin-head" />
                          <span className="pin-stem" />
                        </span>
                        <span className="scene-caption">Brass pin</span>
                      </button>
                      <button
                        type="button"
                        id={sceneId(team.id, agent.id, "swap")}
                        className="scene-button scene-swap"
                        data-agent={agent.id}
                        data-scene="swap"
                        tabIndex={-1}
                        onClick={(event) => openOverlay({ kind: "swap", agentId: agent.id }, event.currentTarget)}
                        onKeyDown={(event) => onSceneKey(event, team.id, agent.id, "swap")}
                      >
                        Swap seat
                      </button>
                      <button
                        type="button"
                        id={sceneId(team.id, agent.id, "edit")}
                        className="scene-button scene-edit"
                        data-agent={agent.id}
                        data-scene="edit"
                        tabIndex={-1}
                        onClick={(event) => openOverlay({ kind: "edit", agentId: agent.id }, event.currentTarget)}
                        onKeyDown={(event) => onSceneKey(event, team.id, agent.id, "edit")}
                      >
                        Edit agent
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="board-foot tools-dock" data-dock="tools" data-reach="local">
              {!slip && team.tools.length > 0 ? (
                <p className="dock-labels">
                  {team.tools.map((tool) => (
                    <span key={tool} className="dock-label" data-tool={tool}>
                      {toolLabel(team.id, tool, prefs)}
                    </span>
                  ))}
                </p>
              ) : null}
              <button
                type="button"
                className="stapler"
                data-reach="local"
                aria-expanded={slip}
                aria-haspopup="menu"
                aria-controls={slip && team.tools.length > 0 ? "fixture-tools" : undefined}
                onClick={() => {
                  setSlip((open) => !open);
                  setNote(null);
                  setActiveTool(null);
                }}
              >
                <Sprite rows={stapler} scale={staplerScale} title="" />
                <span className="stapler-label">Stapler</span>
              </button>
              {slip && team.tools.length === 0 ? (
                <p className="tool-slip tool-blank" role="status">
                  This slip is blank.
                </p>
              ) : null}
              {slip && team.tools.length > 0 ? (
                <div id="fixture-tools" className="tool-slip" role="menu" aria-label="Fixture tools">
                  {team.tools.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      role="menuitem"
                      data-tool={tool}
                      onClick={() => {
                        setActiveTool(tool);
                        setDraft(toolLabel(team.id, tool));
                        setNote(LABEL_ONLY);
                      }}
                    >
                      {toolLabel(team.id, tool, prefs)}
                    </button>
                  ))}
                </div>
              ) : null}
              {slip && activeTool ? (
                <form className="tool-label" data-reach="local" onSubmit={keepLabel}>
                  <label htmlFor="local-tool-label">
                    Local label
                    <input
                      id="local-tool-label"
                      value={draft}
                      autoComplete="off"
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  </label>
                  <button type="submit">Keep label</button>
                </form>
              ) : null}
            </div>
            {note ? (
              <p className="tool-note" role="status">
                {note}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {overlay && (overlayAgent || overlay.kind === "swap") ? (
        <div
          ref={overlayRef}
          className="board-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="board-overlay-title"
          data-overlay={overlay.kind}
          data-reach="local"
          data-still={still ? "true" : "false"}
          data-frames="1"
        >
          <div className="board-scrim" onClick={closeOverlay} />
          {overlay.kind === "swap" ? (
            <div className="board-slip" data-material="paper">
              <h2 id="board-overlay-title">Swap seat</h2>
              <p>Swap this seat with another on the board. Nothing is sent.</p>
              {others.length === 0 ? <p>No other seat on this board.</p> : null}
              <div className="board-slip-actions">
                {others.map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    data-swap-with={other.id}
                    onClick={() => {
                      if (overlayAgent && markSwap(team.id, overlayAgent.id, other.id)) setNote(MARKED);
                      closeOverlay();
                    }}
                  >
                    {`Swap with ${shownName(team.id, other, prefs)}`}
                  </button>
                ))}
                <button type="button" onClick={closeOverlay}>
                  Set it aside
                </button>
              </div>
            </div>
          ) : (
            <form className="board-slip" data-material="paper" onSubmit={keepEdit}>
              <h2 id="board-overlay-title">Edit agent</h2>
              <p>This changes the agent everywhere. This sheet does not send it.</p>
              <label htmlFor="edit-agent-name">
                Name
                <input
                  id="edit-agent-name"
                  value={editName}
                  autoComplete="off"
                  onChange={(event) => setEditName(event.target.value)}
                />
              </label>
              <label htmlFor="edit-agent-role">
                Role
                <input
                  id="edit-agent-role"
                  value={editTitle}
                  autoComplete="off"
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </label>
              <div className="board-slip-actions">
                <button type="button" onClick={closeOverlay}>
                  Set it aside
                </button>
                <button type="submit">Keep on this sheet</button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}

function sceneId(teamId: string, agentId: string, scene: (typeof SCENES)[number]): string {
  return `seat-${scene}-${teamId}-${agentId}`;
}

function onSceneKey(
  event: KeyboardEvent<HTMLButtonElement>,
  teamId: string,
  agentId: string,
  scene: (typeof SCENES)[number],
) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  event.preventDefault();
  const index = SCENES.indexOf(scene);
  const next = event.key === "ArrowRight" ? (index + 1) % SCENES.length : (index + SCENES.length - 1) % SCENES.length;
  if (event.key === "ArrowLeft" && index === 0) {
    document.querySelector<HTMLButtonElement>(`.plaque[data-agent="${CSS.escape(agentId)}"]`)?.focus();
    return;
  }
  document.getElementById(sceneId(teamId, agentId, SCENES[next]))?.focus();
}
