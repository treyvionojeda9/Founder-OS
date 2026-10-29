import { describe, expect, it } from "vitest";
import { isValidStroke, WP_STROKE_EXAMPLE, type Stroke } from "./strokes";

function withPoints(points: Stroke["points"]): Stroke {
  return { ...WP_STROKE_EXAMPLE, points };
}

describe("isValidStroke", () => {
  it("accepts the white paper example with and without pressure", () => {
    expect(isValidStroke(WP_STROKE_EXAMPLE)).toBe(true);
    const { p: _pressure, ...point } = WP_STROKE_EXAMPLE.points[0];
    expect(isValidStroke(withPoints([point]))).toBe(true);
  });

  it("rejects NaN coordinates, decreasing timestamps, and pressure above 1", () => {
    expect(isValidStroke(withPoints([{ x: Number.NaN, y: 41, t_ms: 0, p: 0.5 }]))).toBe(false);
    expect(
      isValidStroke(
        withPoints([
          { x: 1, y: 1, t_ms: 10 },
          { x: 2, y: 2, t_ms: 9 },
        ]),
      ),
    ).toBe(false);
    expect(isValidStroke(withPoints([{ x: 1, y: 1, t_ms: 0, p: 1.2 }]))).toBe(false);
  });
});
