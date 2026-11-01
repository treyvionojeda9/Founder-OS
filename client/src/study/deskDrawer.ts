import type { AgentStatus } from "../team/chatStore";

/**
 * Local work-in-progress papers for one desk.
 * Fixture copy only. The drawer never writes a vault and never approves.
 */

export type DrawerPaper = {
  id: string;
  title: string;
  status: AgentStatus;
};

const EMPTY: readonly DrawerPaper[] = [
  { id: "desk-empty", title: "Nothing on this desk", status: "idle" },
];

const PAPERS: Record<string, readonly DrawerPaper[]> = {
  "hale-design-lab:ceo": [
    { id: "hale-ceo-forge", title: "Publish the forge note", status: "working" },
    { id: "hale-ceo-door", title: "Read the hall door", status: "done" },
    { id: "hale-ceo-sheet", title: "Keep chat on the sheet", status: "idle" },
  ],
  "hale-design-lab:atelier": [
    { id: "hale-atelier-swatch", title: "File the swatch", status: "waiting" },
    { id: "hale-atelier-quiet", title: "Hold the quiet desk", status: "idle" },
  ],
  "hale-design-lab:courier": [
    { id: "hale-courier-lamp", title: "The lamp is out", status: "failed" },
    { id: "hale-courier-errand", title: "Stop the errand", status: "idle" },
  ],
  "cloud-agent-team:ceo": [
    { id: "cloud-ceo-status", title: "Draft the status line", status: "working" },
    { id: "cloud-ceo-channel", title: "Contact the channel", status: "waiting" },
  ],
  "cloud-agent-team:relay": [{ id: "cloud-relay-packet", title: "Read the packet", status: "waiting" }],
  "local-agent-team:ceo": [{ id: "local-ceo-handoff", title: "Write the bench handoff", status: "waiting" }],
  "local-agent-team:bench": [{ id: "local-bench-sheet", title: "Keep the handoff on the sheet", status: "working" }],
};

/** Papers for this desk. Unknown desks get one idle fixture line. */
export function papersFor(teamId: string, agentId: string): readonly DrawerPaper[] {
  return PAPERS[`${teamId}:${agentId}`] ?? EMPTY;
}

/** Two frames while the sheet may move. Reduced motion is one frame. */
export function drawerFrames(still: boolean): 1 | 2 {
  return still ? 1 : 2;
}

/** Arrow keys walk the list. A closed cursor (-1) enters from the end the key points at. */
export function stepDrawer(current: number, count: number, delta: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  const next = current + delta;
  if (next < 0) return count - 1;
  if (next >= count) return 0;
  return next;
}

/**
 * Highlight always. The desk sheet expands only when that expand path is already wired.
 * The drawer stays a skim list either way.
 */
export function applyDrawerChoice(input: { expandWired: boolean; index: number }): { cursor: number; expand: boolean } {
  return { cursor: input.index, expand: input.expandWired };
}
