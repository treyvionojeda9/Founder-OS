import { describe, expect, it } from "vitest";
import {
  DEFAULT_INK_PRESSURE,
  isValidRawInkPoints,
  isValidStroke,
  normalizeInkPoint,
  WP_STROKE_EXAMPLE,
  type Stroke,
} from "./strokes";

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

describe("raw ink points", () => {
  it("defaults missing, zero, and out-of-range pressure to 0.5", () => {
    expect(normalizeInkPoint(0.2, 0.4, 0)).toEqual({ x: 0.2, y: 0.4, t_ms: 0, p: DEFAULT_INK_PRESSURE });
    expect(normalizeInkPoint(0.2, 0.4, 12, 0)?.p).toBe(0.5);
    expect(normalizeInkPoint(0.2, 0.4, 12, Number.NaN)?.p).toBe(0.5);
    expect(normalizeInkPoint(0.2, 0.4, 12, 1.4)?.p).toBe(0.5);
  });

  it("keeps stylus pressure and clamps the point onto the sheet", () => {
    expect(normalizeInkPoint(-0.2, 1.4, 8.2, 0.35)).toEqual({ x: 0, y: 1, t_ms: 8, p: 0.35 });
  });

  it("rejects a point that is not on a clock", () => {
    expect(normalizeInkPoint(Number.NaN, 0.2, 0, 0.5)).toBeNull();
    expect(normalizeInkPoint(0.2, 0.2, -1, 0.5)).toBeNull();
  });

  it("accepts ordered samples and rejects pressure of zero or time that runs backward", () => {
    expect(
      isValidRawInkPoints([
        { x: 0.1, y: 0.2, t_ms: 0, p: 0.5 },
        { x: 0.4, y: 0.6, t_ms: 16, p: 0.8 },
      ]),
    ).toBe(true);
    expect(isValidRawInkPoints([{ x: 0.1, y: 0.2, t_ms: 0, p: 0 }])).toBe(false);
    expect(
      isValidRawInkPoints([
        { x: 0.1, y: 0.2, t_ms: 10, p: 0.5 },
        { x: 0.4, y: 0.6, t_ms: 9, p: 0.5 },
      ]),
    ).toBe(false);
  });
});
