import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Sprite } from "../design/Sprite";
import { flame } from "../design/sprites";

/** Long enough to skip a tap. Mouse clicks never count — desktop uses the chord and Cmd/Ctrl+K. */
export const LONG_PRESS_MS = 480;

export const LEDGER_EVENT = "founder-ledger";

export function requestLedger() {
  window.dispatchEvent(new Event(LEDGER_EVENT));
}

type PressBindings = {
  "data-flame"?: "spark";
  "data-press"?: "ledger";
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: () => void;
  onPointerCancel?: () => void;
  onContextMenu?: (event: { preventDefault: () => void }) => void;
};

/**
 * Tablet hold on the Spark flame. The mark stays the existing sprite.
 * It is not a floating button, and it is not in the tab order.
 */
export function useFlameLongPress(enabled: boolean): PressBindings {
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => clear, []);

  if (!enabled) return {};

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    clear();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom has no capture */
    }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      requestLedger();
    }, LONG_PRESS_MS);
  };

  return {
    "data-flame": "spark",
    "data-press": "ledger",
    onPointerDown,
    onPointerUp: clear,
    onPointerCancel: clear,
    onContextMenu: (event) => event.preventDefault(),
  };
}

export function SparkFlame({ scale, enabled }: { scale: number; enabled: boolean }) {
  const press = useFlameLongPress(enabled);
  const sprite = <Sprite rows={flame} scale={scale} title="Spark of Freedom flame" />;
  if (!enabled) return sprite;
  return (
    <div className="spark-flame" {...press}>
      {sprite}
    </div>
  );
}
