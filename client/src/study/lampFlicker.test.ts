import { describe, expect, it } from "vitest";
import { grayscaleGrid } from "../design/spriteGrid";
import { deskLampOn } from "../design/sprites";
import {
  LAMP_FLICKER_CYCLE_MS,
  LAMP_FLICKER_FRAME_MS,
  LAMP_FLICKER_PATTERN,
  lampFlickerFrames,
  lampFlickerIndex,
  lampFlickerSlot,
} from "./lampFlicker";
import type { SpriteGrid } from "../design/sprites/types";

const STRUCTURE = new Set(["w", "d", "p", "m"]);

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

describe("working lamp flicker", () => {
  it("keeps three ember and flame frames and does not move the lamp body", () => {
    expect(lampFlickerFrames).toHaveLength(3);
    expect(lampFlickerFrames[0]).toBe(deskLampOn);
    expect(LAMP_FLICKER_FRAME_MS).toBe(220);
    expect(LAMP_FLICKER_CYCLE_MS).toBe(1100);
    expect(LAMP_FLICKER_PATTERN.filter((frame) => frame === 0).length).toBeGreaterThanOrEqual(3);

    const [core, lift, dip] = lampFlickerFrames;
    if (!core || !lift || !dip) throw new Error("lamp frames missing");
    const coreLift = delta(core, lift);
    const coreDip = delta(core, dip);
    expect(coreLift).toBeGreaterThanOrEqual(3);
    expect(coreLift).toBeLessThanOrEqual(16);
    expect(coreDip).toBeGreaterThanOrEqual(3);
    expect(coreDip).toBeLessThanOrEqual(16);
    expect(delta(lift, dip)).toBeGreaterThan(coreLift);

    for (const frame of lampFlickerFrames) {
      expect(frame).toHaveLength(core.length);
      for (let y = 0; y < core.length; y += 1) {
        const base = core[y] ?? "";
        const next = frame[y] ?? "";
        expect(next).toHaveLength(base.length);
        for (let x = 0; x < base.length; x += 1) {
          const from = base[x] ?? "";
          const to = next[x] ?? "";
          if (from === to) continue;
          expect(STRUCTURE.has(from) || STRUCTURE.has(to)).toBe(false);
          expect("ef.".includes(from)).toBe(true);
          expect("ef.".includes(to)).toBe(true);
        }
      }
    }

    const coreLuma = grayscaleGrid(core);
    expect(coreLuma).not.toEqual(grayscaleGrid(lift));
    expect(coreLuma).not.toEqual(grayscaleGrid(dip));
    expect(grayscaleGrid(["f"])[0]?.[0]).toBeGreaterThan((grayscaleGrid(["e"])[0]?.[0] ?? 0) + 40);
  });

  it("holds the lit frame when motion is reduced and otherwise dwells between two flicks", () => {
    expect(lampFlickerIndex(0, true)).toBe(0);
    expect(lampFlickerIndex(4, true)).toBe(0);
    expect(lampFlickerSlot(440, true)).toBe(0);
    expect([0, 1, 2, 3, 4].map((tick) => lampFlickerIndex(tick, false))).toEqual([0, 0, 1, 0, 2]);
    expect(lampFlickerIndex(5, false)).toBe(0);
    expect(lampFlickerIndex(-1, false)).toBe(2);
    expect(lampFlickerSlot(0, false)).toBe(0);
    expect(lampFlickerSlot(439, false)).toBe(0);
    expect(lampFlickerSlot(440, false)).toBe(1);
    expect(lampFlickerSlot(880, false)).toBe(2);
  });
});
