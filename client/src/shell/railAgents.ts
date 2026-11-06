import { listTeams, type AgentStatus } from "../team/chatStore";
import type { SpriteGrid } from "../design/sprites/types";
import { glyphForAgent } from "./railGlyphs";

export type RailAgent = {
  id: string;
  teamId: string;
  teamName: string;
  name: string;
  status: AgentStatus;
  glyph: SpriteGrid;
};

/**
 * One symbol per agent id. The first fixture team owns a repeated id,
 * so CEO stays on Hale Design Lab rather than appearing three times.
 */
export function railAgents(): RailAgent[] {
  const seen = new Set<string>();
  const agents: RailAgent[] = [];
  for (const team of listTeams()) {
    for (const agent of team.agents) {
      if (seen.has(agent.id)) continue;
      seen.add(agent.id);
      agents.push({
        id: agent.id,
        teamId: team.id,
        teamName: team.name,
        name: agent.name,
        status: agent.status,
        glyph: glyphForAgent(agent.id, agent.name),
      });
    }
  }
  return agents;
}
