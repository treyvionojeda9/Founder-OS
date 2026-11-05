import { useEffect, useState } from "react";
import { Sprite } from "../design/Sprite";
import { stapler } from "../design/sprites";
import { lampArt } from "../study/lampArt";
import type { TeamRecord } from "./chatStore";

type TeamBoardProps = {
  team: TeamRecord;
  still: boolean;
  expandingId: string | null;
  onOpen: (agentId: string) => void;
};

const LABEL_ONLY = "Label only. Nothing left this board.";

export function TeamBoard({ team, still, expandingId, onOpen }: TeamBoardProps) {
  const lampScale = 3;
  const staplerScale = 3;
  const [slip, setSlip] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!slip) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSlip(false);
      setNote(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slip]);

  return (
    <section
      className="team-board"
      data-still={still ? "true" : "false"}
      data-count={team.agents.length}
      aria-label="Team board"
    >
      <div className="board-void">
        <div className="board-wall" aria-hidden="true" />
        <div className="board-hanger">
          <div className="board-face">
            <span className="board-nail nail-a" aria-hidden="true" />
            <span className="board-nail nail-b" aria-hidden="true" />
            <span className="board-nail nail-c" aria-hidden="true" />
            <span className="board-nail nail-d" aria-hidden="true" />
            <header className="board-head">
              <h1>Team</h1>
              <p className="board-team">{team.name}</p>
            </header>
            <p className="board-legend">Lit lamp means working. Dark lamp means idle. A fallen lamp has failed.</p>
            <ul className="plaque-list">
              {team.agents.map((agent) => {
                const lamp = lampArt(agent.status);
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="plaque"
                      data-agent={agent.id}
                      data-status={agent.status}
                      data-expanding={expandingId === agent.id ? "true" : "false"}
                      onClick={() => onOpen(agent.id)}
                    >
                      <span className="plaque-lamp">
                        <Sprite rows={lamp.rows} scale={lampScale} title={lamp.title} />
                      </span>
                      <span className="plaque-plate">
                        <span className="plaque-name">{agent.name}</span>
                        {agent.title ? <span className="plaque-title">{agent.title}</span> : null}
                      </span>
                      <span className="plaque-state status-chip" data-status={agent.status}>
                        {lamp.caption}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="board-foot">
              <button
                type="button"
                className="stapler"
                aria-expanded={slip}
                aria-haspopup="menu"
                aria-controls={slip && team.tools.length > 0 ? "fixture-tools" : undefined}
                onClick={() => {
                  setSlip((open) => !open);
                  setNote(null);
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
                    <button key={tool} type="button" role="menuitem" onClick={() => setNote(LABEL_ONLY)}>
                      {tool}
                    </button>
                  ))}
                </div>
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
    </section>
  );
}
