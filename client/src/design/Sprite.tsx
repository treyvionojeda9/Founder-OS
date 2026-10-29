import { useEffect, useRef } from "react";
import { paletteByChar } from "./palette";
import { assertSpriteGrid } from "./spriteGrid";
import type { SpriteGrid } from "./sprites/types";

export type SpriteLayer = {
  rows: SpriteGrid;
  x: number;
  y: number;
};

type SpriteProps = {
  rows: SpriteGrid;
  scale: number;
  title: string;
  layers?: readonly SpriteLayer[];
};

export function Sprite({ rows, scale, title, layers = [] }: SpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    assertSpriteGrid(rows);
    for (const layer of layers) assertSpriteGrid(layer.rows);
    if (!Number.isInteger(scale) || scale < 1) {
      throw new Error("Sprite scale must be a positive integer");
    }
    const cols = rows[0].length;
    const height = rows.length;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    canvas.width = cols * scale * dpr;
    canvas.height = height * scale * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cols * scale, height * scale);
    paint(ctx, rows, 0, 0, scale);
    for (const layer of layers) {
      paint(ctx, layer.rows, layer.x, layer.y, scale);
    }
  }, [rows, scale, layers, title]);

  const cols = rows[0]?.length ?? 0;
  const cssWidth = cols * scale;
  const cssHeight = rows.length * scale;
  const labelled = title.length > 0;

  return (
    <canvas
      ref={ref}
      className="sprite"
      width={cssWidth}
      height={cssHeight}
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

function paint(
  ctx: CanvasRenderingContext2D,
  rows: SpriteGrid,
  originX: number,
  originY: number,
  scale: number,
) {
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const color = paletteByChar[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect((originX + x) * scale, (originY + y) * scale, scale, scale);
    }
  }
}
