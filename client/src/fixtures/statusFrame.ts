import type { TeamAgent } from "../team/chatStore";

/** Demo roster. One agent for each shared frame, including Waiting-for-you. Not a hall door. */
export const statusFrameAgents: readonly TeamAgent[] = [
  { id: "clerk", name: "Clerk", title: "At rest", status: "idle" },
  { id: "wick", name: "Wick", title: "At the lamp", status: "working" },
  { id: "porter", name: "Porter", title: "Hand up", status: "waiting" },
  { id: "quire", name: "Quire", title: "Sheet closed", status: "done" },
  { id: "shard", name: "Shard", title: "Lamp fallen", status: "failed" },
];

export const statusFrameSpines: readonly { id: string; label: string; status: TeamAgent["status"] }[] = [
  { id: "spine-idle", label: "Idle sheet", status: "idle" },
  { id: "spine-working", label: "Working sheet", status: "working" },
  { id: "spine-waiting", label: "Waiting sheet", status: "waiting" },
  { id: "spine-done", label: "Done sheet", status: "done" },
  { id: "spine-error", label: "Error sheet", status: "failed" },
];
