import { statusLabel } from "../design/statusFrame";
import { deskLampFailed, deskLampOff, deskLampOn } from "../design/sprites";
import type { SpriteGrid } from "../design/sprites";
import type { AgentStatus } from "../team/chatStore";

export type LampPosture = "working" | "idle" | "failed";

/** Working stays lit. Error stays fallen. Idle, waiting, and done stay dark. */
export function lampPosture(status: AgentStatus): LampPosture {
  if (status === "working") return "working";
  if (status === "failed") return "failed";
  return "idle";
}

export type LampArt = {
  rows: SpriteGrid;
  title: string;
  caption: string;
};

/** Lamp on is working, lamp off is idle, and a fallen lamp is the Error frame. */
export function lampArt(status: AgentStatus): LampArt {
  const posture = lampPosture(status);
  const caption = statusLabel(status);
  if (posture === "working") return { rows: deskLampOn, title: "Desk lamp, lit", caption };
  if (posture === "failed") return { rows: deskLampFailed, title: "Desk lamp, failed", caption };
  return { rows: deskLampOff, title: "Desk lamp, dark", caption };
}
