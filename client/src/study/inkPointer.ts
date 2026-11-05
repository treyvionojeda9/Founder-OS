import { schoolAccent } from "../design/palette";
import { isValidStroke, type Stroke, type StrokePoint } from "../storage/strokes";

/** Ink from the Founder Ember palette. Strokes stay smooth; the chrome around them does not. */
export const PONDER_INK_COLOR = schoolAccent.ink;
export const PONDER_INK_WIDTH = 2;
export const PONDER_PAGE_ID = "PAGE-01";

export type InkPointerPhase = "down" | "move" | "up" | "cancel";

export type InkSample = {
  clientX: number;
  clientY: number;
  timeStamp: number;
  pressure: number;
};

export type InkPointerInput = InkSample & {
  phase: InkPointerPhase;
  pointerId: number;
  pointerType: string;
  buttons: number;
  coalesced: InkSample[];
};

export type InkDraw = {
  pointerId: number;
  kind: "pen" | "mouse";
  t0: number;
  lastT: number;
  points: StrokePoint[];
};

export type InkAdapterState = {
  draw: InkDraw | null;
  touchId: number | null;
  touchX: number;
  touchY: number;
};

export type InkView = {
  frameLeft: number;
  frameTop: number;
  panX: number;
  panY: number;
};

export type InkStep = {
  state: InkAdapterState;
  added: StrokePoint[];
  finished: StrokePoint[] | null;
  panX: number;
  panY: number;
};

export function idleInkAdapter(): InkAdapterState {
  return { draw: null, touchId: null, touchX: 0, touchY: 0 };
}

function drawKind(pointerType: string): "pen" | "mouse" | null {
  if (pointerType === "pen") return "pen";
  if (pointerType === "mouse") return "mouse";
  return null;
}

/**
 * Browsers report 0.5 when the device has no pressure. That value is omitted.
 * A pen reading other than 0.5 is kept. Mouse pressure is never kept.
 */
function realPressure(kind: "pen" | "mouse", pressure: number): number | undefined {
  if (kind !== "pen") return undefined;
  if (typeof pressure !== "number" || !Number.isFinite(pressure) || pressure < 0 || pressure > 1) {
    return undefined;
  }
  if (pressure === 0.5) return undefined;
  return pressure;
}

function toPoint(
  sample: InkSample,
  kind: "pen" | "mouse",
  view: InkView,
  t0: number,
  lastT: number,
): { point: StrokePoint; lastT: number } | null {
  const x = sample.clientX - view.frameLeft - view.panX;
  const y = sample.clientY - view.frameTop - view.panY;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(sample.timeStamp)) return null;
  let t_ms = sample.timeStamp - t0;
  if (!Number.isFinite(t_ms)) return null;
  if (t_ms < 0) t_ms = 0;
  if (t_ms < lastT) t_ms = lastT;
  const point: StrokePoint = { x, y, t_ms };
  const pressure = realPressure(kind, sample.pressure);
  if (pressure !== undefined) point.p = pressure;
  return { point, lastT: t_ms };
}

function extend(
  draw: InkDraw,
  samples: InkSample[],
  view: InkView,
): { draw: InkDraw; added: StrokePoint[] } {
  const points = draw.points.slice();
  let lastT = draw.lastT;
  const added: StrokePoint[] = [];
  for (const sample of samples) {
    const next = toPoint(sample, draw.kind, view, draw.t0, lastT);
    if (!next) continue;
    points.push(next.point);
    added.push(next.point);
    lastT = next.lastT;
  }
  return { draw: { ...draw, points, lastT }, added };
}

export function stepInkPointer(state: InkAdapterState, input: InkPointerInput, view: InkView): InkStep {
  const hold: InkStep = {
    state,
    added: [],
    finished: null,
    panX: view.panX,
    panY: view.panY,
  };
  const kind = drawKind(input.pointerType);

  if (input.phase === "down") {
    if (kind) {
      const started = toPoint(input, kind, view, input.timeStamp, 0);
      if (!started) return hold;
      return {
        state: {
          draw: {
            pointerId: input.pointerId,
            kind,
            t0: input.timeStamp,
            lastT: started.point.t_ms,
            points: [started.point],
          },
          touchId: null,
          touchX: 0,
          touchY: 0,
        },
        added: [started.point],
        finished: null,
        panX: view.panX,
        panY: view.panY,
      };
    }
    if (input.pointerType !== "touch" || state.draw || state.touchId !== null) return hold;
    return {
      state: {
        draw: null,
        touchId: input.pointerId,
        touchX: input.clientX,
        touchY: input.clientY,
      },
      added: [],
      finished: null,
      panX: view.panX,
      panY: view.panY,
    };
  }

  if (input.phase === "move") {
    if (state.draw && state.draw.pointerId === input.pointerId && kind === state.draw.kind) {
      const samples = input.coalesced.length > 0 ? input.coalesced : [input];
      const grown = extend(state.draw, samples, view);
      return {
        state: { ...state, draw: grown.draw },
        added: grown.added,
        finished: null,
        panX: view.panX,
        panY: view.panY,
      };
    }
    if (state.touchId !== input.pointerId || input.pointerType !== "touch" || state.draw) return hold;
    const dx = input.clientX - state.touchX;
    const dy = input.clientY - state.touchY;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return hold;
    return {
      state: { ...state, touchX: input.clientX, touchY: input.clientY },
      added: [],
      finished: null,
      panX: view.panX + dx,
      panY: view.panY + dy,
    };
  }

  if (state.draw && state.draw.pointerId === input.pointerId) {
    const samples = input.coalesced.length > 0 ? input.coalesced : [input];
    const grown = extend(state.draw, samples, view);
    return {
      state: { draw: null, touchId: state.touchId, touchX: state.touchX, touchY: state.touchY },
      added: grown.added,
      finished: grown.draw.points,
      panX: view.panX,
      panY: view.panY,
    };
  }
  if (state.touchId !== input.pointerId) return hold;
  return {
    state: { ...state, touchId: null },
    added: [],
    finished: null,
    panX: view.panX,
    panY: view.panY,
  };
}

export function buildPenStroke(input: {
  noteId: string;
  strokeId: string;
  points: StrokePoint[];
  color?: string;
  width?: number;
}): Stroke | null {
  if (input.points.length === 0) return null;
  const points = input.points.map((point) => {
    const next: StrokePoint = { x: point.x, y: point.y, t_ms: point.t_ms };
    if (typeof point.p === "number") next.p = point.p;
    return next;
  });
  const stroke: Stroke = {
    note_id: input.noteId,
    page_id: PONDER_PAGE_ID,
    stroke_id: input.strokeId,
    points,
    tool: "pen",
    color: input.color ?? PONDER_INK_COLOR,
    width: input.width ?? PONDER_INK_WIDTH,
  };
  return isValidStroke(stroke) ? stroke : null;
}

export function nextStrokeId(strokes: readonly { stroke_id: string }[]): string {
  let max = 0;
  for (const stroke of strokes) {
    const match = /^STR-(\d+)$/.exec(stroke.stroke_id);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return `STR-${String(max + 1).padStart(3, "0")}`;
}
