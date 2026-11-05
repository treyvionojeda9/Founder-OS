import { Sprite } from "../design/Sprite";
import { faceWashByMark, paperLightPool, deskLightPool, seatMark, seatedByMark } from "../design/sprites/seatedAgent";
import { useFormFactor } from "../hooks/useFormFactor";
import type { TeamAgent } from "../team/chatStore";
import { lampArt } from "./lampArt";
import { WorkingLamp } from "./WorkingLamp";

type DeskGridProps = {
  agents: readonly TeamAgent[];
  still: boolean;
  expandingId: string | null;
  panelId?: string;
  labelledBy?: string;
  onOpen: (agentId: string) => void;
};

const FLOOR_DEPTHS = ["7", "6", "5", "4", "3", "2", "1", "0"] as const;

export function DeskGrid({ agents, still, expandingId, panelId, labelledBy, onOpen }: DeskGridProps) {
  const layout = useFormFactor();
  const lampScale = layout === "portrait" ? 3 : 4;
  const seatScale = 4;
  const poolScale = 3;

  return (
    <div
      className="desk-grid"
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-still={still ? "true" : "false"}
      data-count={agents.length}
    >
      <h1 className="overview-title">Overview</h1>
      <p className="overview-legend">Lit lamp means working. Dark lamp means idle. A fallen lamp has failed.</p>
      <div className="desk-room" data-scene="row">
        <span className="agent-desk-wall" data-material="plaster" aria-hidden="true" />
        <span className="desk-room-windows" aria-hidden="true">
          {agents.map((agent) => (
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
            {agents.map((agent) => (
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
        <ul className="desk-grid-list">
          {agents.map((agent, index) => {
            const lamp = lampArt(agent.status);
            const mark = seatMark(index);
            const lit = agent.status === "working";
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  className="agent-desk"
                  data-agent={agent.id}
                  data-status={agent.status}
                  data-expanding={expandingId === agent.id ? "true" : "false"}
                  onClick={() => onOpen(agent.id)}
                >
                  <span className="agent-desk-bay">
                    <span className="agent-desk-plaque" data-plaque="engraved">
                      <span className="agent-desk-name">{agent.name}</span>
                    </span>
                    <span className="agent-desk-stage">
                      <span className="agent-seat" data-seat={mark} aria-hidden="true">
                        <span className="agent-figure">
                          <Sprite rows={seatedByMark[mark]} scale={seatScale} title="" />
                          {lit ? (
                            <span className="face-pool" data-light-pool="face">
                              <Sprite rows={faceWashByMark[mark]} scale={seatScale} title="" />
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="agent-desk-lamp-row">
                        <span className="agent-desk-lamp">
                          <WorkingLamp status={agent.status} scale={lampScale} still={still} />
                        </span>
                        <span className="agent-desk-state status-chip" data-status={agent.status}>
                          {lamp.caption}
                        </span>
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
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
