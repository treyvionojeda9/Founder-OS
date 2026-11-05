import { grayscaleGrid } from "../design/spriteGrid";
import type { SpriteGrid } from "../design/sprites/types";
import { founderEmber, schoolAccent } from "../design/palette";
import type { LearningPath } from "../fixtures/learning";

/**
 * Local stations around the fixture task.
 * The map is a stub. It does not load a course, and it does not write a vault.
 */

export type PathMark = "done" | "current" | "locked";

export type PathStation = {
  id: string;
  title: string;
  body: string;
  mark: PathMark;
  col: number;
  row: number;
};

export type PathLink = {
  from: string;
  to: string;
};

export type PathMapModel = {
  title: string;
  focusId: string;
  stations: readonly PathStation[];
  links: readonly PathLink[];
  /** Shown when the fixture has no assignment. Null when a locked station carries one. */
  assignmentNote: string | null;
};

export type GridPoint = {
  x: number;
  y: number;
};

export const CELL_W = 192;
export const CELL_H = 120;
export const NODE_W = 160;
export const NODE_H = 88;

/** Ink thread plus an ember thread. Both sit in the approved palettes. */
export const LINK_INK = schoolAccent.ink;
export const LINK_THREAD = founderEmber.ember;

const NO_ASSIGNMENT = "No assignment on this desk.";

export function linkPalette(): readonly string[] {
  return [LINK_INK, LINK_THREAD];
}

export function markPattern(mark: PathMark): "double" | "corners" | "dotted" {
  if (mark === "current") return "double";
  if (mark === "done") return "corners";
  return "dotted";
}

export function markLabel(mark: PathMark): string {
  if (mark === "current") return "Now";
  if (mark === "done") return "Done";
  return "Later";
}

/** Two painted frames while motion is allowed. Reduced motion holds the first. */
export function highlightFrames(still: boolean): 1 | 2 {
  return still ? 1 : 2;
}

/**
 * Outline shapes, not hues.
 * Current is two dark rings with a paper gap. Done is corner ticks. Locked is a dotted ring.
 */
export function outlineRows(mark: PathMark): SpriteGrid {
  if (mark === "current") {
    return [
      "iiiiiiiiii",
      "ippppppppi",
      "ipnnnnnnpi",
      "ipnppppnpi",
      "ipnppppnpi",
      "ipnppppnpi",
      "ipnnnnnnpi",
      "ippppppppi",
      "iiiiiiiiii",
    ];
  }
  if (mark === "done") {
    return [
      "dd......dd",
      "dd......dd",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "dd......dd",
      "dd......dd",
    ];
  }
  return [
    "v.v.v.v.v.",
    "..........",
    "v........v",
    "..........",
    "v........v",
    "..........",
    "v........v",
    "..........",
    ".v.v.v.v.v",
  ];
}

/** Dark / light / empty, so the three marks stay distinct once hue is gone. */
export function outlineSignature(mark: PathMark): string {
  return grayscaleGrid(outlineRows(mark))
    .map((row) => row.map((luma) => (luma < 0 ? "." : luma < 80 ? "D" : "L")).join(""))
    .join("/");
}

/** The focus ring has a light gap between two dark strokes. The other marks do not. */
export function focusGapReadable(mark: PathMark): boolean {
  const gap = grayscaleGrid(outlineRows(mark))[1];
  if (!gap || gap.length < 3) return false;
  const edge = gap[0] ?? -1;
  const mid = gap[Math.floor(gap.length / 2)] ?? -1;
  return edge >= 0 && edge < 80 && mid > 160 && mid - edge >= 80;
}

export function pathMapFor(path: LearningPath): PathMapModel {
  const entry: PathStation = {
    id: `${path.doorId}-open`,
    title: path.doorId === "field-notes" ? "Notebook set" : "Desk open",
    body: "A fixture station. The desk is already open.",
    mark: "done",
    col: 0,
    row: 1,
  };
  const current: PathStation = {
    id: path.task.id,
    title: path.task.title,
    body: path.task.detail,
    mark: "current",
    col: 1,
    row: 0,
  };
  const branch: PathStation = {
    id: `${path.doorId}-aside`,
    title: "A line aside",
    body: "A fixture branch. Nothing else is loaded.",
    mark: "locked",
    col: 1,
    row: 2,
  };
  const stations: PathStation[] = [entry, current];
  const links: PathLink[] = [{ from: entry.id, to: current.id }];
  if (path.assignment) {
    stations.push({
      id: path.assignment.id,
      title: path.assignment.title,
      body: path.assignment.prompt,
      mark: "locked",
      col: 2,
      row: 0,
    });
    links.push({ from: current.id, to: path.assignment.id });
  } else {
    stations.push({
      id: `${path.doorId}-close`,
      title: "Close the page",
      body: "A fixture station. The page stays shut.",
      mark: "locked",
      col: 2,
      row: 1,
    });
    links.push({ from: current.id, to: `${path.doorId}-close` });
  }
  stations.push(branch);
  links.push({ from: current.id, to: branch.id });
  return {
    title: path.title,
    focusId: current.id,
    stations,
    links,
    assignmentNote: path.assignment ? null : NO_ASSIGNMENT,
  };
}

export function mapBounds(stations: readonly PathStation[]): { width: number; height: number } {
  const maxCol = Math.max(...stations.map((station) => station.col));
  const maxRow = Math.max(...stations.map((station) => station.row));
  return {
    width: maxCol * CELL_W + NODE_W,
    height: maxRow * CELL_H + NODE_H,
  };
}

export function stationOrigin(station: PathStation): GridPoint {
  return { x: station.col * CELL_W, y: station.row * CELL_H };
}

export function stationAnchor(station: PathStation): GridPoint {
  const origin = stationOrigin(station);
  return { x: origin.x + NODE_W / 2, y: origin.y + NODE_H / 2 };
}

export function snap4(value: number): number {
  return Math.round(value / 4) * 4;
}

function dedupeSteps(points: readonly GridPoint[]): GridPoint[] {
  const next: GridPoint[] = [];
  for (const point of points) {
    const prev = next[next.length - 1];
    if (prev && prev.x === point.x && prev.y === point.y) continue;
    next.push(point);
  }
  return next;
}

/**
 * Axis-aligned pixel steps with a short spur.
 * The spur is the mycelium twig. Nothing here crawls; motion is a paint concern.
 */
export function myceliumRun(from: GridPoint, to: GridPoint): GridPoint[] {
  const a = { x: snap4(from.x), y: snap4(from.y) };
  const b = { x: snap4(to.x), y: snap4(to.y) };
  if (a.x === b.x && a.y === b.y) return [a];

  if (a.y === b.y) {
    const mid = snap4((a.x + b.x) / 2);
    const dip = a.y + 16;
    return dedupeSteps([
      a,
      { x: mid, y: a.y },
      { x: mid, y: dip },
      { x: mid + 8, y: dip },
      { x: mid, y: dip },
      { x: mid, y: a.y },
      b,
    ]);
  }

  if (a.x === b.x) {
    const mid = snap4((a.y + b.y) / 2);
    const jog = a.x + 16;
    return dedupeSteps([
      a,
      { x: a.x, y: mid },
      { x: jog, y: mid },
      { x: jog, y: mid + 8 },
      { x: jog, y: mid },
      { x: a.x, y: mid },
      b,
    ]);
  }

  const midX = snap4((a.x + b.x) / 2);
  const midY = snap4((a.y + b.y) / 2);
  return dedupeSteps([
    a,
    { x: midX, y: a.y },
    { x: midX, y: midY },
    { x: midX + 8, y: midY },
    { x: midX, y: midY },
    { x: midX, y: b.y },
    b,
  ]);
}

export function threadOffset(points: readonly GridPoint[]): GridPoint[] {
  return points.map((point) => ({ x: point.x + 4, y: point.y }));
}

export function pointsAttr(points: readonly GridPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function runIsOrthogonal(points: readonly GridPoint[]): boolean {
  if (points.length < 2) return false;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    if (!prev || !next) return false;
    const horizontal = prev.y === next.y && prev.x !== next.x;
    const vertical = prev.x === next.x && prev.y !== next.y;
    if (!horizontal && !vertical) return false;
    if (prev.x % 4 !== 0 || prev.y % 4 !== 0 || next.x % 4 !== 0 || next.y % 4 !== 0) return false;
  }
  return true;
}

/** A step that leaves the run and comes straight back, eight pixels long. */
export function hasSpur(points: readonly GridPoint[]): boolean {
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const tip = points[i];
    const next = points[i + 1];
    if (!prev || !tip || !next) continue;
    if (prev.x !== next.x || prev.y !== next.y) continue;
    const dist = Math.abs(tip.x - prev.x) + Math.abs(tip.y - prev.y);
    if (dist === 8) return true;
  }
  return false;
}
