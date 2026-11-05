import { describe, expect, it } from "vitest";
import {
  DOLLY_MS,
  ENTER_MS,
  REVEAL_MS,
  SEQUENCE_MS,
  SHUT_MS,
  doorOpenSchedule,
  doorPath,
  prefersStillFrames,
  roomFromPath,
} from "./doorMotion";

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

  it("treats reduced motion and slow e-ink updates as a one-frame cut", () => {
    expect(prefersStillFrames(true, false)).toBe(true);
    expect(prefersStillFrames(false, true)).toBe(true);
    expect(prefersStillFrames(false, false)).toBe(false);
    expect(SHUT_MS).toBeGreaterThan(400);
    expect(SHUT_MS).toBeLessThan(ENTER_MS);
  });

  it("sends work doors to a team page and school doors to a curriculum page", () => {
    expect(doorPath({ id: "hale-design-lab", section: "work" })).toBe("/team/hale-design-lab");
    expect(doorPath({ id: "reading-room", section: "school" })).toBe("/learn/reading-room");
  });

  it("routes team and school paths through the same portal kinds", () => {
    expect(roomFromPath("/team/hale-design-lab")).toEqual({ kind: "team", id: "hale-design-lab" });
    expect(roomFromPath("/learn/reading-room")).toEqual({ kind: "learn", id: "reading-room" });
    expect(roomFromPath("/home")).toBeNull();
    expect(roomFromPath("/settings")).toBeNull();
  });
});