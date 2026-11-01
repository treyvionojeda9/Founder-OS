import { StatusFrame } from "../design/StatusFrame";
import { statusFrameAgents, statusFrameSpines } from "../fixtures/statusFrame";
import { useStillFrame } from "../hooks/useStillFrame";
import { ShelfSpine } from "../library/ShelfSpine";
import { spineMark } from "../library/shelfNote";
import { DeskGrid } from "../study/DeskGrid";
import { TeamBoard } from "../team/TeamBoard";
import type { TeamRecord } from "../team/chatStore";

const demoTeam: TeamRecord = {
  id: "status-frame",
  name: "Status frame",
  agents: [...statusFrameAgents],
  tools: [],
  transcript: [],
};

/** Fixture stage for the five frames. It is not a hall door and it does not write a vault. */
export function StatusFrameDemo() {
  const still = useStillFrame();

  return (
    <main className="status-stage">
      <header className="status-intro">
        <h1>Status frame</h1>
        <p>Idle, working, waiting for you, done, and error. The outline and the glyph still read when the colour is gone.</p>
      </header>
      <section className="status-block" aria-label="Status frames">
        <h2>Frames</h2>
        <div className="status-strip">
          {statusFrameAgents.map((agent) => (
            <StatusFrame key={agent.id} status={agent.status} still={still} />
          ))}
        </div>
      </section>
      <section className="status-block" aria-label="Overview desks">
        {statusFrameAgents.map((agent) => (
          <div key={agent.id} className="status-desk">
            <DeskGrid teamId="status-frame" agents={[agent]} still={still} expandingId={null} onOpen={() => {}} pipeline={false} />
          </div>
        ))}
      </section>
      <section className="status-block" aria-label="Team plaques">
        <TeamBoard team={demoTeam} still={still} expandingId={null} onOpen={() => {}} />
      </section>
      <section className="status-block" aria-label="Library spines">
        <h2>Library</h2>
        <div className="bookcase status-spines">
          <div className="case-crown" aria-hidden="true" />
          <div className="shelf-bays" data-material="panel">
            <div className="shelf-bay" data-empty="false">
              {statusFrameSpines.map((spine, index) => {
                const mark = spineMark(index);
                return (
                  <ShelfSpine
                    key={spine.id}
                    id={spine.id}
                    label={spine.label}
                    tone={mark.tone}
                    band={mark.band}
                    status={spine.status}
                    still={still}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
