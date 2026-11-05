import { useEffect, useRef } from "react";
import { SPACE_COLS, SPACE_ROWS, blitPixels, paintDeskWash, paintSpaceBackdrop, paintWallWash, type SpaceId } from "./spaceSkin";

type SpaceCanvasProps = {
  space: SpaceId;
  live: "in" | "out" | "hold";
  kind?: "hall" | "wall" | "desk";
};

function pixelsFor(space: SpaceId, kind: "hall" | "wall" | "desk") {
  if (kind === "wall") return { pixels: paintWallWash(space), cols: 48, rows: 32 };
  if (kind === "desk") return { pixels: paintDeskWash(space), cols: 48, rows: 16 };
  const pixels = paintSpaceBackdrop(space);
  return { pixels, cols: SPACE_COLS, rows: SPACE_ROWS };
}

export function SpaceCanvas({ space, live, kind = "hall" }: SpaceCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { pixels, cols, rows } = pixelsFor(space, kind);
    const paint = () => {
      canvas.dataset.painted = blitPixels(canvas, pixels, cols, rows) ? "true" : "false";
    };
    paint();
    const frame = window.requestAnimationFrame(paint);
    window.addEventListener("resize", paint);
    const parent = canvas.parentElement;
    const observer = typeof ResizeObserver !== "undefined" && parent ? new ResizeObserver(paint) : null;
    if (observer && parent) observer.observe(parent);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", paint);
      observer?.disconnect();
    };
  }, [space, kind]);

  const pattern = kind === "desk" ? (space === "school" ? "band" : "pools") : space === "school" ? "shafts" : "pools";
  return (
    <canvas
      ref={ref}
      className={kind === "hall" ? "space-layer" : "space-wash"}
      data-live={live}
      data-space={space}
      data-lighting={space === "school" ? "school" : "ember"}
      data-pattern={kind === "hall" ? (space === "school" ? "shafts" : "pools") : pattern}
      data-space-wash={kind === "hall" ? undefined : kind}
      aria-hidden="true"
    />
  );
}
