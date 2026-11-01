import type { AgentStatus } from "../team/chatStore";
import {
  glyphCheck,
  glyphCrack,
  glyphFlame,
  glyphFlameLift,
  glyphHand,
  glyphRest,
} from "./sprites/statusGlyphs";
import type { SpriteGrid } from "./sprites/types";

/** Shared states. `failed` on a record is the Error frame: the lamp stays fallen. */
export const FRAME_STATES = ["idle", "working", "waiting", "done", "error"] as const;
export type FrameState = (typeof FRAME_STATES)[number];

export const OUTLINE_PATTERNS = ["solid", "dash", "double", "corners", "crack"] as const;
export type OutlinePattern = (typeof OUTLINE_PATTERNS)[number];

export type StatusGlyph = "rest" | "flame" | "hand" | "check" | "crack";

export type FrameSpec = {
  state: FrameState;
  /** Agent record value. Error keeps `failed` so the fallen lamp stays wired. */
  status: AgentStatus;
  pattern: OutlinePattern;
  /** How the outline reads once hue is gone. */
  outline: string;
  glyph: StatusGlyph;
  label: string;
};

export const frameCatalog: readonly FrameSpec[] = [
  {
    state: "idle",
    status: "idle",
    pattern: "solid",
    outline: "unbroken line",
    glyph: "rest",
    label: "Idle",
  },
  {
    state: "working",
    status: "working",
    pattern: "dash",
    outline: "broken runs",
    glyph: "flame",
    label: "Working",
  },
  {
    state: "waiting",
    status: "waiting",
    pattern: "double",
    outline: "two lines with a gap",
    glyph: "hand",
    label: "Waiting for you",
  },
  {
    state: "done",
    status: "done",
    pattern: "corners",
    outline: "marks only at the corners",
    glyph: "check",
    label: "Done",
  },
  {
    state: "error",
    status: "failed",
    pattern: "crack",
    outline: "dotted line, bottom edge missing",
    glyph: "crack",
    label: "Error",
  },
];

const byStatus = Object.fromEntries(frameCatalog.map((spec) => [spec.status, spec])) as Record<AgentStatus, FrameSpec>;

export function frameSpec(status: AgentStatus): FrameSpec {
  return byStatus[status];
}

export function frameState(status: AgentStatus): FrameState {
  return frameSpec(status).state;
}

export function statusLabel(status: AgentStatus): string {
  return frameSpec(status).label;
}

const glyphByName: Record<StatusGlyph, SpriteGrid> = {
  rest: glyphRest,
  flame: glyphFlame,
  hand: glyphHand,
  check: glyphCheck,
  crack: glyphCrack,
};

/** Working walks two frames. Every other state, and reduced motion, is one frame. */
export function glyphFrames(status: AgentStatus, still: boolean): readonly SpriteGrid[] {
  const spec = frameSpec(status);
  if (spec.state === "working" && !still) return [glyphFlame, glyphFlameLift];
  return [glyphByName[spec.glyph]];
}

/**
 * A saved human sheet is already on the shelf.
 * The Done frame is display-only. It is not a field on the note, and nothing here writes a vault.
 */
export function savedSheetStatus(): AgentStatus {
  return "done";
}

export const STATUS_LEGEND =
  "Lit lamp means working. Dark lamp means idle. A fallen lamp has failed. A raised hand is waiting for you.";
