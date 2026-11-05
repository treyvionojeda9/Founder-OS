import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { SPLASH_FLAME_FRAME_MS, splashFlameFrames, splashFlameIndex } from "../design/splashFlicker";
import { useFormFactor } from "../hooks/useFormFactor";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function Splash() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const layout = useFormFactor();
  const left = useRef(false);
  const [tick, setTick] = useState(0);

  const go = useCallback(() => {
    if (left.current) return;
    left.current = true;
    navigate("/home");
  }, [navigate]);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(go, 1500);
    return () => window.clearTimeout(timer);
  }, [go, reduce]);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, SPLASH_FLAME_FRAME_MS);
    return () => window.clearInterval(timer);
  }, [reduce]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const scale = layout === "landscape" ? 4 : 6;
  const index = splashFlameIndex(tick, reduce);

  return (
    <main className="splash">
      <div className="splash-card">
        <div className="splash-flame" data-motion={reduce ? "still" : "flicker"} data-frame={index}>
          <Sprite
            rows={splashFlameFrames[index] ?? splashFlameFrames[0]}
            scale={scale}
            title="Spark of Freedom flame"
          />
        </div>
        <h1 className="wordmark">Spark of Freedom</h1>
        <button type="button" className="continue" onClick={go}>
          Continue
        </button>
        <p className="hint">Tap Continue or press Enter.</p>
      </div>
    </main>
  );
}
