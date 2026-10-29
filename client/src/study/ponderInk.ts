import { founderEmber } from "../design/palette";
import {
  isValidRawInkPoints,
  isValidRawInkStroke,
  type RawInkPoint,
  type RawInkStroke,
} from "../storage/strokes";

/** Founder Ember darkwood. School ink stays off this sheet. */
export const PONDER_INK_COLOR = founderEmber.darkwood;
export const PONDER_INK_WIDTH = 2.4;

const MIN_DIST2 = 0.003 * 0.003;

export function acceptsInkPointer(input: { pointerType: string; button: number; width?: number }): boolean {
  if (input.pointerType === "mouse" && input.button !== 0) return false;
  if (input.pointerType === "touch" && (input.width ?? 0) > 40) return false;
  return input.pointerType === "pen" || input.pointerType === "touch" || input.pointerType === "mouse";
}

/** Drop a sample that barely moved. Hold time so a late packet cannot run backward. */
export function keepSample(previous: RawInkPoint | undefined, next: RawInkPoint): RawInkPoint | null {
  if (!previous) return next;
  const t_ms = next.t_ms < previous.t_ms ? previous.t_ms : next.t_ms;
  const point = t_ms === next.t_ms ? next : { ...next, t_ms };
  const dx = point.x - previous.x;
  const dy = point.y - previous.y;
  const moved = dx * dx + dy * dy >= MIN_DIST2;
  const pressed = Math.abs(point.p - previous.p) >= 0.04;
  if (!moved && !pressed) return null;
  return point;
}

export function sealPonderStroke(points: readonly RawInkPoint[]): RawInkStroke | null {
  if (!isValidRawInkPoints(points)) return null;
  const stroke: RawInkStroke = {
    points: points.map((point) => ({ x: point.x, y: point.y, t_ms: point.t_ms, p: point.p })),
    color: PONDER_INK_COLOR,
    width: PONDER_INK_WIDTH,
  };
  return isValidRawInkStroke(stroke) ? stroke : null;
}

export function sealPonderInk(
  strokes: readonly { points: readonly RawInkPoint[] }[] | null | undefined,
): RawInkStroke[] {
  if (!strokes || strokes.length === 0) return [];
  const sealed: RawInkStroke[] = [];
  for (const stroke of strokes) {
    const next = sealPonderStroke(stroke?.points ?? []);
    if (next) sealed.push(next);
  }
  return sealed;
}

export function cloneInk(strokes: readonly RawInkStroke[]): RawInkStroke[] {
  return strokes.map((stroke) => ({
    color: stroke.color,
    width: stroke.width,
    points: stroke.points.map((point) => ({ x: point.x, y: point.y, t_ms: point.t_ms, p: point.p })),
  }));
}

function paintStroke(ctx: CanvasRenderingContext2D, stroke: RawInkStroke, width: number, height: number) {
  const points = stroke.points;
  if (points.length === 0) return;
  const base = stroke.width > 0 ? stroke.width : PONDER_INK_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = PONDER_INK_COLOR;
  ctx.fillStyle = PONDER_INK_COLOR;
  if (points.length === 1) {
    const radius = base * (0.55 + points[0].p * 0.7);
    ctx.beginPath();
    ctx.arc(points[0].x * width, points[0].y * height, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const pressure = (start.p + end.p) / 2;
    ctx.beginPath();
    ctx.lineWidth = base * (0.7 + pressure * 1.1);
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }
}

/** Immediate paint. No stroke animation, so reduced motion still shows the mark. */
export function paintInk(
  canvas: HTMLCanvasElement,
  strokes: readonly RawInkStroke[],
  draft: readonly RawInkPoint[] | null,
) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth <= 0 || cssHeight <= 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const bitmapWidth = Math.max(1, Math.round(cssWidth * dpr));
  const bitmapHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  for (const stroke of strokes) paintStroke(ctx, stroke, cssWidth, cssHeight);
  if (draft && draft.length > 0) {
    paintStroke(ctx, { points: [...draft], color: PONDER_INK_COLOR, width: PONDER_INK_WIDTH }, cssWidth, cssHeight);
  }
}
