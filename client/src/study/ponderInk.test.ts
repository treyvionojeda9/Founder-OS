import { describe, expect, it } from "vitest";
import { founderEmber } from "../design/palette";
import { acceptsInkPointer, keepSample, PONDER_INK_COLOR, PONDER_INK_WIDTH, sealPonderInk } from "./ponderInk";

describe("ponder ink", () => {
  it("seals strokes in founder darkwood and drops a point off the sheet", () => {
    const ink = sealPonderInk([
      { points: [{ x: 0.1, y: 0.2, t_ms: 0, p: 0.5 }] },
      { points: [{ x: 2, y: 0.2, t_ms: 0, p: 0.5 }] },
    ]);
    expect(PONDER_INK_COLOR).toBe(founderEmber.darkwood);
    expect(ink).toEqual([
      {
        points: [{ x: 0.1, y: 0.2, t_ms: 0, p: 0.5 }],
        color: founderEmber.darkwood,
        width: PONDER_INK_WIDTH,
      },
    ]);
  });

  it("takes a pen, a finger, and a mouse, and ignores a palm or a right-click", () => {
    expect(acceptsInkPointer({ pointerType: "pen", button: 0, width: 2 })).toBe(true);
    expect(acceptsInkPointer({ pointerType: "touch", button: 0, width: 8 })).toBe(true);
    expect(acceptsInkPointer({ pointerType: "mouse", button: 0, width: 1 })).toBe(true);
    expect(acceptsInkPointer({ pointerType: "touch", button: 0, width: 48 })).toBe(false);
    expect(acceptsInkPointer({ pointerType: "mouse", button: 2, width: 1 })).toBe(false);
  });

  it("holds the clock when a sample arrives early", () => {
    const first = { x: 0.1, y: 0.1, t_ms: 20, p: 0.5 };
    expect(keepSample(first, { x: 0.5, y: 0.5, t_ms: 10, p: 0.9 })).toMatchObject({ t_ms: 20, p: 0.9 });
    expect(keepSample(first, { x: 0.1, y: 0.101, t_ms: 24, p: 0.5 })).toBeNull();
  });
});
