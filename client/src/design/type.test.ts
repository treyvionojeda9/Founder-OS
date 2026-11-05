import { describe, expect, it } from "vitest";
import { founderEmber } from "./palette";
import { TYPE_CELL, statusChip, typeLine, typeScale } from "./type";

describe("type scale", () => {
  it("keeps four whole-pixel steps, each an integer scale of the bitmap cell", () => {
    const steps = [typeScale.meta, typeScale.body, typeScale.title, typeScale.display];
    expect(new Set(steps).size).toBe(4);
    expect(typeScale.meta).toBeLessThan(typeScale.body);
    expect(typeScale.body).toBeLessThan(typeScale.title);
    expect(typeScale.title).toBeLessThan(typeScale.display);
    for (const step of steps) {
      expect(Number.isInteger(step)).toBe(true);
      expect(step % TYPE_CELL).toBe(0);
    }
    for (const leading of Object.values(typeLine)) {
      expect(Number.isInteger(leading)).toBe(true);
      expect(leading % TYPE_CELL).toBe(0);
    }
  });

  it("locks status chips to Founder Ember and keeps Failed off black and white", () => {
    const allowed = new Set<string>(Object.values(founderEmber));
    for (const chip of Object.values(statusChip)) {
      expect(allowed.has(chip.background)).toBe(true);
      expect(allowed.has(chip.color)).toBe(true);
      expect(allowed.has(chip.border)).toBe(true);
      expect(chip.background).not.toBe("#FFFFFF");
      expect(chip.background).not.toBe("#000000");
      expect(chip.color).not.toBe("#FFFFFF");
      expect(chip.color).not.toBe("#000000");
    }
    expect(statusChip.working.background).toBe(founderEmber.ember);
    expect(statusChip.working.color).toBe(founderEmber.night);
    expect(statusChip.idle.background).toBe(founderEmber.slate);
    expect(statusChip.failed.background).toBe(founderEmber.plum);
    expect(statusChip.failed.color).toBe(founderEmber.paper);
  });
});
