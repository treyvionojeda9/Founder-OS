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

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const TOOLS = new Set<StrokeTool>(["pen", "highlighter", "eraser"]);

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
