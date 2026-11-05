import type { OutlinePattern, StatusGlyph } from "../design/statusFrame";
import { frameSpec } from "../design/statusFrame";
import { grayscaleGrid } from "../design/spriteGrid";
import { seatMark, type SeatMark } from "../design/sprites/seatedAgent";
import type { SpriteGrid } from "../design/sprites/types";
import type { AgentStatus } from "../team/chatStore";

/**
 * Four rooms on the Overview floor.
 * Idle waits in Intake. Working stands in Working.
 * Waiting-for-you and Error both stop in Waiting. Error keeps the crack glyph.
 * Done rests on the last shelf.
 * A view of StatusFrame. The tap only highlights desks. Nothing here writes a vault.
 */

export const PIPELINE_STAGES = [
  { id: "intake", label: "Intake", pattern: "solid" },
  { id: "working", label: "Working", pattern: "dash" },
  { id: "waiting", label: "Waiting", pattern: "double" },
  { id: "done", label: "Done", pattern: "corners" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export type PipelineAgent = {
  id: string;
  name: string;
  status: AgentStatus;
};

export type PipelineToken = {
  agentId: string;
  name: string;
  status: AgentStatus;
  stage: PipelineStageId;
  pattern: OutlinePattern;
  glyph: StatusGlyph;
  mark: SeatMark;
};

export type PipelineStage = {
  id: PipelineStageId;
  label: string;
  pattern: OutlinePattern;
  tokens: readonly PipelineToken[];
};

const stageByStatus = {
  idle: "intake",
  working: "working",
  waiting: "waiting",
  done: "done",
  failed: "waiting",
} as const satisfies Record<AgentStatus, PipelineStageId>;

/** StatusFrame state, then the room. Error shares Waiting and keeps its own outline. */
export function stageForStatus(status: AgentStatus): PipelineStageId {
  return stageByStatus[status];
}

export function stageControlName(label: string, count: number): string {
  const noun = count === 1 ? "agent" : "agents";
  return `${label}, ${count} ${noun}`;
}

/** Tap the lit room again and the floor returns to every desk. */
export function toggleStage(current: PipelineStageId | null, tapped: PipelineStageId): PipelineStageId | null {
  return current === tapped ? null : tapped;
}

/** A null filter leaves every desk lit. */
export function deskInStage(status: AgentStatus, filter: PipelineStageId | null): boolean {
  if (filter === null) return true;
  return stageForStatus(status) === filter;
}

/** Two place-frames while motion is allowed. Reduced motion holds the token on the floor. */
export function tokenPlaceFrames(still: boolean): 1 | 2 {
  return still ? 1 : 2;
}

/** Seat-mark caps. The shapes differ once the colour is gone. Founder Ember only. */
export const tokenHair: SpriteGrid = [
  "..dddd..",
  ".dddddd.",
  ".dpnndp.",
  "..dwwd..",
  ".wwwwww.",
  ".wddddw.",
  "..dddd..",
  "........",
];

export const tokenHood: SpriteGrid = [
  "mmmmmmmm",
  "mddddddm",
  "mdppppdm",
  "m.dwwd.m",
  ".wwwwww.",
  ".wddddw.",
  "..dddd..",
  "........",
];

export const tokenCollar: SpriteGrid = [
  "..ssss..",
  ".s.pp.s.",
  "s.pnnps.",
  ".sswwss.",
  "sdddddds",
  "sdddddds",
  ".sddddss",
  "........",
];

export const tokenBodyByMark: Record<SeatMark, SpriteGrid> = {
  hair: tokenHair,
  hood: tokenHood,
  collar: tokenCollar,
};

/**
 * Room outlines follow the StatusFrame patterns.
 * Solid, broken runs, two lines with a gap, corner marks. Crack is the error token.
 */
export function roomOutline(pattern: OutlinePattern): SpriteGrid {
  if (pattern === "solid") {
    return [
      "pppppppppp",
      "p........p",
      "p........p",
      "p........p",
      "p........p",
      "p........p",
      "p........p",
      "pppppppppp",
    ];
  }
  if (pattern === "dash") {
    return [
      "pp..pp..pp",
      "p........p",
      "..........",
      "p........p",
      "..........",
      "p........p",
      "..........",
      "pp..pp..pp",
    ];
  }
  if (pattern === "double") {
    return [
      "pppppppppp",
      "pnnnnnnnnp",
      "pnppppppnp",
      "pnp....pnp",
      "pnp....pnp",
      "pnppppppnp",
      "pnnnnnnnnp",
      "pppppppppp",
    ];
  }
  if (pattern === "corners") {
    return [
      "pp......pp",
      "pp......pp",
      "..........",
      "..........",
      "..........",
      "..........",
      "pp......pp",
      "pp......pp",
    ];
  }
  return [
    "p.p.p.p.p.",
    "p.........",
    ".p........",
    "p.........",
    ".p........",
    "p.........",
    ".p........",
    "..........",
  ];
}

/** Dark / light / empty, so the outlines stay distinct once hue is gone. */
export function outlineSignature(pattern: OutlinePattern): string {
  return grayscaleGrid(roomOutline(pattern))
    .map((row) => row.map((luma) => (luma < 0 ? "." : luma < 80 ? "D" : "L")).join(""))
    .join("|");
}

/** The double room keeps a dark gap between two light lines. */
export function doubleGapReadable(pattern: OutlinePattern): boolean {
  if (pattern !== "double") return false;
  return grayscaleGrid(roomOutline(pattern)).some((row) => {
    const ink = row.filter((luma) => luma >= 0);
    if (ink.length < 3) return false;
    const light = Math.max(...ink);
    const dark = Math.min(...ink);
    return light - dark >= 40 && ink[0] === light && ink[1] === dark;
  });
}

export function pipelineFor(agents: readonly PipelineAgent[]): readonly PipelineStage[] {
  return PIPELINE_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    pattern: stage.pattern,
    tokens: agents.flatMap((agent, index) => {
      if (stageForStatus(agent.status) !== stage.id) return [];
      const spec = frameSpec(agent.status);
      const token: PipelineToken = {
        agentId: agent.id,
        name: agent.name,
        status: agent.status,
        stage: stage.id,
        pattern: spec.pattern,
        glyph: spec.glyph,
        mark: seatMark(index),
      };
      return [token];
    }),
  }));
}
