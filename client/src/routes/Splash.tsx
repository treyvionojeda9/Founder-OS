import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { flame } from "../design/sprites";
import { useFormFactor } from "../hooks/useFormFactor";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function Splash() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const layout = useFormFactor();
  const left = useRef(false);

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const scale = layout === "landscape" ? 4 : 6;

  return (
    <main className="splash">
      <div className="splash-card">
        <Sprite rows={flame} scale={scale} title="Spark of Freedom flame" />
        <h1 className="wordmark">Spark of Freedom</h1>
        <button type="button" className="continue" onClick={go}>
          Continue
        </button>
        <p className="hint">Tap Continue or press Enter.</p>
      </div>
    </main>
  );
}
