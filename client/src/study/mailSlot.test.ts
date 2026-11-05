import { describe, expect, it } from "vitest";
import { founderEmber, paletteByChar } from "../design/palette";
import { grayscaleGrid } from "../design/spriteGrid";
import { mailHand, mailSeal } from "../design/sprites/mailMarks";
import { listTeams, type ChatLine, type TeamRecord } from "../team/chatStore";
import source from "./mailSlot.ts?raw";
import {
  collectMailItems,
  filterMailItems,
  mailItemsFor,
  mailMark,
  mailSlotName,
  mailSlotVisibleLabel,
  stepMailIndex,
} from "./mailSlot";

const ember = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);

describe("mail slot slips", () => {
  it("gathers two needs-you slips across Hale agents, plus waiting desks in the demo", () => {
    const hale = mailItemsFor("hale-design-lab");
    expect(hale.length).toBeGreaterThanOrEqual(2);
    expect(new Set(hale.map((item) => item.agentId)).size).toBeGreaterThanOrEqual(2);
    expect(hale.map((item) => item.label)).toEqual(["Publish the forge note", "File the swatch"]);
    expect(hale.every((item) => item.kind === "approval")).toBe(true);

    const waiting = listTeams().flatMap((team) => mailItemsFor(team.id).filter((item) => item.kind === "waiting"));
    const waitingAgents = new Set(waiting.map((item) => `${item.agentName}`));
    expect(waitingAgents.has("Relay")).toBe(true);
    expect(waitingAgents.has("CEO")).toBe(true);
    expect(mailItemsFor("cloud-agent-team").some((item) => item.kind === "approval" && item.agentId === "ceo")).toBe(
      true,
    );
    expect(mailItemsFor("local-agent-team").some((item) => item.label === "Write the bench handoff")).toBe(true);
  });

  it("filters by agent and leaves an empty wooden set for a quiet desk", () => {
    const hale = mailItemsFor("hale-design-lab");
    expect(filterMailItems(hale, "atelier").map((item) => item.label)).toEqual(["File the swatch"]);
    expect(filterMailItems(hale, "courier")).toEqual([]);
    expect(filterMailItems(hale, "all")).toHaveLength(hale.length);
    expect(mailItemsFor("hale-design-lab")).toBe(hale);
  });

  it("starts the slot name with the visible plaque and still announces the count", () => {
    expect(mailSlotVisibleLabel(2)).toBe("2 Needs you");
    expect(mailSlotName(2)).toBe("2 Needs you, mail slot, 2 need you");
    expect(mailSlotName(2).startsWith(mailSlotVisibleLabel(2))).toBe(true);
    expect(mailSlotName(1)).toBe("1 Needs you, mail slot, 1 needs you");
    expect(mailSlotName(0)).toBe("0 Needs you, mail slot, nothing needs you");
  });

  it("steps J down and K up and stops at the ends", () => {
    expect(stepMailIndex(0, 2, 1)).toBe(1);
    expect(stepMailIndex(1, 2, 1)).toBe(1);
    expect(stepMailIndex(1, 2, -1)).toBe(0);
    expect(stepMailIndex(0, 2, -1)).toBe(0);
    expect(stepMailIndex(3, 0, 1)).toBe(0);
  });

  it("keeps the hand and the seal different once the hue is gone", () => {
    expect(mailMark("waiting")).toEqual({ glyph: "hand", pattern: "double" });
    expect(mailMark("approval")).toEqual({ glyph: "seal", pattern: "corners" });
    for (const grid of [mailHand, mailSeal]) {
      for (const row of grid) {
        for (const ch of row) {
          expect(ember.has(ch)).toBe(true);
          expect(ch in paletteByChar).toBe(true);
        }
      }
    }
    expect(grayscaleGrid(mailHand)).not.toEqual(grayscaleGrid(mailSeal));
    const night = grayscaleGrid(["n"])[0][0];
    const paper = grayscaleGrid(["p"])[0][0];
    expect(paper).toBeGreaterThan(night + 40);
    expect(founderEmber.paper).toBe("#E9DFC7");
  });

  it("puts a waiting desk ahead of that agent's approval and does not write a vault", () => {
    const team: TeamRecord = {
      id: "fixture",
      name: "Fixture",
      tools: [],
      agents: [
        { id: "porter", name: "Porter", status: "waiting" },
        { id: "quire", name: "Quire", status: "idle" },
      ],
      transcript: [],
    };
    const lines: ChatLine[] = [
      {
        id: "fix-1",
        teamId: "fixture",
        author: "machine",
        record: "machine",
        agentId: "porter",
        body: "May I file this?",
        source: "Porter",
        timestamp: "2026-11-01T12:00:00Z",
        action: { id: "file-it", kind: "write", label: "File the note" },
      },
    ];
    expect(collectMailItems(team, lines).map((item) => item.kind)).toEqual(["waiting", "approval"]);
    expect(source).not.toMatch(/humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|fetch\(|vault:\s*"human"/);
  });
});
