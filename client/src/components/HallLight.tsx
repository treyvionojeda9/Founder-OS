import { useEffect, useRef } from "react";
import { paintWarmLight } from "../hall/pixelLight";

function useWarmCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      paintWarmLight(ctx, width, height, 6);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return ref;
}

export function WarmCover({ className, phase }: { className?: string; phase?: string }) {
  const ref = useWarmCanvas();
  return <canvas ref={ref} className={className} data-phase={phase} aria-hidden="true" />;
}
