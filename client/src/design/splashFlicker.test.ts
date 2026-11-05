import { describe, expect, it } from "vitest";
import { grayscaleGrid } from "./spriteGrid";
import { SPLASH_FLAME_FRAME_MS, splashFlameFrames, splashFlameIndex } from "./splashFlicker";
import { flame } from "./sprites";
import type { SpriteGrid } from "./sprites/types";

const ALLOWED = new Set([".", "f", "e", "n"]);

function cells(rows: SpriteGrid, ch: string): [number, number][] {
  const found: [number, number][] = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === ch) found.push([x, y]);
    });
  });
  return found;
}

/** Body is the flame/ember connected to the outer almond. The core is the flame it cannot reach. */
function bodyCells(rows: SpriteGrid): Set<string> {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const seen = new Set<string>();
  const stack: [number, number][] = [];
  for (let y = 0; y < height && stack.length === 0; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ch = rows[y]?.[x];
      if (ch === "f" || ch === "e") {
        stack.push([x, y]);
        break;
      }
    }
  }
  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) break;
    const [x, y] = next;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    const ch = rows[y]?.[x];
    if (ch !== "f" && ch !== "e") continue;
    seen.add(key);
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return seen;
}

function coreCells(rows: SpriteGrid): [number, number][] {
  const body = bodyCells(rows);
  return cells(rows, "f").filter(([x, y]) => !body.has(`${x},${y}`));
}

function delta(a: SpriteGrid, b: SpriteGrid): number {
  let count = 0;
  for (let y = 0; y < a.length; y += 1) {
    const left = a[y] ?? "";
    const right = b[y] ?? "";
    for (let x = 0; x < left.length; x += 1) {
      if (left[x] !== right[x]) count += 1;
    }
  }
  return count;
}

describe("splash flame flicker", () => {
  it("keeps three flame, ember, and night frames with a sealed core", () => {
    expect(splashFlameFrames).toHaveLength(3);
    expect(SPLASH_FLAME_FRAME_MS).toBeGreaterThanOrEqual(120);
    expect(SPLASH_FLAME_FRAME_MS).toBeLessThanOrEqual(250);
    expect(Number.isInteger(SPLASH_FLAME_FRAME_MS)).toBe(true);

    const [core, lift, settle] = splashFlameFrames;
    if (!core || !lift || !settle) throw new Error("splash frames missing");
    const width = core[0]?.length ?? 0;
    for (const frame of splashFlameFrames) {
      expect(frame).toHaveLength(core.length);
      const used = new Set(frame.join(""));
      for (const ch of used) expect(ALLOWED.has(ch)).toBe(true);
      expect(used.has("f")).toBe(true);
      expect(used.has("e")).toBe(true);
      expect(used.has("n")).toBe(true);
      for (const row of frame) expect(row).toHaveLength(width);

      const body = bodyCells(frame);
      const inner = coreCells(frame);
      expect(inner.length).toBeGreaterThan(20);
      for (const [x, y] of inner) {
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ] as const) {
          const neighbor = frame[ny]?.[nx];
          const touchesBody = neighbor === "e" || (neighbor === "f" && body.has(`${nx},${ny}`));
          expect(touchesBody).toBe(false);
        }
      }
    }

    expect(delta(core, lift)).toBeGreaterThanOrEqual(3);
    expect(delta(core, lift)).toBeLessThanOrEqual(16);
    expect(delta(core, settle)).toBeGreaterThanOrEqual(3);
    expect(delta(core, settle)).toBeLessThanOrEqual(16);
    expect(delta(lift, settle)).toBeGreaterThan(delta(core, lift));
  });

  it("reads the core as its own light in grayscale and leaves the hall flame alone", () => {
    const night = grayscaleGrid(["n"])[0]?.[0] ?? 0;
    const ember = grayscaleGrid(["e"])[0]?.[0] ?? 0;
    const flameLuma = grayscaleGrid(["f"])[0]?.[0] ?? 0;
    expect(flameLuma - ember).toBeGreaterThanOrEqual(40);
    expect(ember - night).toBeGreaterThanOrEqual(40);

    const [core, lift, settle] = splashFlameFrames;
    if (!core || !lift || !settle) throw new Error("splash frames missing");
    const coreLuma = grayscaleGrid(core);
    expect(coreLuma).not.toEqual(grayscaleGrid(lift));
    expect(coreLuma).not.toEqual(grayscaleGrid(settle));
    for (const [x, y] of coreCells(core)) {
      expect(coreLuma[y]?.[x]).toBe(flameLuma);
      expect((coreLuma[y]?.[x] ?? 0) - night).toBeGreaterThanOrEqual(40);
    }

    const hall = flame.join("");
    expect(hall).toMatch(/w/);
    expect(hall).toMatch(/d/);
    expect(hall).not.toContain("n");
    expect(hall).not.toBe(core.join(""));
  });

  it("holds the core frame when motion is reduced and otherwise cycles three frames", () => {
    expect(splashFlameIndex(0, true)).toBe(0);
    expect(splashFlameIndex(2, true)).toBe(0);
    expect(splashFlameIndex(0, false)).toBe(0);
    expect(splashFlameIndex(1, false)).toBe(1);
    expect(splashFlameIndex(2, false)).toBe(2);
    expect(splashFlameIndex(3, false)).toBe(0);
    expect(splashFlameIndex(-1, false)).toBe(2);
  });
});
