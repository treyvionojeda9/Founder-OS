import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Note, PrincipalRole } from "../storage/noteRepository";
import { isValidStroke, type Stroke, type StrokePoint } from "../storage/strokes";
import { noteRepo } from "../storage/services";
import { createHumanNoteId } from "../storage/ulid";
import {
  buildPenStroke,
  idleInkAdapter,
  nextStrokeId,
  PONDER_INK_COLOR,
  PONDER_INK_WIDTH,
  stepInkPointer,
  type InkAdapterState,
  type InkPointerPhase,
  type InkSample,
} from "./inkPointer";
import { INK_AUTOSAVE_MS, loadPonderInk, savePonderInk, strokesFromAsset } from "./ponderInk";

type InkFrame = HTMLDivElement & { __inkPaintSamples?: number[] };

type InkPageProps = {
  doorId: string;
  interactive: boolean;
  enabled: boolean;
  principal: PrincipalRole;
  note: Note | null;
  onNote: (note: Note) => void;
  onStrokeCount: (count: number) => void;
  onStatus: (message: string) => void;
};

export function InkPage({
  doorId,
  interactive,
  enabled,
  principal,
  note,
  onNote,
  onStrokeCount,
  onStatus,
}: InkPageProps) {
  const frameRef = useRef<InkFrame>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const adapterRef = useRef<InkAdapterState>(idleInkAdapter());
  const panRef = useRef({ x: 0, y: 0 });
  const dprRef = useRef(1);
  const noteRef = useRef<Note | null>(note);
  const principalRef = useRef(principal);
  const mintedRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const runningRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const samplesRef = useRef<number[]>([]);
  const onNoteRef = useRef(onNote);
  const onStatusRef = useRef(onStatus);
  const onStrokeCountRef = useRef(onStrokeCount);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const acceptingRef = useRef(false);
  const [tick, setTick] = useState(0);

  noteRef.current = note;
  principalRef.current = principal;
  onNoteRef.current = onNote;
  onStatusRef.current = onStatus;
  onStrokeCountRef.current = onStrokeCount;

  const noteId = () => {
    if (noteRef.current?.id) return noteRef.current.id;
    if (!mintedRef.current) mintedRef.current = createHumanNoteId();
    return mintedRef.current;
  };

  const context = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PONDER_INK_COLOR;
    ctx.fillStyle = PONDER_INK_COLOR;
    ctx.lineWidth = PONDER_INK_WIDTH * dprRef.current;
    return ctx;
  };

  const sx = (point: StrokePoint) => (point.x + panRef.current.x) * dprRef.current;
  const sy = (point: StrokePoint) => (point.y + panRef.current.y) * dprRef.current;

  const paintDot = (ctx: CanvasRenderingContext2D, point: StrokePoint) => {
    ctx.beginPath();
    ctx.arc(sx(point), sy(point), (PONDER_INK_WIDTH * dprRef.current) / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const paintSegment = (ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint) => {
    ctx.beginPath();
    ctx.moveTo(sx(from), sy(from));
    ctx.lineTo(sx(to), sy(to));
    ctx.stroke();
  };

  const paintStroke = (ctx: CanvasRenderingContext2D, points: readonly StrokePoint[]) => {
    if (points.length === 0) return;
    const first = points[0];
    if (!first) return;
    if (points.length === 1) {
      paintDot(ctx, first);
      return;
    }
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const next = points[i];
      if (prev && next) paintSegment(ctx, prev, next);
    }
  };

  const paintAll = () => {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) paintStroke(ctx, stroke.points);
    const live = adapterRef.current.draw?.points;
    if (live) paintStroke(ctx, live);
  };

  const paintAdded = (previous: StrokePoint | null, added: readonly StrokePoint[]) => {
    const ctx = context();
    if (!ctx || added.length === 0) return;
    let prev = previous;
    for (const point of added) {
      if (!prev) paintDot(ctx, point);
      else paintSegment(ctx, prev, point);
      prev = point;
    }
  };

  const syncDataset = () => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.dataset.strokeCount = String(strokesRef.current.length);
    frame.dataset.panX = String(panRef.current.x);
    frame.dataset.panY = String(panRef.current.y);
    if (acceptingRef.current) frame.dataset.inkReady = "true";
    frame.__inkPaintSamples = samplesRef.current;
  };

  const fitCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const width = Math.max(1, Math.round(Math.max(rect.width, 1) * dpr));
    const height = Math.max(1, Math.round(Math.max(rect.height, 1) * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    paintAll();
    syncDataset();
  };

  const scheduleSave = () => {
    dirtyRef.current = true;
    const frame = frameRef.current;
    if (frame) frame.dataset.inkSaved = "pending";
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, INK_AUTOSAVE_MS);
  };

  flushRef.current = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      while (dirtyRef.current) {
        dirtyRef.current = false;
        const strokes = strokesRef.current.slice();
        if (strokes.length === 0) continue;
        const rect = canvasRef.current?.getBoundingClientRect();
        let previewPng: string | undefined;
        try {
          const canvas = canvasRef.current;
          if (canvas && canvas.getContext("2d")) {
            const url = canvas.toDataURL("image/png");
            if (url.startsWith("data:image/png")) previewPng = url;
          }
        } catch {
          previewPng = undefined;
        }
        const result = await savePonderInk({
          doorId,
          strokes,
          principal: principalRef.current,
          existing: noteRef.current && noteRef.current.id === strokes[0]?.note_id ? noteRef.current : null,
          repo: noteRepo,
          ink: noteRepo,
          previewPng,
          pageWidth: rect?.width,
          pageHeight: rect?.height,
        });
        const frame = frameRef.current;
        if (!result.ok) {
          if (frame) frame.dataset.inkSaved = "refused";
          if (mountedRef.current) {
            onStatusRef.current(
              result.reason === "machine" ? "Only you can keep this ink." : "That ink could not be kept.",
            );
          }
          return;
        }
        noteRef.current = result.note;
        if (frame) frame.dataset.inkSaved = "true";
        if (mountedRef.current) onNoteRef.current(result.note);
      }
    } catch {
      const frame = frameRef.current;
      if (frame) frame.dataset.inkSaved = "refused";
      if (mountedRef.current) onStatusRef.current("That ink could not be kept.");
    } finally {
      runningRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (dirtyRef.current) void flushRef.current();
    };
  }, [doorId]);

  useEffect(() => {
    if (!enabled) {
      acceptingRef.current = false;
      return;
    }
    let live = true;
    acceptingRef.current = false;
    strokesRef.current = [];
    adapterRef.current = idleInkAdapter();
    panRef.current = { x: 0, y: 0 };
    mintedRef.current = null;
    void (async () => {
      try {
        const asset = await loadPonderInk(noteRef.current, noteRepo);
        if (!live) return;
        strokesRef.current = strokesFromAsset(asset).filter((stroke) => isValidStroke(stroke));
      } finally {
        if (!live) return;
        acceptingRef.current = true;
        setTick((value) => value + 1);
        onStrokeCountRef.current(strokesRef.current.length);
      }
    })();
    return () => {
      live = false;
    };
  }, [doorId, enabled]);

  useLayoutEffect(() => {
    fitCanvas();
    const frame = frameRef.current;
    if (!frame) return;
    if (!frame.dataset.inkSaved) {
      frame.dataset.inkSaved = strokesRef.current.length > 0 ? "true" : "false";
    }
  }, [tick, interactive]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitCanvas());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [tick, interactive]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas || !interactive || !enabled) return;

    const view = () => {
      const rect = canvas.getBoundingClientRect();
      return {
        frameLeft: rect.left,
        frameTop: rect.top,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    };

    const coalescedOf = (event: PointerEvent): InkSample[] => {
      const native = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
      return native.map((item) => ({
        clientX: item.clientX,
        clientY: item.clientY,
        timeStamp: item.timeStamp,
        pressure: item.pressure,
      }));
    };

    const onPointer = (phase: InkPointerPhase) => (event: PointerEvent) => {
      if (!acceptingRef.current) return;
      if (event.pointerType !== "mouse") event.preventDefault();
      const previous = adapterRef.current.draw?.points.at(-1) ?? null;
      const step = stepInkPointer(
        adapterRef.current,
        {
          phase,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          buttons: event.buttons,
          clientX: event.clientX,
          clientY: event.clientY,
          timeStamp: event.timeStamp,
          pressure: event.pressure,
          coalesced: phase === "down" ? [] : coalescedOf(event),
        },
        view(),
      );
      adapterRef.current = step.state;
      if (phase === "down") {
        try {
          frame.setPointerCapture(event.pointerId);
        } catch {
          // jsdom and detached nodes have no capture.
        }
      }
      const panned = step.panX !== panRef.current.x || step.panY !== panRef.current.y;
      if (panned) {
        panRef.current = { x: step.panX, y: step.panY };
        paintAll();
      } else if (step.added.length > 0) {
        paintAdded(previous, step.added);
        const dt = performance.now() - event.timeStamp;
        if (Number.isFinite(dt) && dt >= 0 && dt <= 10_000) {
          for (let i = 0; i < step.added.length; i += 1) samplesRef.current.push(dt);
          if (samplesRef.current.length > 4000) {
            samplesRef.current.splice(0, samplesRef.current.length - 4000);
          }
        }
      }
      if (step.finished) {
        const stroke = buildPenStroke({
          noteId: noteId(),
          strokeId: nextStrokeId(strokesRef.current),
          points: step.finished,
        });
        if (stroke) {
          strokesRef.current = [...strokesRef.current, stroke];
          scheduleSave();
          onStrokeCountRef.current(strokesRef.current.length);
        }
      }
      syncDataset();
    };

    const down = onPointer("down");
    const move = onPointer("move");
    const up = onPointer("up");
    const cancel = onPointer("cancel");
    const listen = { passive: false } as const;
    frame.addEventListener("pointerdown", down, listen);
    frame.addEventListener("pointermove", move, listen);
    frame.addEventListener("pointerup", up, listen);
    frame.addEventListener("pointercancel", cancel, listen);
    return () => {
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", up);
      frame.removeEventListener("pointercancel", cancel);
    };
  }, [interactive, enabled, doorId]);

  const show = interactive || strokesRef.current.length > 0;
  if (!show) return null;

  return (
    <div
      ref={frameRef}
      className="ink-page"
      data-ink-page={interactive ? "live" : "rest"}
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
