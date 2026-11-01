import { describe, expect, it } from "vitest";
import { founderEmber, schoolAccent } from "../design/palette";
import { learningPathFor } from "../fixtures/learning";
import mapSource from "./pathMap.ts?raw";
import viewSource from "./PathMap.tsx?raw";
import {
  focusGapReadable,
  hasSpur,
  highlightFrames,
  linkPalette,
  mapBounds,
  markPattern,
  myceliumRun,
  outlineSignature,
  pathMapFor,
  runIsOrthogonal,
  stationAnchor,
} from "./pathMap";

const allowed = new Set(
  [...Object.values(founderEmber), ...Object.values(schoolAccent)].map((hex) => hex.toLowerCase()),
);

describe("school path map", () => {
  it("builds a branched stub around the fixture task", () => {
    const reading = pathMapFor(learningPathFor("reading-room")!);
    expect(reading.title).toBe("Reading Room path");
    expect(reading.focusId).toBe("task-one-page");
    expect(reading.stations.map((station) => station.title)).toEqual([
      "Desk open",
      "Sit with one page",
      "Margin key",
      "A line aside",
    ]);
    expect(reading.stations.filter((station) => station.mark === "current")).toHaveLength(1);
    expect(reading.assignmentNote).toBeNull();
    expect(reading.links).toEqual([
      { from: "reading-room-open", to: "task-one-page" },
      { from: "task-one-page", to: "assign-margin" },
      { from: "task-one-page", to: "reading-room-aside" },
    ]);
    const ids = new Set(reading.stations.map((station) => station.id));
    for (const link of reading.links) {
      expect(ids.has(link.from)).toBe(true);
      expect(ids.has(link.to)).toBe(true);
    }

    const field = pathMapFor(learningPathFor("field-notes")!);
    expect(field.focusId).toBe("task-notice");
    expect(field.stations.map((station) => station.title)).toContain("Name one thing you noticed");
    expect(field.stations.some((station) => station.title === "Margin key")).toBe(false);
    expect(field.assignmentNote).toBe("No assignment on this desk.");
    expect(field.links.length).toBeGreaterThanOrEqual(3);
  });

  it("draws thin orthogonal links with a spur, in Founder Ember and the school accent", () => {
    const model = pathMapFor(learningPathFor("reading-room")!);
    const byId = new Map(model.stations.map((station) => [station.id, station]));
    for (const hex of linkPalette()) expect(allowed.has(hex.toLowerCase())).toBe(true);
    for (const link of model.links) {
      const run = myceliumRun(stationAnchor(byId.get(link.from)!), stationAnchor(byId.get(link.to)!));
      expect(runIsOrthogonal(run)).toBe(true);
      expect(hasSpur(run)).toBe(true);
      expect(run.length).toBeGreaterThan(2);
    }
    const bounds = mapBounds(model.stations);
    expect(bounds.width % 4).toBe(0);
    expect(bounds.height % 4).toBe(0);
  });

  it("keeps the focus ring readable after grayscale and distinct from the other marks", () => {
    expect(markPattern("current")).toBe("double");
    expect(markPattern("done")).toBe("corners");
    expect(markPattern("locked")).toBe("dotted");
    expect(focusGapReadable("current")).toBe(true);
    expect(focusGapReadable("done")).toBe(false);
    expect(focusGapReadable("locked")).toBe(false);
    const signatures = (["current", "done", "locked"] as const).map((mark) => outlineSignature(mark));
    expect(new Set(signatures).size).toBe(3);
  });

  it("holds the highlight to one frame when motion is reduced", () => {
    expect(highlightFrames(true)).toBe(1);
    expect(highlightFrames(false)).toBe(2);
  });

  it("has no vault write on the map", () => {
    const forbidden = /saveHumanEdit|saveMachineOutput|humanNotes|machineNotes|noteRepo|indexedDB|fetch\(/;
    expect(mapSource).not.toMatch(forbidden);
    expect(viewSource).not.toMatch(forbidden);
  });
});
