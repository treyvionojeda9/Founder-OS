import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Sprite } from "../design/Sprite";
import { StatusFrame } from "../design/StatusFrame";
import { STATUS_LEGEND } from "../design/statusFrame";
import { faceWashByMark, paperLightPool, deskLightPool, raisedHand, seatMark, seatedByMark } from "../design/sprites/seatedAgent";
import { useFormFactor } from "../hooks/useFormFactor";
import { linesForAgent, type TeamAgent } from "../team/chatStore";
import { pauseSnapshot, subscribeWorkPause, toggleWorkPause } from "./deskPause";
import { deskStampFor } from "./deskStamp";
import { setTileCount, subscribeDeskTiles, TILE_COUNTS, TILE_TAP_MS, tileCount, type TileCount } from "./deskTiles";
import { EmptyDesk } from "./EmptyDesk";
import { MailTray } from "./MailTray";
import type { MailItem } from "./mailSlot";
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
  /** Desktop only. Enlarge this desk in the room. Does not approve or write a vault. */
  onFocusTile?: (agentId: string) => void;
  focusedId?: string | null;
  /** Open a needs-you slip. The tray does not approve it. */
  onOpenMail?: (item: MailItem) => void;
  /** Vacant floor only. Opens the existing Team swap slip. */
  onSeat?: () => void;
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
  onFocusTile,
  focusedId = null,
  onOpenMail,
  onSeat,
}: DeskGridProps) {
  const layout = useFormFactor();
  const arrange = layout === "desktop" ? "tiles" : "strip";
  const tiles = useSyncExternalStore(subscribeDeskTiles, tileCount, () => 3 as TileCount);
  const lampScale = layout === "portrait" ? 3 : 4;
  const seatScale = 4;
  const poolScale = 3;
  const roomRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLFieldSetElement>(null);
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
    if (!tilesNode) return;
    if (covered) tilesNode.setAttribute("inert", "");
    else tilesNode.removeAttribute("inert");
  }, [covered]);

  useEffect(() => {
    return () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    };
  }, []);

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

  const onDeskKeyDown = (event: KeyboardEvent<HTMLButtonElement>, agentId: string) => {
    if (!canFocus || event.key !== "Enter") return;
    event.preventDefault();
    focusTile(agentId);
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
        <span className="agent-desk-wall" data-material="plaster" aria-hidden="true" />
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
            const stamp = deskStampFor(agent, linesForAgent(teamId, agent.id));
            const focused = focusedId === agent.id;
            return (
              <li key={agent.id} data-agent={agent.id} data-focused={focused ? "true" : "false"}>
                <button
                  type="button"
                  className="agent-desk"
                  data-agent={agent.id}
                  data-status={agent.status}
                  data-paused={paused ? "true" : "false"}
                  data-work={paused ? "halted" : "live"}
                  data-focused={focused ? "true" : "false"}
                  data-expanding={expandingId === agent.id ? "true" : "false"}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => activateDesk(agent.id, event.detail)}
                  onDoubleClick={(event) => {
                    if (!canFocus) return;
                    event.preventDefault();
                    focusTile(agent.id);
                  }}
                  onKeyDown={(event) => onDeskKeyDown(event, agent.id)}
                >
                  <span className="agent-desk-bay">
                    <span className="agent-desk-plaque" data-plaque="engraved">
                      <span className="agent-desk-name">{agent.name}</span>
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
                      <span className="agent-desk-lamp-row">
                        <span className="agent-desk-lamp">
                          <WorkingLamp status={agent.status} scale={lampScale} still={still || paused} />
                        </span>
                        <StatusFrame className="agent-desk-state" status={agent.status} still={still} />
                      </span>
                      <span className="agent-desk-volume">
                        <span className="agent-desk-top" data-material="desk" aria-hidden="true">
                          <span className="desk-plank desk-plank-a" />
                          <span className="desk-plank desk-plank-b" />
                          {lit ? (
                            <span className="overview-pool" data-light-pool="desk">
                              <Sprite rows={deskLightPool} scale={poolScale} title="" />
                            </span>
                          ) : null}
                          <span className="agent-desk-sheet">
                            {lit ? (
                              <span className="overview-pool" data-light-pool="paper">
                                <Sprite rows={paperLightPool} scale={2} title="" />
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="agent-desk-front" aria-hidden="true" />
                        <span className="agent-desk-legs" aria-hidden="true">
                          <span className="agent-desk-leg" />
                          <span className="agent-desk-leg" />
                        </span>
                        <span className="agent-desk-shadow" aria-hidden="true" />
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
              </li>
            );
          })}
        </ul>
        </div>
        </div>
        <MailTray teamId={teamId} agents={agents} still={still} onOpen={onOpenMail ?? (() => {})} />
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
