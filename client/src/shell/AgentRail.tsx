import type { KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { StatusFrame } from "../design/StatusFrame";
import type { AgentStatus } from "../team/chatStore";
import { glyphSettings, glyphSpaces } from "./railGlyphs";
import type { RailAgent } from "./railAgents";

type AgentRailProps = {
  agents: readonly RailAgent[];
  selectedId: string | null;
  still: boolean;
  section: "work" | "school";
  onSelect: (agent: RailAgent) => void;
  onSpaces: () => void;
};

export function RailStatus({ status, still = false }: { status: AgentStatus; still?: boolean }) {
  return <StatusFrame status={status} still={still} density="spine" className="rail-status" />;
}

function onRailKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-rail-item]")];
  const index = items.findIndex((item) => item === document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  const delta = event.key === "ArrowDown" ? 1 : -1;
  const next = items[(index + delta + items.length) % items.length];
  next?.focus();
}

export function AgentRail({ agents, selectedId, still, section, onSelect, onSpaces }: AgentRailProps) {
  return (
    <nav className="agent-rail" aria-label="Agents" data-shell-chrome="" onKeyDown={onRailKeyDown}>
      <ul className="agent-rail-list">
        {agents.map((agent) => {
          const selected = agent.id === selectedId;
          return (
            <li key={agent.id}>
              <button
                type="button"
                className="agent-rail-item"
                data-rail-item=""
                data-agent={agent.id}
                data-team={agent.teamId}
                data-status={agent.status}
                aria-pressed={selected}
                onClick={() => onSelect(agent)}
              >
                <Sprite rows={agent.glyph} scale={3} title="" />
                <span className="agent-rail-name">{agent.name}</span>
                <RailStatus status={agent.status} still={still} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="agent-rail-foot">
        <button
          type="button"
          className="agent-rail-item"
          data-rail-item=""
          data-spaces={section}
          aria-label={`Spaces, ${section === "school" ? "School" : "Work"}`}
          onClick={onSpaces}
        >
          <Sprite rows={glyphSpaces} scale={3} title="" />
          <span className="shell-clip">Spaces</span>
        </button>
        <Link className="agent-rail-item" data-rail-item="" to="/settings" aria-label="Settings">
          <Sprite rows={glyphSettings} scale={3} title="" />
          <span className="shell-clip">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
