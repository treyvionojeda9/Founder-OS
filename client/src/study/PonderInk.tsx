import { useEffect, useRef } from "react";
import type { RawInkPoint, RawInkStroke } from "../storage/strokes";
import { normalizeInkPoint } from "../storage/strokes";
import { acceptsInkPointer, keepSample, paintInk, sealPonderStroke } from "./ponderInk";

type PonderInkProps = {
  strokes: readonly RawInkStroke[];
  live: boolean;
  describedBy?: string;
  onStroke?: (stroke: RawInkStroke) => void;
};

export function PonderInk({ strokes, live, describedBy, onStroke }: PonderInkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef(strokes);
  const onStrokeRef = useRef(onStroke);
  const draftRef = useRef<RawInkPoint[] | null>(null);
  strokesRef.current = strokes;
  onStrokeRef.current = onStroke;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => paintInk(canvas, strokesRef.current, draftRef.current);
    paint();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(() => paint());
      observer.observe(canvas);
    }
    return () => observer?.disconnect();
  }, [strokes, live]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !live) return;

    let active: { pointerId: number; t0: number; points: RawInkPoint[] } | null = null;

    const paint = () => {
      draftRef.current = active?.points ?? null;
      paintInk(canvas, strokesRef.current, draftRef.current);
    };

    const pointFor = (event: PointerEvent, t0: number, previous: RawInkPoint | undefined) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const normalized = normalizeInkPoint(x, y, Math.max(0, event.timeStamp - t0), event.pressure);
      if (!normalized) return null;
      return keepSample(previous, normalized);
    };

    const onDown = (event: PointerEvent) => {
      if (active) return;
      if (!acceptsInkPointer({ pointerType: event.pointerType, button: event.button, width: event.width })) return;
      event.preventDefault();
      const t0 = event.timeStamp;
      const first = pointFor(event, t0, undefined);
      if (!first) return;
      active = { pointerId: event.pointerId, t0, points: [first] };
      if (typeof canvas.setPointerCapture === "function") {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // The pointer can end before capture lands.
        }
      }
      paint();
    };

    const onMove = (event: PointerEvent) => {
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();
      const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
      const last = coalesced[coalesced.length - 1];
      const samples =
        coalesced.length === 0 || !last || last.clientX !== event.clientX || last.clientY !== event.clientY
          ? [...coalesced, event]
          : coalesced;
      let previous = active.points[active.points.length - 1];
      let grew = false;
      for (const sample of samples) {
        const next = pointFor(sample, active.t0, previous);
        if (!next) continue;
        active.points.push(next);
        previous = next;
        grew = true;
      }
      if (grew) paint();
    };

    const finish = (commit: boolean) => {
      const stroke = active;
      active = null;
      draftRef.current = null;
      if (!stroke || !commit) {
        paintInk(canvas, strokesRef.current, null);
        return;
      }
      const sealed = sealPonderStroke(stroke.points);
      if (!sealed) {
        paintInk(canvas, strokesRef.current, null);
        return;
      }
      onStrokeRef.current?.(sealed);
      paintInk(canvas, [...strokesRef.current, sealed], null);
    };

    const onUp = (event: PointerEvent) => {
      if (!active || event.pointerId !== active.pointerId) return;
      event.preventDefault();
      finish(true);
    };

    const onCancel = (event: PointerEvent) => {
      if (!active || event.pointerId !== active.pointerId) return;
      finish(false);
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp, { passive: false });
    canvas.addEventListener("pointercancel", onCancel);
    paint();

    return () => {
      active = null;
      draftRef.current = null;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
    };
  }, [live]);

  return (
    <canvas
      ref={canvasRef}
      className="ponder-ink"
      data-live={live ? "true" : "false"}
      data-strokes={strokes.length}
      aria-label={live ? "Ink sheet" : "Saved ink"}
      aria-describedby={describedBy}
    >
      Ink sheet
    </canvas>
  );
}
