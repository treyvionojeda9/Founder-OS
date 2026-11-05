import type { TeamAgent } from "./chatStore";

/** Carved on every plaque. The kind is the type; the value is fixture language. */
export const SLOT_KINDS = ["model", "tools", "room"] as const;
export type SlotKind = (typeof SLOT_KINDS)[number];

export const SLOT_KIND_LABEL: Record<SlotKind, string> = {
  model: "Model",
  tools: "Tools",
  room: "Room",
};

/** Empty fixtures still show the kind. "Open" is a seat, not a network call. */
export const SLOT_EMPTY = "Open";

export function slotValue(agent: TeamAgent, kind: SlotKind): string {
  const value = agent.slots?.[kind]?.trim() ?? "";
  return value.length > 0 ? value : SLOT_EMPTY;
}
