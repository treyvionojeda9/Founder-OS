import { useEffect, useRef } from "react";
import { paintSpaceLayer, type SpaceId } from "./spaceSkin";

type SpaceCanvasProps = {
  space: SpaceId;
  live: "in" | "out" | "hold";
  kind?: "hall" | "wall" | "desk";
};

export function SpaceCanvas({ space, live, kind = "hall" }: SpaceCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      canvas.dataset.painted = paintSpaceLayer(canvas, space, kind) ? "true" : "false";
    };
    paint();
    window.addEventListener("resize", paint);
    const parent = canvas.parentElement;
    const observer = typeof ResizeObserver !== "undefined" && parent ? new ResizeObserver(paint) : null;
    if (observer && parent) observer.observe(parent);
    return () => {
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