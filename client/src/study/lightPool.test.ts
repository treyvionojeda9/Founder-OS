import { describe, expect, it } from "vitest";
import { poolSpec, washSpec } from "./lightPool";

describe("desk light pool", () => {
  it("uses a different shape for lamp on, off, and failed", () => {
    const on = poolSpec("working");
    const off = poolSpec("idle");
    const failed = poolSpec("failed");
    expect(on).not.toEqual(off);
    expect(on).not.toEqual(failed);
    expect(off).not.toEqual(failed);
    expect(on.cols).toBeGreaterThan(off.cols);
    expect(on.rows).toBeGreaterThan(off.rows);
    expect(washSpec("working").rows).toBeGreaterThan(washSpec("idle").rows);
    expect(washSpec("failed")).not.toEqual(washSpec("working"));
  });
});
