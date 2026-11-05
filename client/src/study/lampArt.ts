import { deskLampFailed, deskLampOff, deskLampOn } from "../design/sprites";
import type { SpriteGrid } from "../design/sprites";
import type { AgentStatus } from "../team/chatStore";

export type LampArt = {
  rows: SpriteGrid;
  title: string;
  caption: "Working" | "Idle" | "Failed";
};

/** Lamp on is working, lamp off is idle, and a fallen lamp has failed. */
export function lampArt(status: AgentStatus): LampArt {
  if (status === "working") return { rows: deskLampOn, title: "Desk lamp, lit", caption: "Working" };
  if (status === "failed") return { rows: deskLampFailed, title: "Desk lamp, failed", caption: "Failed" };
  return { rows: deskLampOff, title: "Desk lamp, dark", caption: "Idle" };
}
