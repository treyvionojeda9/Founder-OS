import { describe, expect, it } from "vitest";
import { containOpening, resolveFrameOrigin } from "./doorFrame";

describe("leftmost door frame", () => {
  it("does not trust a collapsed layout x when the painted box is on screen", () => {
    const origin = resolveFrameOrigin({ x: 0, y: 240 }, { left: 186, top: 228 });
    expect(origin.x).toBe(186);
    expect(origin.y).toBe(240);
  });

  it("keeps a measured layout origin so yaw does not slide the other doors", () => {
    const origin = resolveFrameOrigin({ x: 742, y: 217 }, { left: 760, top: 230 });
    expect(origin).toEqual({ x: 742, y: 217 });
  });

  it("falls back to the painted box when both layout axes are at the origin", () => {
    const origin = resolveFrameOrigin({ x: 0, y: 0 }, { left: 12, top: 40 });
    expect(origin).toEqual({ x: 12, y: 40 });
  });

  it("pulls an opening that would clip at x≈0 back inside the viewport", () => {
    const contained = containOpening(20, 400, 176, 320, 1440, 900);
    expect(contained.x).toBe(88);
    expect(contained.y).toBe(400);
    expect(contained.x - 176 / 2).toBeGreaterThanOrEqual(0);
    expect(contained.x + 176 / 2).toBeLessThanOrEqual(1440);
  });

  it("leaves a centered door where it was measured", () => {
    expect(containOpening(542, 409, 176, 320, 1440, 900)).toEqual({ x: 542, y: 409 });
  });
});
