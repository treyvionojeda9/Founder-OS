import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { founderEmber } from "../design/palette";
import { grayscaleGrid } from "../design/spriteGrid";
import { deskLightPool, faceWashByMark, paperLightPool, seatedByMark, seatMarks } from "../design/sprites/seatedAgent";
import { statusChip } from "../design/type";
import type { TeamAgent } from "../team/chatStore";
import { DeskGrid } from "./DeskGrid";
import deskSource from "./DeskGrid.tsx?raw";
import { lampArt } from "./lampArt";

const agents: readonly TeamAgent[] = [
  { id: "ceo", name: "CEO", status: "working", title: "Founder" },
  { id: "atelier", name: "Atelier", status: "idle", title: "Swatch keeper" },
  { id: "courier", name: "Courier", status: "failed", title: "Errand runner" },
];

function luma(hex: string): number {
  return grayscaleGrid([hex === founderEmber.night ? "n" : "p"])[0][0];
}

describe("overview desk scene", () => {
  it("engraves a name plaque and parks the status token beside the lamp", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];
    render(<DeskGrid agents={agents} still expandingId={null} onOpen={(id) => opened.push(id)} />);

    const room = document.querySelector(".desk-room");
    expect(room).toHaveAttribute("data-scene", "row");
    expect(document.querySelector(".agent-desk-wall")).toHaveAttribute("data-material", "plaster");
    expect(document.querySelector(".agent-desk-wainscot")).toHaveAttribute("data-material", "wainscot");
    expect(document.querySelector(".agent-desk-floor")).toHaveAttribute("data-material", "floor");
    expect(document.querySelectorAll(".agent-desk-room")).toHaveLength(0);
    expect(document.querySelectorAll(".agent-desk-plate")).toHaveLength(0);

    for (const agent of agents) {
      const lamp = lampArt(agent.status);
      const desk = screen.getByRole("button", { name: new RegExp(`${agent.name}.*${lamp.caption}`) });
      expect(desk).toHaveAttribute("data-status", agent.status);
      const row = desk.querySelector(".agent-desk-lamp-row");
      const chip = row?.querySelector(".status-chip");
      expect(row?.querySelector(`[aria-label="${lamp.title}"]`)).toBeTruthy();
      expect(chip).toHaveTextContent(lamp.caption);
      expect(chip).toHaveAttribute("data-status", agent.status);
      const plaque = desk.querySelector(".agent-desk-plaque");
      expect(plaque).toHaveAttribute("data-plaque", "engraved");
      expect(plaque).not.toHaveAttribute("data-material");
      expect(plaque?.querySelector("input, textarea, select")).toBeNull();
      expect(plaque?.querySelector(".agent-desk-name")).toHaveTextContent(agent.name);
      const name = desk.querySelector(".agent-desk-name");
      expect(name).toBeTruthy();
      expect(chip).toBeTruthy();
      if (!name || !chip) return;
      expect(name.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(opened).toEqual(["atelier"]);
  });

  it("seats one figure per desk and pools lamp light only while working", () => {
    render(<DeskGrid agents={agents} still expandingId={null} onOpen={() => {}} />);

    const seats = document.querySelectorAll(".agent-seat");
    expect(seats).toHaveLength(agents.length);
    expect([...seats].map((seat) => seat.getAttribute("data-seat"))).toEqual(["hair", "hood", "collar"]);
    expect(document.querySelectorAll(".window-sill")).toHaveLength(agents.length);
    expect(document.querySelectorAll(".window-star").length).toBeGreaterThanOrEqual(agents.length * 2);
    expect(document.querySelectorAll(".floor-board").length).toBeGreaterThan(4);
    expect(document.querySelectorAll(".agent-desk-front")).toHaveLength(agents.length);
    expect(document.querySelectorAll(".agent-desk-leg")).toHaveLength(agents.length * 2);

    expect(document.querySelectorAll(".agent-desk[data-status='working'] [data-light-pool]")).toHaveLength(3);
    expect(document.querySelectorAll(".agent-desk[data-status='idle'] [data-light-pool]")).toHaveLength(0);
    expect(document.querySelectorAll(".agent-desk[data-status='failed'] [data-light-pool]")).toHaveLength(0);
    expect(document.querySelector(".agent-desk[data-status='failed'] [aria-label='Desk lamp, failed']")).toBeTruthy();

    const ember = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);
    for (const mark of seatMarks) {
      expect(seatedByMark[mark]).toHaveLength(faceWashByMark[mark].length);
      for (const grid of [seatedByMark[mark], faceWashByMark[mark]]) {
        for (const row of grid) {
          for (const ch of row) expect(ember.has(ch)).toBe(true);
        }
      }
    }
    for (const row of [...deskLightPool, ...paperLightPool]) {
      for (const ch of row) expect(ember.has(ch)).toBe(true);
    }
    const wood = grayscaleGrid(["w"])[0][0];
    const pool = grayscaleGrid(deskLightPool)
      .flat()
      .filter((luma) => luma >= 0);
    expect(Math.max(...pool)).toBeGreaterThan(wood + 40);
    expect(grayscaleGrid(seatedByMark.hair)).not.toEqual(grayscaleGrid(seatedByMark.hood));
    expect(grayscaleGrid(seatedByMark.hair)).not.toEqual(grayscaleGrid(seatedByMark.collar));
    expect(grayscaleGrid(seatedByMark.hood)).not.toEqual(grayscaleGrid(seatedByMark.collar));
  });

  it("keeps the overview floor and the status tokens inside Founder Ember", () => {
    const chipLuma = {
      working: grayscaleGrid(["e"])[0][0],
      idle: grayscaleGrid(["s"])[0][0],
      failed: grayscaleGrid(["m"])[0][0],
    };
    expect(statusChip.working.background).toBe(founderEmber.ember);
    expect(statusChip.idle.background).toBe(founderEmber.slate);
    expect(statusChip.failed.background).toBe(founderEmber.plum);
    expect(Math.abs(chipLuma.working - chipLuma.idle)).toBeGreaterThanOrEqual(40);
    expect(Math.abs(chipLuma.working - chipLuma.failed)).toBeGreaterThanOrEqual(40);
    expect(chipLuma.working).not.toBe(chipLuma.failed);
    expect(chipLuma.idle).not.toBe(chipLuma.failed);
    expect(luma(founderEmber.paper)).toBeGreaterThan(grayscaleGrid(["d"])[0][0] + 40);
  });

  it("has no human-vault write path on the desk scene", () => {
    expect(deskSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|fetch\(|vault:\s*"human"/);
  });
});
