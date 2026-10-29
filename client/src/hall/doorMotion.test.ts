import { describe, expect, it } from "vitest";
import { AJAR_MS, ENTER_MS, doorOpenSchedule, doorPath } from "./doorMotion";

describe("door open schedule", () => {
  it("plays ajar, then the doorway comes forward, then the route may change", () => {
    const steps = doorOpenSchedule(false);
    expect(steps.map((step) => step.phase)).toEqual(["ajar", "through", "enter"]);
    expect(steps[0].at).toBe(0);
    expect(steps[1].at).toBe(AJAR_MS);
    expect(steps[2].at).toBe(ENTER_MS);
    expect(ENTER_MS).toBeGreaterThan(AJAR_MS);
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
