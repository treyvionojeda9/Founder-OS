import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Sprite } from "../design/Sprite";
import { StatusFrame } from "../design/StatusFrame";
import { STATUS_LEGEND } from "../design/statusFrame";
import { faceWashByMark, paperLightPool, deskLightPool, raisedHand, seatMark, seatedByMark } from "../design/sprites/seatedAgent";
import { useFormFactor } from "../hooks/useFormFactor";
import { linesForAgent, type TeamAgent } from "../team/chatStore";
import { pauseSnapshot, subscribeWorkPause, toggleWorkPause } from "./deskPause";
import { deskStampFor, latestSheetLine } from "./deskStamp";
import { setTileCount, subscribeDeskTiles, TILE_COUNTS, TILE_TAP_MS, tileCount, type TileCount } from "./deskTiles";
import { SpaceWash } from "../hall/SpaceWash";
import { EmptyDesk } from "./EmptyDesk";
import { MailTray } from "./MailTray";
import type { MailItem } from "./mailSlot";
import { DeskDrawer } from "./DeskDrawer";
import { PipelineRooms } from "./PipelineRooms";
import { deskInStage, stageForStatus, type PipelineStageId } from "./pipelineRooms";
import { WorkingLamp } from "./WorkingLamp";

type DeskGridProps = {
  teamId: string;
  agents: readonly TeamAgent[];
  still: boolean;
  expandingId: string | null;
  /** The paper is open over this room. The desks stay mounted and stop taking input. */
  covered?: boolean;
  sheet?: ReactNode;
  panelId?: string;
  labelledBy?: string;
  onOpen: (agentId: string) => void;
  /** Paper tap, or Enter on the focused desk, walks into that agent's desk room. */
  onWalk?: (agentId: string) => void;
  /** Desktop only. Enlarge this desk in the room. Does not approve or write a vault. */
  onFocusTile?: (agentId: string) => void;
  focusedId?: string | null;
  /** Open a needs-you slip. The tray does not approve it. */
  onOpenMail?: (item: MailItem) => void;
  /** Vacant floor only. Opens the existing Team swap slip. */
  onSeat?: () => void;
  /** Stage rooms under the desks. The status-frame gallery leaves this off. */
  pipeline?: boolean;
};

const FLOOR_DEPTHS = ["7", "6", "5", "4", "3", "2", "1", "0"] as const;

export function DeskGrid({
  teamId,
  agents,
  still,
  expandingId,
  covered = false,
  sheet = null,
  panelId,
  labelledBy,
  onOpen,
  onWalk,
  onFocusTile,
  focusedId = null,
  onOpenMail,
  onSeat,
  pipeline: showPipeline = true,
}: DeskGridProps) {
  const layout = useFormFactor();
  const arrange = layout === "desktop" ? "tiles" : "strip";
  const tiles = useSyncExternalStore(subscribeDeskTiles, tileCount, () => 3 as TileCount);
  const lampScale = tiles === 4 && arrange === "tiles" ? 2 : 3;
  const seatScale = tiles === 4 && arrange === "tiles" ? 5 : 6;
  const poolScale = 2;
  const lampHeight = 35 * lampScale;
  const roomRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLFieldSetElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const [pipeline, setPipeline] = useState<PipelineStageId | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerCursor, setDrawerCursor] = useState(-1);
  const openTimer = useRef<number | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const pauseKey = useSyncExternalStore(subscribeWorkPause, pauseSnapshot, () => "");
  const canFocus = arrange === "tiles" && !!onFocusTile;

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    if (covered) room.setAttribute("inert", "");
    else room.removeAttribute("inert");
    const tilesNode = tilesRef.current;
    if (tilesNode) {
      if (covered) tilesNode.setAttribute("inert", "");
      else tilesNode.removeAttribute("inert");
    }
    const rooms = pipelineRef.current;
    if (!rooms) return;
    if (covered) rooms.setAttribute("inert", "");
    else rooms.removeAttribute("inert");
  }, [covered]);

  useEffect(() => {
    return () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!covered) return;
    setDrawerId(null);
    setDrawerCursor(-1);
  }, [covered]);

  useEffect(() => {
    if (!drawerId || covered) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Mail, the ledger, and a modal sheet are the top overlay. They take Escape first.
      if (document.querySelector(".mail-slot[data-open='true'], .command-ledger, .approval-overlay, .board-overlay, dialog[open]")) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = drawerId;
      setDrawerId(null);
      setDrawerCursor(-1);
      document.querySelector<HTMLButtonElement>(`.desk-drawer-pull[data-agent="${id}"]`)?.focus({ preventScroll: true });
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const pull = target.closest(".desk-drawer-pull");
      if (pull?.getAttribute("data-agent") === drawerId) return;
      const sheet = target.closest(".desk-drawer");
      if (sheet?.getAttribute("data-agent") === drawerId) return;
      setDrawerId(null);
      setDrawerCursor(-1);
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [drawerId, covered]);

  const toggleDrawer = (agentId: string) => {
    setDrawerId((current) => (current === agentId ? null : agentId));
    setDrawerCursor(-1);
  };

  const chooseDrawer = (agentId: string) => {
    onOpen(agentId);
  };

  const focusTile = (agentId: string) => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    onFocusTile?.(agentId);
  };

  const activateDesk = (agentId: string, detail: number) => {
    if (!canFocus || !onFocusTile) {
      onOpen(agentId);
      return;
    }
    const now = Date.now();
    const previous = lastTap.current;
    const double = detail > 1 || (previous?.id === agentId && now - previous.at < TILE_TAP_MS);
    lastTap.current = { id: agentId, at: now };
    if (double) {
      focusTile(agentId);
      return;
    }
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      openTimer.current = null;
      onOpen(agentId);
    }, TILE_TAP_MS);
  };

  const hitPaper = (target: EventTarget | null) => target instanceof Element && !!target.closest(".overview-paper");

  const walkUp = (agentId: string) => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = null;
    onWalk?.(agentId);
  };

  const onDeskKeyDown = (event: KeyboardEvent<HTMLButtonElement>, agentId: string) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (canFocus && focusedId !== agentId) {
      focusTile(agentId);
      return;
    }
    walkUp(agentId);
  };

  return (
    <div
      className="desk-grid"
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-still={still ? "true" : "false"}
      data-count={agents.length}
      data-empty={agents.length === 0 ? "true" : "false"}
      data-sheet={covered ? "open" : "shut"}
      data-arrange={arrange}
      data-tiles={arrange === "tiles" ? String(tiles) : undefined}
      data-focus={focusedId ?? "none"}
      data-space="work"
      data-lighting="ember"
      data-pipeline={showPipeline ? (pipeline ?? "all") : undefined}
      data-drawer={drawerId ?? "shut"}
      style={arrange === "tiles" ? { ["--tile-count" as string]: String(tiles) } : undefined}
    >
      <h1 className="overview-title" hidden={covered}>
        Overview
      </h1>
      <p className="overview-legend" hidden={covered}>
        {STATUS_LEGEND}
      </p>
      <div
        className="desk-room"
        data-scene="row"
        ref={roomRef}
        aria-hidden={covered ? true : undefined}
      >
        <div className="desk-hall">
        <span className="agent-desk-wall" data-material="plaster" aria-hidden="true">
          <SpaceWash space="work" part="wall" />
        </span>
        <span className="desk-room-windows" aria-hidden="true">
          {(agents.length > 0 ? agents : [{ id: "vacant" }]).map((agent) => (
            <span key={agent.id} className="desk-room-window">
              <span className="window-reveal">
                <span className="window-glass">
                  <span className="window-star" />
                  <span className="window-star" />
                  <span className="window-star" />
                  <span className="window-mullion window-mullion-v" />
                  <span className="window-mullion window-mullion-h" />
                </span>
              </span>
              <span className="window-sill" />
            </span>
          ))}
        </span>
        <span className="agent-desk-wainscot" data-material="wainscot" aria-hidden="true">
          <span className="wall-bays">
            {(agents.length > 0 ? agents : [{ id: "vacant" }]).map((agent) => (
              <span key={agent.id} className="wall-bay">
                <span className="wall-cubby" />
                <span className="wall-shelf" />
                <span className="wall-cubby" />
              </span>
            ))}
          </span>
        </span>
        <span className="desk-room-rail" aria-hidden="true" />
        <span className="agent-desk-floor" data-material="floor" aria-hidden="true">
          <span className="floor-steps">
            {FLOOR_DEPTHS.map((depth) => (
              <span key={depth} className="floor-board" data-depth={depth} />
            ))}
          </span>
        </span>
        <div className="desk-floor-row">
        <div
          className="desk-scroll"
          data-strip={arrange === "strip" ? "snap" : undefined}
        >
        <ul className="desk-grid-list">
          {agents.length === 0 ? (
            <li data-empty="true">
              <EmptyDesk still={still} onSeat={onSeat ?? (() => {})} />
            </li>
          ) : null}
          {agents.map((agent, index) => {
            const mark = seatMark(index);
            const paused = pauseKey.split("|").includes(`${teamId}:${agent.id}`);
            const lit = agent.status === "working" && !paused;
            const waiting = agent.status === "waiting";
            const lines = linesForAgent(teamId, agent.id);
            const stamp = deskStampFor(agent, lines);
            const sheetLine = latestSheetLine(lines);
            const focused = focusedId === agent.id;
            const stage = stageForStatus(agent.status);
            const inStage = deskInStage(agent.status, showPipeline ? pipeline : null);
            return (
              <li
                key={agent.id}
                data-agent={agent.id}
                data-focused={focused ? "true" : "false"}
                data-stage={showPipeline ? stage : undefined}
                data-stage-match={showPipeline ? (inStage ? "true" : "false") : undefined}
              >
                <button
                  type="button"
                  className="agent-desk"
                  data-agent={agent.id}
                  data-status={agent.status}
                  data-stage={showPipeline ? stage : undefined}
                  data-paused={paused ? "true" : "false"}
                  data-work={paused ? "halted" : "live"}
                  data-focused={focused ? "true" : "false"}
                  data-expanding={expandingId === agent.id ? "true" : "false"}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    if (hitPaper(event.target)) {
                      walkUp(agent.id);
                      return;
                    }
                    activateDesk(agent.id, event.detail);
                  }}
                  onDoubleClick={(event) => {
                    if (hitPaper(event.target)) {
                      event.preventDefault();
                      return;
                    }
                    if (!canFocus) return;
                    event.preventDefault();
                    focusTile(agent.id);
                  }}
                  onKeyDown={(event) => onDeskKeyDown(event, agent.id)}
                >
                  <span className="agent-desk-bay">
                    <span className="agent-desk-plaque" data-plaque="engraved">
                      <span className="agent-desk-name" id={`agent-desk-name-${agent.id}`}>
                        {agent.name}
                      </span>
                      <span className="desk-stamp" data-stamp="desk" data-task={stamp.task}>
                        <span className="desk-stamp-agent">{stamp.agent}</span>
                        <span className="desk-stamp-task">{stamp.task}</span>
                        <time className="desk-stamp-time" dateTime={stamp.updatedAt ?? undefined}>
                          {stamp.timeLabel}
                        </time>
                        {paused ? <span className="desk-stamp-hold">Paused</span> : null}
                      </span>
                    </span>
                    <span className="agent-desk-stage">
                      <span
                        className="desk-rig fitted-desk overview-desk"
                        data-desk="fitted"
                        style={{ ["--lamp-h" as string]: `${lampHeight}px` }}
                      >
                        <span className="desk-shadow" aria-hidden="true" />
                        <span className="behind-cast">
                          <span className="agent-seat" data-seat={mark} data-pose={waiting ? "raised-hand" : "seated"} aria-hidden="true">
                            <span className="agent-figure">
                              <Sprite rows={seatedByMark[mark]} scale={seatScale} title="" />
                              {waiting ? (
                                <span className="raised-hand">
                                  <Sprite rows={raisedHand} scale={seatScale} title="" />
                                </span>
                              ) : null}
                              {lit ? (
                                <span className="face-pool" data-light-pool="face">
                                  <Sprite rows={faceWashByMark[mark]} scale={seatScale} title="" />
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </span>
                        <span className="desk-top" data-material="desk">
                          {lit ? (
                            <span className="overview-pool" data-light-pool="desk">
                              <Sprite rows={deskLightPool} scale={poolScale} title="" />
                            </span>
                          ) : null}
                          <span className="fitted-sheet" data-pose="desk" data-still={still ? "true" : "false"}>
                            <span className={lit ? "paper overview-paper is-lit" : "paper overview-paper"}>
                              {covered ? null : <span className="overview-line">{sheetLine}</span>}
                              {lit ? (
                                <span className="overview-pool" data-light-pool="paper">
                                  <Sprite rows={paperLightPool} scale={2} title="" />
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </span>
                        <span className="desk-side" data-material="wainscot" aria-hidden="true" />
                        <span className="desk-front agent-desk-front" aria-hidden="true">
                          <span className="desk-leg leg-left agent-desk-leg" />
                          <span className="desk-leg leg-right agent-desk-leg" />
                        </span>
                        <span className="agent-desk-lamp-row">
                          <span className="agent-desk-lamp">
                            <WorkingLamp status={agent.status} scale={lampScale} still={still || paused} />
                          </span>
                          <StatusFrame className="agent-desk-state" status={agent.status} still={still} />
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  className="lamp-chain"
                  data-agent={agent.id}
                  data-focused={focused ? "true" : "false"}
                  data-paused={paused ? "true" : "false"}
                  data-pattern={paused ? "pulled" : "hanging"}
                  data-still={still ? "true" : "false"}
                  aria-checked={paused}
                  aria-label={paused ? `Resume ${agent.name}` : `Pause ${agent.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleWorkPause(teamId, agent.id);
                  }}
                >
                  <span className="chain-link" data-link="1" />
                  <span className="chain-link" data-link="2" />
                  <span className="chain-link" data-link="3" />
                </button>
                <DeskDrawer
                  teamId={teamId}
                  agentId={agent.id}
                  agentName={agent.name}
                  describedBy={`agent-desk-name-${agent.id}`}
                  open={drawerId === agent.id}
                  still={still}
                  cursor={drawerId === agent.id ? drawerCursor : -1}
                  onToggle={() => toggleDrawer(agent.id)}
                  onHighlight={setDrawerCursor}
                  onChoose={() => chooseDrawer(agent.id)}
                />
              </li>
            );
          })}
        </ul>
        </div>
        </div>
        <MailTray teamId={teamId} agents={agents} still={still} onOpen={onOpenMail ?? (() => {})} />
        </div>
        {showPipeline ? (
          <PipelineRooms
            ref={pipelineRef}
            agents={agents}
            still={still}
            filter={pipeline}
            onFilter={setPipeline}
          />
        ) : null}
      </div>
      {canFocus && agents.length > 1 ? (
        <fieldset ref={tilesRef} className="tile-count" data-reach="local" aria-label="Desk tiles">
          {TILE_COUNTS.map((count) => (
            <label key={count} className="tile-choice">
              <input
                type="radio"
                name={`desk-tiles-${teamId}`}
                value={count}
                checked={tiles === count}
                aria-label={`${count} tiles`}
                onChange={() => {
                  setTileCount(count);
                }}
              />
              <span aria-hidden="true">{count}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {sheet}
    </div>
  );
}
