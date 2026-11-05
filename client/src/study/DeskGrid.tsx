import { Sprite } from "../design/Sprite";
import { useFormFactor } from "../hooks/useFormFactor";
import type { TeamAgent } from "../team/chatStore";
import { lampArt } from "./lampArt";

type DeskGridProps = {
  agents: readonly TeamAgent[];
  still: boolean;
  expandingId: string | null;
  panelId?: string;
  labelledBy?: string;
  onOpen: (agentId: string) => void;
};

export function DeskGrid({ agents, still, expandingId, panelId, labelledBy, onOpen }: DeskGridProps) {
  const layout = useFormFactor();
  const lampScale = layout === "portrait" ? 3 : 4;

  return (
    <div
      className="desk-grid"
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-still={still ? "true" : "false"}
      data-count={agents.length}
      data-material="plaster"
    >
      <h1 className="overview-title">Overview</h1>
      <p className="overview-legend">Lit lamp means working. Dark lamp means idle. A fallen lamp has failed.</p>
      <ul className="desk-grid-list">
        {agents.map((agent) => {
          const lamp = lampArt(agent.status);
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
                <span className="agent-desk-room">
                  <span className="agent-desk-wall" data-material="plaster" aria-hidden="true" />
                  <span className="agent-desk-wainscot" data-material="wainscot" aria-hidden="true" />
                  <span className="agent-desk-floor" data-material="floor" aria-hidden="true" />
                  <span className="agent-desk-top" data-material="desk" aria-hidden="true" />
                  <span className="agent-desk-sheet" aria-hidden="true" />
                  <span className="agent-desk-lamp">
                    <Sprite rows={lamp.rows} scale={lampScale} title={lamp.title} />
                  </span>
                </span>
                <span className="agent-desk-plate">
                  <span className="agent-desk-name">{agent.name}</span>
                  <span className="agent-desk-state status-chip" data-status={agent.status}>
                    {lamp.caption}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
