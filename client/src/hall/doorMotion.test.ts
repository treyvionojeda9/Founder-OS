import { describe, expect, it } from "vitest";
import { DOLLY_MS, ENTER_MS, REVEAL_MS, SEQUENCE_MS, doorOpenSchedule, doorPath } from "./doorMotion";

describe("door open schedule", () => {
  it("swings the leaf, dollies the doorway, then lets the route change", () => {
    const steps = doorOpenSchedule(false);
    expect(steps.map((step) => step.phase)).toEqual(["swing", "dolly", "enter"]);
    expect(steps[0].at).toBe(0);
    expect(steps[1].at).toBe(DOLLY_MS);
    expect(steps[2].at).toBe(ENTER_MS);
    expect(ENTER_MS).toBeGreaterThan(DOLLY_MS);
    expect(SEQUENCE_MS).toBe(ENTER_MS + REVEAL_MS);
    expect(SEQUENCE_MS).toBeGreaterThanOrEqual(700);
    expect(SEQUENCE_MS).toBeLessThanOrEqual(900);
    const enter = steps.findIndex((step) => step.phase === "enter");
    expect(enter).toBe(steps.length - 1);
  });

  it("skips the animation when motion is reduced", () => {
    expect(doorOpenSchedule(true)).toEqual([{ at: 0, phase: "enter" }]);
  });

  it("sends work doors to a team page and school doors to a curriculum page", () => {
    expect(doorPath({ id: "hale-design-lab", section: "work" })).toBe("/team/hale-design-lab");
    expect(doorPath({ id: "reading-room", section: "school" })).toBe("/learn/reading-room");
  });
});