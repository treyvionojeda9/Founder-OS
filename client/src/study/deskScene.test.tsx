import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { founderEmber } from "../design/palette";
import { grayscaleGrid } from "../design/spriteGrid";
import { deskLightPool, faceWashByMark, paperLightPool, seatedByMark, seatMarks } from "../design/sprites/seatedAgent";
import { statusChip } from "../design/type";
import type { TeamAgent } from "../team/chatStore";
import { formatDeskTime } from "./deskStamp";
import { DeskGrid } from "./DeskGrid";
import deskSource from "./DeskGrid.tsx?raw";
import pauseSource from "./deskPause.ts?raw";
import sheetSource from "./OverviewSheet.tsx?raw";
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
    render(<DeskGrid teamId="hale-design-lab" agents={agents} still expandingId={null} onOpen={(id) => opened.push(id)} />);

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

    const ceo = document.querySelector(".agent-desk[data-agent='ceo'] .desk-stamp");
    expect(ceo).toHaveAttribute("data-task", "Publish the forge note");
    expect(ceo?.querySelector(".desk-stamp-agent")).toHaveTextContent("CEO");
    expect(ceo?.querySelector(".desk-stamp-task")).toHaveTextContent("Publish the forge note");
    expect(ceo?.querySelector("time")).toHaveAttribute("dateTime", "2026-10-29T08:14:00Z");
    expect(ceo?.querySelector("time")).toHaveTextContent(formatDeskTime("2026-10-29T08:14:00Z"));
    const atelier = document.querySelector(".agent-desk[data-agent='atelier'] .desk-stamp");
    expect(atelier).toHaveAttribute("data-task", "idle");
    expect(atelier?.querySelector(".desk-stamp-task")).toHaveTextContent("idle");
    expect(atelier?.querySelector("time")).toHaveAttribute("dateTime", "2026-10-29T08:20:00Z");
    const courier = document.querySelector(".agent-desk[data-agent='courier'] .desk-stamp");
    expect(courier).toHaveAttribute("data-task", "The lamp is out");
    expect(courier?.querySelector("time")).toHaveAttribute("dateTime", "2026-10-29T08:22:00Z");
  });

  it("seats one figure per desk and pools lamp light only while working", () => {
    render(<DeskGrid teamId="hale-design-lab" agents={agents} still expandingId={null} onOpen={() => {}} />);

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

  it("raises a hand for waiting and keeps done dark and error fallen", () => {
    const row: readonly TeamAgent[] = [
      { id: "porter", name: "Porter", status: "waiting", title: "Hand up" },
      { id: "quire", name: "Quire", status: "done", title: "Sheet closed" },
      { id: "shard", name: "Shard", status: "failed", title: "Lamp fallen" },
    ];
    render(<DeskGrid teamId="status-frame" agents={row} still expandingId={null} onOpen={() => {}} />);

    expect(document.querySelector(".agent-desk[data-status='waiting'] .agent-seat")).toHaveAttribute("data-pose", "raised-hand");
    expect(document.querySelector(".agent-desk[data-status='waiting'] .raised-hand")).toBeTruthy();
    expect(document.querySelector(".agent-desk[data-status='done'] .agent-seat")).toHaveAttribute("data-pose", "seated");
    expect(document.querySelector(".agent-desk[data-status='done'] .raised-hand")).toBeNull();
    expect(document.querySelector(".agent-desk[data-status='failed'] .raised-hand")).toBeNull();
    expect(document.querySelector(".agent-desk[data-status='waiting'] [data-light-pool]")).toBeNull();
    expect(document.querySelector(".agent-desk[data-status='done'] [data-light-pool]")).toBeNull();
    expect(document.querySelector(".agent-desk[data-status='failed'] [aria-label='Desk lamp, failed']")).toBeTruthy();
    expect(document.querySelector(".agent-desk[data-status='waiting'] .status-frame")).toHaveAttribute("data-state", "waiting");
    expect(document.querySelector(".agent-desk[data-status='waiting'] .status-frame")).toHaveAttribute("data-glyph", "hand");
    expect(document.querySelector(".agent-desk[data-status='failed'] .status-frame")).toHaveAttribute("data-state", "error");
    expect(document.querySelector(".agent-desk[data-status='failed'] .status-frame")).toHaveAttribute("data-pattern", "crack");
    expect(document.querySelector(".agent-desk[data-status='done'] .status-frame")).toHaveAttribute("data-pattern", "corners");
    expect(screen.getByRole("button", { name: /Porter/ })).toHaveTextContent("Waiting for you");
    expect(screen.getByRole("button", { name: /Quire/ })).toHaveTextContent("Done");
    expect(screen.getByRole("button", { name: /Shard/ })).toHaveTextContent("Error");
  });

  it("has no human-vault write path on the desk scene", () => {
    const forbidden = /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|fetch\(|vault:\s*"human"/;
    expect(deskSource).not.toMatch(forbidden);
    expect(pauseSource).not.toMatch(forbidden);
    expect(sheetSource).not.toMatch(forbidden);
  });

  it("pulls the lamp chain without opening the desk or approving", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];
    render(<DeskGrid teamId="hale-design-lab" agents={agents} still expandingId={null} onOpen={(id) => opened.push(id)} />);
    const chain = screen.getByRole("switch", { name: "Pause CEO" });
    expect(chain).toHaveAttribute("data-pattern", "hanging");
    expect(chain).toHaveAttribute("aria-checked", "false");
    await user.click(chain);
    expect(opened).toEqual([]);
    expect(screen.getByRole("switch", { name: "Resume CEO" })).toHaveAttribute("data-pattern", "pulled");
    const desk = document.querySelector(".agent-desk[data-agent='ceo']");
    expect(desk).toHaveAttribute("data-status", "working");
    expect(desk).toHaveAttribute("data-paused", "true");
    expect(desk).toHaveAttribute("data-work", "halted");
    expect(desk?.querySelector(".status-frame")).toHaveAttribute("data-state", "working");
    expect(desk?.querySelector(".status-frame")).toHaveTextContent("Working");
    expect(desk?.querySelector("[data-light-pool]")).toBeNull();
    expect(desk?.querySelector(".lamp-flame")).toHaveAttribute("data-flicker", "still");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Resume CEO" }));
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-paused", "false");
    expect(document.querySelectorAll(".agent-desk[data-agent='ceo'] [data-light-pool]")).toHaveLength(3);
    expect(opened).toEqual([]);
  });
});
