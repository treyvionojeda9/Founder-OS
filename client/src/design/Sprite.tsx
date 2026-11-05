import { useEffect, useRef } from "react";
import { NO_LAYERS, paintSpriteCanvas, type SpriteLayer } from "./spritePaint";
import type { SpriteGrid } from "./sprites/types";

export type { SpriteLayer };

type SpriteProps = {
  rows: SpriteGrid;
  scale: number;
  title: string;
  layers?: readonly SpriteLayer[];
};

export function Sprite({ rows, scale, title, layers = NO_LAYERS }: SpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintSpriteCanvas(canvas, rows, scale, layers);
  }, [rows, scale, layers]);

  const cols = rows[0]?.length ?? 0;
  const cssWidth = cols * scale;
  const cssHeight = rows.length * scale;
  const labelled = title.length > 0;

  return (
    <canvas
      ref={ref}
      className="sprite"
      width={cols}
      height={rows.length}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      style={{
        width: cssWidth,
        height: cssHeight,
        imageRendering: "pixelated",
      }}
    />
  );
}
