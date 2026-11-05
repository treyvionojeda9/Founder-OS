import { useEffect, useState } from "react";
import { prefersStillFrames } from "../hall/doorMotion";
import { useReducedMotion } from "./useReducedMotion";

function slowUpdate(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(update: slow)").matches;
}

/** Reduced motion and e-ink (`update: slow`) both take the one-frame cut. */
export function useStillFrame(): boolean {
  const reduce = useReducedMotion();
  const [slow, setSlow] = useState(slowUpdate);

  useEffect(() => {
    const media = window.matchMedia("(update: slow)");
    const onChange = () => setSlow(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return prefersStillFrames(reduce, slow);
}
