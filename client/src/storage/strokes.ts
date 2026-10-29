export type StrokeTool = "pen" | "highlighter" | "eraser";

/** Pressure is optional. A pen page does not require it. */
export type StrokePoint = {
  x: number;
  y: number;
  t_ms: number;
  p?: number;
};

export type Stroke = {
  note_id: string;
  page_id: string;
  stroke_id: string;
  points: StrokePoint[];
  tool: StrokeTool;
  color: string;
  width: number;
};

/**
 * White Paper stroke example. The colour literal lives here so the
 * vault sample stays reviewable next to isValidStroke().
 */
export const WP_STROKE_EXAMPLE: Stroke = {
  note_id: "HN-01JEXAMPLE42",
  page_id: "PAGE-01",
  stroke_id: "STR-003",
  points: [{ x: 20.2, y: 41.0, t_ms: 0, p: 0.5 }],
  tool: "pen",
  color: "#1f2523",
  width: 2.0,
};

/** Used when the pointer has no pressure (mouse, some touch, or a zero reading). */
export const DEFAULT_INK_PRESSURE = 0.5;

/**
 * Ponder-sheet sample. `x` and `y` are fractions of the sheet (0–1).
 * `p` is always present after capture.
 */
export type RawInkPoint = {
  x: number;
  y: number;
  t_ms: number;
  p: number;
};

export type RawInkStroke = {
  points: RawInkPoint[];
  color: string;
  width: number;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const TOOLS = new Set<StrokeTool>(["pen", "highlighter", "eraser"]);

function clampUnit(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * 10000) / 10000;
}

/** Missing, zero, or out-of-range pressure becomes 0.5. A light stylus value stays. */
export function pressureOrDefault(p: number | undefined): number {
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0 || p > 1) return DEFAULT_INK_PRESSURE;
  return Math.round(p * 1000) / 1000;
}

export function normalizeInkPoint(x: number, y: number, t_ms: number, p?: number): RawInkPoint | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(t_ms) || t_ms < 0) return null;
  return {
    x: clampUnit(x),
    y: clampUnit(y),
    t_ms: Math.round(t_ms),
    p: pressureOrDefault(p),
  };
}

export function isValidRawInkPoints(points: readonly RawInkPoint[] | undefined): boolean {
  if (!points || points.length === 0) return false;
  let previous = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    if (!point || !Number.isFinite(point.x) || point.x < 0 || point.x > 1) return false;
    if (!Number.isFinite(point.y) || point.y < 0 || point.y > 1) return false;
    if (!Number.isFinite(point.t_ms) || point.t_ms < 0 || point.t_ms < previous) return false;
    previous = point.t_ms;
    if (typeof point.p !== "number" || !Number.isFinite(point.p) || point.p <= 0 || point.p > 1) return false;
  }
  return true;
}

export function isValidRawInkStroke(stroke: RawInkStroke | undefined): boolean {
  if (!stroke || typeof stroke.color !== "string" || !HEX_COLOR.test(stroke.color)) return false;
  if (typeof stroke.width !== "number" || !Number.isFinite(stroke.width) || stroke.width <= 0) return false;
  return isValidRawInkPoints(stroke.points);
}

export function isValidStroke(stroke: Stroke): boolean {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return false;
  if (!TOOLS.has(stroke.tool)) return false;
  if (typeof stroke.color !== "string" || !HEX_COLOR.test(stroke.color)) return false;
  if (typeof stroke.width !== "number" || !Number.isFinite(stroke.width) || stroke.width <= 0) {
    return false;
  }
  let previous = Number.NEGATIVE_INFINITY;
  for (const point of stroke.points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.t_ms)) {
      return false;
    }
    if (point.t_ms < previous) return false;
    previous = point.t_ms;
    if (point.p !== undefined) {
      if (typeof point.p !== "number" || !Number.isFinite(point.p) || point.p < 0 || point.p > 1) {
        return false;
      }
    }
  }
  return true;
}
