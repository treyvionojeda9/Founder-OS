import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { founderEmber } from "./palette";
import { grayscaleGrid } from "./spriteGrid";
import { glyphCheck, glyphCrack, glyphFlame, glyphFlameLift, glyphHand, glyphRest } from "./sprites/statusGlyphs";
import { raisedHand, seatedByMark, seatMarks } from "./sprites/seatedAgent";
import type { SpriteGrid } from "./sprites/types";
import { StatusFrame } from "./StatusFrame";
import frameSource from "./StatusFrame.tsx?raw";
import {
  FRAME_STATES,
  frameCatalog,
  frameSpec,
  frameState,
  glyphFrames,
  savedSheetStatus,
  statusLabel,
} from "./statusFrame";
import logicSource from "./statusFrame.ts?raw";
import { statusFrameAgents, statusFrameSpines } from "../fixtures/statusFrame";
import demoSource from "../routes/StatusFrameDemo.tsx?raw";
import spineSource from "../library/ShelfSpine.tsx?raw";
import { statusChip } from "./type";

const emberChars = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);

function paint(rows: SpriteGrid) {
  return grayscaleGrid(rows);
}

describe("shared status frame", () => {
  it("snapshots one outline and one glyph for each state", () => {
    expect(frameCatalog.map(({ state, status, pattern, outline, glyph, label }) => ({ state, status, pattern, outline, glyph, label }))).toEqual([
      { state: "idle", status: "idle", pattern: "solid", outline: "unbroken line", glyph: "rest", label: "Idle" },
      { state: "working", status: "working", pattern: "dash", outline: "broken runs", glyph: "flame", label: "Working" },
      {
        state: "waiting",
        status: "waiting",
        pattern: "double",
        outline: "two lines with a gap",
        glyph: "hand",
        label: "Waiting for you",
      },
      { state: "done", status: "done", pattern: "corners", outline: "marks only at the corners", glyph: "check", label: "Done" },
      {
        state: "error",
        status: "failed",
        pattern: "crack",
        outline: "dotted line, bottom edge missing",
        glyph: "crack",
        label: "Error",
      },
    ]);
    expect(FRAME_STATES).toEqual(["idle", "working", "waiting", "done", "error"]);
    expect(new Set(frameCatalog.map((spec) => spec.pattern)).size).toBe(5);
    expect(new Set(frameCatalog.map((spec) => spec.glyph)).size).toBe(5);
    expect(frameState("failed")).toBe("error");
    expect(statusLabel("failed")).toBe("Error");
    expect(savedSheetStatus()).toBe("done");
  });

  it("keeps every glyph a different shape after grayscale conversion", () => {
    const glyphs = [glyphRest, glyphFlame, glyphHand, glyphCheck, glyphCrack];
    for (const rows of [...glyphs, glyphFlameLift, raisedHand]) {
      for (const row of rows) {
        for (const ch of row) expect(emberChars.has(ch)).toBe(true);
      }
    }
    for (let i = 0; i < glyphs.length; i += 1) {
      for (let j = i + 1; j < glyphs.length; j += 1) {
        expect(paint(glyphs[i])).not.toEqual(paint(glyphs[j]));
      }
    }
    expect(paint(glyphFlame)).not.toEqual(paint(glyphFlameLift));
    expect(raisedHand).toHaveLength(seatedByMark.hair.length);
    expect(raisedHand[0]?.length).toBe(seatedByMark.hair[0]?.length);
    for (const mark of seatMarks) {
      expect(seatedByMark[mark].every((row) => row.startsWith("."))).toBe(true);
    }
    const hand = paint(glyphHand).flat().filter((luma) => luma >= 0);
    const paper = paint(["p"])[0][0];
    expect(hand.some((luma) => luma < paper - 40)).toBe(true);
  });

  it("uses one frame when motion is reduced and two only while working", () => {
    for (const spec of frameCatalog) {
      expect(glyphFrames(spec.status, true)).toHaveLength(1);
      expect(glyphFrames(spec.status, false)).toHaveLength(spec.state === "working" ? 2 : 1);
    }
    const { container: still } = render(<StatusFrame status="working" still />);
    expect(still.querySelector(".status-frame")).toHaveAttribute("data-frames", "1");
    expect(still.querySelector(".status-frame")).toHaveAttribute("data-still", "true");
    expect(still.querySelectorAll(".glyph-frame")).toHaveLength(1);

    const { container: moving } = render(<StatusFrame status="working" still={false} />);
    expect(moving.querySelector(".status-frame")).toHaveAttribute("data-frames", "2");
    expect(moving.querySelectorAll(".glyph-frame")).toHaveLength(2);

    for (const spec of frameCatalog) {
      const view = render(<StatusFrame status={spec.status} still />);
      const frame = view.container.querySelector(".status-frame");
      expect(frame).toHaveAttribute("data-state", spec.state);
      expect(frame).toHaveAttribute("data-pattern", spec.pattern);
      expect(frame).toHaveAttribute("data-glyph", spec.glyph);
      expect(frame).toHaveAttribute("data-frames", "1");
      expect(frame).toHaveTextContent(spec.label);
      const chip = statusChip[spec.status === "failed" ? "failed" : spec.status];
      expect(Object.values(founderEmber)).toContain(chip.background);
      expect(Object.values(founderEmber)).toContain(chip.color);
      view.unmount();
    }
  });

  it("shows all five states on the demo fixtures and never writes a vault", () => {
    expect(statusFrameAgents.map((agent) => frameState(agent.status))).toEqual(["idle", "working", "waiting", "done", "error"]);
    expect(statusFrameSpines.map((spine) => frameSpec(spine.status).state)).toEqual(["idle", "working", "waiting", "done", "error"]);
    expect(frameSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(/);
    expect(logicSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(/);
    expect(spineSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(/);
    expect(demoSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|saveMachineOutput|fetch\(/);
    expect(demoSource).not.toMatch(/Approve|action-chip/);
  });
});
