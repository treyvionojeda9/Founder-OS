import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import {
  CHROME_LEAVE_MS,
  chromeFrames,
  chromeInputForLayout,
  chromeZone,
  initialRecede,
  reduceRecede,
  type ChromePose,
  type RecedeState,
} from "./chromeRecede";

/**
 * The top darkwood bar fades after the pointer leaves, or after a tablet tap
 * on the room. It never writes a vault. The mail mouth is not part of the bar.
 */
export function ChromeRecede() {
  const layout = useFormFactor();
  const still = useStillFrame();
  const location = useLocation();
  const input = chromeInputForLayout(layout);
  const state = useRef<RecedeState>(initialRecede());
  const timer = useRef<number | null>(null);
  const [pose, setPose] = useState<ChromePose>("full");

  const clearTimer = () => {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
  };

  const commit = (next: RecedeState) => {
    state.current = next;
    setPose((current) => (current === next.pose ? current : next.pose));
  };

  useLayoutEffect(() => {
    clearTimer();
    commit(initialRecede());
  }, [location.pathname, input]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.recede = pose;
    root.dataset.chromeInput = input;
    root.dataset.chromeFrames = String(chromeFrames(still));
    root.dataset.mailMouth = "shown";
    return () => {
      delete root.dataset.recede;
      delete root.dataset.chromeInput;
      delete root.dataset.chromeFrames;
      delete root.dataset.mailMouth;
    };
  }, [pose, input, still]);

  useEffect(() => {
    if (input !== "pointer") return;

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (chromeZone(event.target) !== "top") return;
      if (chromeZone(event.relatedTarget) === "top") return;
      clearTimer();
      commit(reduceRecede(state.current, { type: "enter" }, "pointer"));
    };

    const onOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (chromeZone(event.target) !== "top") return;
      if (chromeZone(event.relatedTarget) === "top") return;
      const at = Date.now();
      commit(reduceRecede(state.current, { type: "leave", at }, "pointer"));
      clearTimer();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        commit(reduceRecede(state.current, { type: "tick", at: Date.now() }, "pointer"));
      }, CHROME_LEAVE_MS);
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    return () => {
      clearTimer();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
    };
  }, [input]);

  useEffect(() => {
    if (input !== "tap") return;

    const onUp = (event: PointerEvent) => {
      const zone = chromeZone(event.target);
      if (zone === "top" || zone === "control") {
        commit(reduceRecede(state.current, { type: "tap-chrome" }, "tap"));
        return;
      }
      if (zone === "room" && document.querySelector(".pixel-bar")) {
        commit(reduceRecede(state.current, { type: "tap-room" }, "tap"));
      }
    };

    document.addEventListener("pointerup", onUp);
    return () => document.removeEventListener("pointerup", onUp);
  }, [input]);

  return null;
}
