import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { founderEmber } from "../design/palette";
import { FRAME_STATES, frameSpec } from "../design/statusFrame";
import { grayscaleGrid } from "../design/spriteGrid";
import { statusFrameAgents } from "../fixtures/statusFrame";
import { localDb, noteRepo } from "../storage/services";
import { teamById, type AgentStatus } from "../team/chatStore";
import { DeskGrid } from "./DeskGrid";
import viewSource from "./PipelineRooms.tsx?raw";
import {
  deskInStage,
  doubleGapReadable,
  outlineSignature,
  pipelineFor,
  roomOutline,
  stageControlName,
  stageForStatus,
  toggleStage,
  tokenBodyByMark,
  tokenPlaceFrames,
} from "./pipelineRooms";
import logicSource from "./pipelineRooms.ts?raw";
import gridSource from "./DeskGrid.tsx?raw";

const ember = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);
const statuses: AgentStatus[] = ["idle", "working", "waiting", "done", "failed"];

afterEach(() => {
  vi.restoreAllMocks();
});

const agents = [
  { id: "ceo", name: "CEO", status: "working" },
  { id: "atelier", name: "Atelier", status: "idle" },
  { id: "courier", name: "Courier", status: "failed" },
] as const;

function renderFloor(still = true) {
  const opened: string[] = [];
  render(
    <DeskGrid
      teamId="hale-design-lab"
      agents={agents}
      still={still}
      expandingId={null}
      onOpen={(id) => opened.push(id)}
    />,
  );
  return opened;
}

describe("pipeline rooms", () => {
  it("maps each StatusFrame onto a stage and keeps error on the crack glyph", () => {
    expect(statuses.map((status) => stageForStatus(status))).toEqual([
      "intake",
      "working",
      "waiting",
      "done",
      "waiting",
    ]);
    expect(PIPELINE_PATTERNS()).toEqual([
      frameSpec("idle").pattern,
      frameSpec("working").pattern,
      frameSpec("waiting").pattern,
      frameSpec("done").pattern,
    ]);
    expect(FRAME_STATES).toEqual(["idle", "working", "waiting", "done", "error"]);

    const hale = pipelineFor(teamById("hale-design-lab")!.agents);
    expect(hale.map((stage) => [stage.id, stage.tokens.map((token) => token.agentId)])).toEqual([
      ["intake", ["atelier"]],
      ["working", ["ceo"]],
      ["waiting", ["courier"]],
      ["done", []],
    ]);
    expect(hale[2]?.tokens[0]).toMatchObject({ status: "failed", pattern: "crack", glyph: "crack", mark: "collar" });
    expect(hale[1]?.tokens[0]?.mark).toBe("hair");
    expect(hale[0]?.tokens[0]?.mark).toBe("hood");

    const demo = pipelineFor(statusFrameAgents);
    const waiting = demo.find((stage) => stage.id === "waiting");
    expect(waiting?.tokens.map((token) => token.agentId)).toEqual(["porter", "shard"]);
    expect(waiting?.tokens.map((token) => token.pattern)).toEqual(["double", "crack"]);
    expect(waiting?.tokens.map((token) => token.glyph)).toEqual(["hand", "crack"]);
    expect(demo.find((stage) => stage.id === "done")?.tokens.map((token) => token.glyph)).toEqual(["check"]);
  });

  it("keeps room outlines and token caps distinct in grayscale, in Founder Ember", () => {
    const patterns = ["solid", "dash", "double", "corners", "crack"] as const;
    const signatures = patterns.map((pattern) => outlineSignature(pattern));
    expect(new Set(signatures).size).toBe(patterns.length);
    expect(doubleGapReadable("double")).toBe(true);
    expect(doubleGapReadable("solid")).toBe(false);
    expect(doubleGapReadable("dash")).toBe(false);
    expect(doubleGapReadable("corners")).toBe(false);
    expect(doubleGapReadable("crack")).toBe(false);

    const bodies = (["hair", "hood", "collar"] as const).map((mark) => grayscaleGrid(tokenBodyByMark[mark]));
    expect(bodies[0]).not.toEqual(bodies[1]);
    expect(bodies[0]).not.toEqual(bodies[2]);
    expect(bodies[1]).not.toEqual(bodies[2]);

    for (const pattern of patterns) {
      for (const row of roomOutline(pattern)) {
        for (const ch of row) expect(ember.has(ch)).toBe(true);
      }
    }
    for (const grid of Object.values(tokenBodyByMark)) {
      for (const row of grid) {
        for (const ch of row) expect(ember.has(ch)).toBe(true);
      }
    }
    for (const hex of Object.values(founderEmber)) expect(hex.startsWith("#")).toBe(true);
    expect(stageControlName("Intake", 1)).toBe("Intake, 1 agent");
    expect(stageControlName("Done", 0)).toBe("Done, 0 agents");
    expect(toggleStage(null, "working")).toBe("working");
    expect(toggleStage("working", "working")).toBeNull();
    expect(toggleStage("working", "done")).toBe("done");
    expect(deskInStage("failed", null)).toBe(true);
    expect(deskInStage("failed", "waiting")).toBe(true);
    expect(deskInStage("failed", "intake")).toBe(false);
    expect(tokenPlaceFrames(true)).toBe(1);
    expect(tokenPlaceFrames(false)).toBe(2);
  });

  it("places tokens from status and filters desks without opening a sheet or writing a vault", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    const opened = renderFloor(true);

    const rooms = document.querySelector(".desk-room .pipeline-rooms");
    expect(document.querySelector(".desk-room > .desk-hall .pipeline-rooms")).toBeNull();
    expect(rooms?.parentElement).toBe(document.querySelector(".desk-room"));
    expect(rooms).toHaveAttribute("data-lighting", "ember");
    expect(rooms).toHaveAttribute("data-reach", "local");
    expect(rooms).toHaveAttribute("data-still", "true");
    expect(rooms).toHaveAttribute("data-frames", "1");
    expect(rooms).toHaveAttribute("data-filter", "all");
    expect(screen.getAllByRole("button", { name: /, \d+ agents?$/ })).toHaveLength(4);
    expect(document.querySelector(".pipeline-room[data-stage='intake'] .pipeline-token")).toHaveAttribute("data-agent", "atelier");
    expect(document.querySelector(".pipeline-room[data-stage='working'] .pipeline-token")).toHaveAttribute("data-status", "working");
    expect(document.querySelector(".pipeline-room[data-stage='working'] .pipeline-token")).toHaveAttribute("data-glyph", "flame");
    expect(document.querySelector(".pipeline-room[data-stage='working'] .pipeline-token")).toHaveAttribute("data-frames", "1");
    expect(document.querySelector(".pipeline-room[data-stage='waiting']")).toHaveAttribute("data-pattern", "double");
    expect(document.querySelector(".pipeline-room[data-stage='waiting'] .pipeline-token")).toHaveAttribute("data-pattern", "crack");
    expect(document.querySelector(".pipeline-room[data-stage='done']")).toHaveAttribute("data-count", "0");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-pipeline", "all");

    await user.click(screen.getByRole("button", { name: "Working, 1 agent" }));
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-pipeline", "working");
    expect(document.querySelector(".pipeline-rooms")).toHaveAttribute("data-filter", "working");
    expect(screen.getByRole("button", { name: "Working, 1 agent" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Intake, 1 agent" })).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector("li[data-agent='ceo']")).toHaveAttribute("data-stage-match", "true");
    expect(document.querySelector("li[data-agent='atelier']")).toHaveAttribute("data-stage-match", "false");
    expect(document.querySelector("li[data-agent='courier']")).toHaveAttribute("data-stage-match", "false");
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-status", "working");
    expect(opened).toEqual([]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Pause CEO" }));
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-paused", "true");
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-status", "working");

    await user.click(screen.getByRole("button", { name: "Waiting, 1 agent" }));
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-pipeline", "waiting");
    expect(document.querySelector("li[data-agent='courier']")).toHaveAttribute("data-stage-match", "true");
    expect(document.querySelector("li[data-agent='ceo']")).toHaveAttribute("data-stage-match", "false");

    await user.click(screen.getByRole("button", { name: "Waiting, 1 agent" }));
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-pipeline", "all");
    expect(document.querySelector("li[data-agent='atelier']")).toHaveAttribute("data-stage-match", "true");

    const intake = screen.getByRole("button", { name: "Intake, 1 agent" });
    intake.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Working, 1 agent" })).toHaveFocus();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
    expect(opened).toEqual([]);
  });

  it("uses two place frames only while motion is allowed", () => {
    const { unmount } = render(
      <DeskGrid teamId="hale-design-lab" agents={agents} still={false} expandingId={null} onOpen={() => {}} />,
    );
    expect(document.querySelector(".pipeline-rooms")).toHaveAttribute("data-frames", "2");
    expect(document.querySelector(".pipeline-rooms")).toHaveAttribute("data-still", "false");
    const working = document.querySelector(".pipeline-room[data-stage='working'] .pipeline-token");
    expect(working).toHaveAttribute("data-frames", "2");
    expect(working?.querySelectorAll(".glyph-frame")).toHaveLength(2);
    expect(document.querySelector(".pipeline-room[data-stage='intake'] .pipeline-token")).toHaveAttribute("data-frames", "1");
    unmount();

    renderFloor(true);
    expect(document.querySelector(".pipeline-room[data-stage='working'] .pipeline-token")?.querySelectorAll(".glyph-frame")).toHaveLength(1);
  });

  it("keeps four empty rooms on a vacant floor", () => {
    render(<DeskGrid teamId="quiet-bench" agents={[]} still expandingId={null} onOpen={() => {}} onSeat={() => {}} />);
    expect(screen.getByRole("button", { name: "Seat an agent" })).toBeInTheDocument();
    expect(document.querySelectorAll(".pipeline-room")).toHaveLength(4);
    expect(document.querySelectorAll(".pipeline-token")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Done, 0 agents" })).toHaveAttribute("data-count", "0");
  });

  it("has no vault write and does not approve", () => {
    const forbidden = /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|noteRepo|indexedDB|fetch\(|Approve/;
    expect(logicSource).not.toMatch(forbidden);
    expect(viewSource).not.toMatch(forbidden);
    expect(gridSource).not.toMatch(forbidden);
  });
});

function PIPELINE_PATTERNS() {
  return pipelineFor([]).map((stage) => stage.pattern);
}
