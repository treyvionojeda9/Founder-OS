import {
  isMachineLine,
  teamById,
  transcriptFor,
  type AgentAction,
  type ChatLine,
  type TeamAgent,
  type TeamRecord,
} from "../team/chatStore";

/** A slip the person has to answer. The tray only points at it. */
export type MailKind = "waiting" | "approval";

export type MailItem = {
  id: string;
  agentId: string;
  agentName: string;
  kind: MailKind;
  label: string;
  /** Set for a pending approval. Opening it shows the stamp. It does not approve. */
  action?: AgentAction;
};

export type MailMark = {
  glyph: "hand" | "seal";
  pattern: "double" | "corners";
};

const EMPTY: readonly MailItem[] = [];
const cache = new Map<string, { sig: string; items: readonly MailItem[] }>();

/** Outline plus glyph. Waiting is a double line and a hand. Approval is corner marks and a seal. */
export function mailMark(kind: MailKind): MailMark {
  if (kind === "waiting") return { glyph: "hand", pattern: "double" };
  return { glyph: "seal", pattern: "corners" };
}

/**
 * Needs-you slips for one team.
 * Waiting desks come first for that agent, then each pending approval already on the sheet.
 * Nothing here writes a vault.
 */
export function collectMailItems(team: TeamRecord, lines: readonly ChatLine[]): MailItem[] {
  const items: MailItem[] = [];
  for (const agent of team.agents) {
    if (agent.status === "waiting") {
      items.push({
        id: `waiting:${team.id}:${agent.id}`,
        agentId: agent.id,
        agentName: agent.name,
        kind: "waiting",
        label: "Waiting for you",
      });
    }
    for (const line of lines) {
      if (!isMachineLine(line) || line.agentId !== agent.id || !line.action) continue;
      items.push({
        id: `approval:${line.id}`,
        agentId: agent.id,
        agentName: agent.name,
        kind: "approval",
        label: line.action.label,
        action: line.action,
      });
    }
  }
  return items;
}

function mailSignature(agents: readonly TeamAgent[], lines: readonly ChatLine[]): string {
  const roster = agents.map((agent) => `${agent.id}:${agent.status}`).join(",");
  const acts = lines
    .map((line) => (isMachineLine(line) ? `${line.id}:${line.agentId}:${line.action?.id ?? ""}` : line.id))
    .join(",");
  return `${roster}|${acts}`;
}

/** Cached slips for a team id. The same roster returns the same array. */
export function mailItemsFor(teamId: string): readonly MailItem[] {
  const team = teamById(teamId);
  if (!team) return EMPTY;
  const lines = transcriptFor(teamId);
  const sig = mailSignature(team.agents, lines);
  const hit = cache.get(teamId);
  if (hit && hit.sig === sig) return hit.items;
  const items = collectMailItems(team, lines);
  cache.set(teamId, { sig, items });
  return items;
}

export function filterMailItems(items: readonly MailItem[], agentId: string): MailItem[] {
  if (agentId === "all") return [...items];
  return items.filter((item) => item.agentId === agentId);
}

/** J moves down. K moves up. The selection stops at the ends. */
export function stepMailIndex(index: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return 0;
  const next = index + direction;
  if (next < 0) return 0;
  if (next >= count) return count - 1;
  return next;
}

/** Starts with the plaque text (`{count} Needs you`) so the accessible name matches what is on the wood. */
export function mailSlotName(count: number): string {
  return `${count} Needs you, mail slot`;
}
