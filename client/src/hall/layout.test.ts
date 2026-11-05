import { describe, expect, it } from "vitest";
import { doors } from "../fixtures/doors";
import { doorPixelScale, doorPose, doorsForSearch } from "./layout";

describe("hall layout", () => {
  it("centers a single door with no turn and no depth", () => {
    expect(doorPose(0, 1)).toEqual({ yaw: 0, z: 0, drop: 0 });
  });

  it("keeps a pair frontal and side by side", () => {
    expect(doorPose(0, 2)).toEqual({ yaw: 0, z: 0, drop: 0 });
    expect(doorPose(1, 2)).toEqual({ yaw: 0, z: 0, drop: 0 });
  });

  it("turns outer doors toward center and sets them back", () => {
    const left = doorPose(0, 3);
    const mid = doorPose(1, 3);
    const right = doorPose(2, 3);
    expect(mid).toEqual({ yaw: 0, z: 0, drop: 0 });
    expect(left.z).toBeLessThan(0);
    expect(right.z).toBeLessThan(0);
    expect(left.yaw).toBeGreaterThan(0);
    expect(right.yaw).toBeLessThan(0);
    expect(left.yaw).toBe(-right.yaw);
    expect(left.drop).toBeGreaterThan(0);
    expect(right.drop).toBe(left.drop);
  });

  it("sizes one and two doors up, and keeps three portrait doors on the stage", () => {
    expect(doorPixelScale("portrait", 1)).toBe(10);
    expect(doorPixelScale("portrait", 2)).toBe(8);
    expect(doorPixelScale("portrait", 3)).toBe(7);
    expect(doorPixelScale("landscape", 3)).toBe(8);
    expect(doorPixelScale("desktop", 3)).toBe(8);
    expect(doorPixelScale("desktop", 1)).toBe(10);
  });

  it("previews one or two work doors from the count query", () => {
    expect(doorsForSearch(doors, "").map((door) => door.id)).toEqual(doors.map((door) => door.id));
    expect(doorsForSearch(doors, "?count=1").map((door) => door.id)).toEqual(["hale-design-lab"]);
    expect(doorsForSearch(doors, "count=2").map((door) => door.id)).toEqual([
      "hale-design-lab",
      "cloud-agent-team",
    ]);
  });
});
