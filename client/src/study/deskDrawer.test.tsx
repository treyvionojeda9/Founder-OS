import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { founderEmber } from "../design/palette";
import { grayscaleGrid } from "../design/spriteGrid";
import { glyphFrames } from "../design/statusFrame";
import { localDb, noteRepo } from "../storage/services";
import { DeskDrawer } from "./DeskDrawer";
import { DeskGrid } from "./DeskGrid";
import drawerView from "./DeskDrawer.tsx?raw";
import {
  applyDrawerChoice,
  drawerFrames,
  papersFor,
  stepDrawer,
} from "./deskDrawer";
import drawerSource from "./deskDrawer.ts?raw";
import gridSource from "./DeskGrid.tsx?raw";

const agents = [
  { id: "ceo", name: "CEO", status: "working" as const },
  { id: "atelier", name: "Atelier", status: "idle" as const },
  { id: "courier", name: "Courier", status: "failed" as const },
];

afterEach(() => {
  vi.restoreAllMocks();
});

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

function pull(agentId: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(`.desk-drawer-pull[data-agent="${agentId}"]`);
  if (!node) throw new Error(`missing pull ${agentId}`);
  return node;
}

describe("desk drawer ledger", () => {
  it("keeps fixture papers local, one frame when still, and expands only when wired", () => {
    expect(papersFor("hale-design-lab", "ceo").map((paper) => [paper.title, paper.status])).toEqual([
      ["Publish the forge note", "working"],
      ["Read the hall door", "done"],
      ["Keep chat on the sheet", "idle"],
    ]);
    expect(papersFor("hale-design-lab", "atelier").map((paper) => paper.status)).toEqual(["waiting", "idle"]);
    expect(papersFor("hale-design-lab", "courier")[0]).toMatchObject({ title: "The lamp is out", status: "failed" });
    expect(papersFor("status-frame", "porter")).toEqual([
      { id: "desk-empty", title: "Nothing on this desk", status: "idle" },
    ]);
    expect(drawerFrames(true)).toBe(1);
    expect(drawerFrames(false)).toBe(2);
    expect(stepDrawer(-1, 3, 1)).toBe(0);
    expect(stepDrawer(-1, 3, -1)).toBe(2);
    expect(stepDrawer(2, 3, 1)).toBe(0);
    expect(stepDrawer(0, 3, -1)).toBe(2);
    expect(applyDrawerChoice({ expandWired: true, index: 1 })).toEqual({ cursor: 1, expand: true });
    expect(applyDrawerChoice({ expandWired: false, index: 1 })).toEqual({ cursor: 1, expand: false });

    const glyphs = (["working", "done", "idle"] as const).map((status) =>
      grayscaleGrid(glyphFrames(status, true)[0]!).flat().join(","),
    );
    expect(new Set(glyphs).size).toBe(3);
    const ember = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);
    for (const status of ["working", "done", "idle", "waiting", "failed"] as const) {
      for (const grid of glyphFrames(status, false)) {
        for (const row of grid) {
          for (const ch of row) expect(ember.has(ch)).toBe(true);
        }
      }
    }
    for (const hex of Object.values(founderEmber)) expect(hex.startsWith("#")).toBe(true);
    expect(drawerView).not.toMatch(/#[0-9a-fA-F]{3,8}|var\(--sky\)|var\(--navy\)/);
    expect(drawerSource).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("opens and closes on the pull, Escape, and an outside tap without expanding the sheet", async () => {
    const user = userEvent.setup();
    const opened = renderFloor(true);
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-drawer", "shut");
    expect(document.querySelectorAll(".desk-drawer-pull")).toHaveLength(3);
    expect(document.querySelector(".desk-drawer")).toBeNull();
    expect(pull("ceo")).toHaveAttribute("data-pattern", "shut");
    expect(pull("ceo")).toHaveAttribute("data-frames", "1");
    expect(pull("ceo")).toHaveAttribute("data-lighting", "ember");
    expect(pull("ceo")).toHaveAttribute("tabindex", "-1");

    pull("ceo").focus();
    await user.keyboard("{Enter}");
    const list = screen.getByRole("listbox", { name: "CEO work in progress" });
    expect(list).toHaveAttribute("data-reach", "local");
    expect(list).toHaveAttribute("data-frames", "1");
    expect(list).toHaveAttribute("data-count", "3");
    expect(list).toHaveAttribute("data-still", "true");
    expect(screen.getByRole("option", { name: /Publish the forge note/ })).toHaveAttribute("data-status", "working");
    expect(screen.getByRole("option", { name: /Read the hall door/ })).toHaveAttribute("data-status", "done");
    expect(screen.getByRole("option", { name: /Keep chat on the sheet/ })).toHaveAttribute("data-status", "idle");
    expect(list.querySelector("[data-status='working'] .status-frame")).toHaveAttribute("data-glyph", "flame");
    expect(list.querySelector("[data-status='working'] .status-frame")).toHaveAttribute("data-frames", "1");
    expect(list.querySelector("[data-status='done'] .status-frame")).toHaveAttribute("data-glyph", "check");
    expect(list.querySelector("[data-status='idle'] .status-frame")).toHaveAttribute("data-pattern", "solid");
    expect(list.querySelectorAll("[aria-selected='true']")).toHaveLength(0);
    expect(pull("ceo")).toHaveAttribute("data-pattern", "pulled");
    expect(opened).toEqual([]);

    await user.keyboard("{Escape}");
    expect(document.querySelector(".desk-drawer")).toBeNull();
    expect(pull("ceo")).toHaveAttribute("data-open", "false");
    expect(opened).toEqual([]);

    await user.click(pull("atelier"));
    expect(screen.getByRole("listbox", { name: "Atelier work in progress" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /File the swatch/ }).querySelector(".status-frame")).toHaveAttribute(
      "data-glyph",
      "hand",
    );
    await user.click(screen.getByRole("heading", { name: "Overview" }));
    expect(document.querySelector(".desk-drawer")).toBeNull();
    expect(opened).toEqual([]);

    await user.click(pull("ceo"));
    await user.click(pull("ceo"));
    expect(document.querySelector(".desk-drawer")).toBeNull();
    expect(screen.getByRole("button", { name: /Atelier/ })).toBe(document.querySelector(".agent-desk[data-agent='atelier']"));
  });

  it("highlights a row from the keys and expands the sheet only on a choice", async () => {
    const user = userEvent.setup();
    const opened = renderFloor(false);

    await user.click(pull("ceo"));
    const list = screen.getByRole("listbox", { name: "CEO work in progress" });
    expect(list).toHaveAttribute("data-frames", "2");
    expect(list.querySelector("[data-status='working'] .status-frame")).toHaveAttribute("data-frames", "2");
    expect(document.querySelector(".pipeline-rooms")).toBeTruthy();
    expect(document.querySelector(".mail-slot")).toBeTruthy();

    await user.keyboard("{ArrowDown}");
    const forge = screen.getByRole("option", { name: /Publish the forge note/ });
    expect(forge).toHaveAttribute("aria-selected", "true");
    expect(forge).toHaveAttribute("data-pattern", "mark");
    expect(opened).toEqual([]);

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Read the hall door/ })).toHaveAttribute("data-selected", "true");
    expect(forge).toHaveAttribute("data-selected", "false");
    expect(opened).toEqual([]);

    await user.keyboard("{Enter}");
    expect(opened).toEqual(["ceo"]);
    expect(screen.getByRole("option", { name: /Read the hall door/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("selecting a courier row highlights it and opens that desk when expand is wired", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    const opened = renderFloor(true);

    await user.click(pull("courier"));
    await user.click(screen.getByRole("option", { name: /The lamp is out/ }));
    expect(screen.getByRole("option", { name: /The lamp is out/ })).toHaveAttribute("data-pattern", "mark");
    expect(screen.getByRole("option", { name: /The lamp is out/ }).querySelector(".status-frame")).toHaveAttribute(
      "data-state",
      "error",
    );
    expect(opened).toEqual(["courier"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
    expect(screen.queryByText(/Approved/)).not.toBeInTheDocument();
  });

  it("only highlights when the sheet expand path is not wired", async () => {
    const user = userEvent.setup();
    const highlighted: number[] = [];
    const chosen: number[] = [];
    render(
      <ul>
        <li>
          <span className="agent-desk-front" />
          <span id="porter-name">Porter</span>
          <DeskDrawer
            teamId="status-frame"
            agentId="porter"
            agentName="Porter"
            describedBy="porter-name"
            open
            still
            cursor={-1}
            expandWired={false}
            onToggle={() => {}}
            onHighlight={(index) => highlighted.push(index)}
            onChoose={(index) => chosen.push(index)}
          />
        </li>
      </ul>,
    );
    await user.click(screen.getByRole("option", { name: /Nothing on this desk/ }));
    expect(highlighted.length).toBeGreaterThan(0);
    expect(highlighted.every((index) => index === 0)).toBe(true);
    expect(chosen).toEqual([]);
    expect(screen.getByRole("listbox", { name: "Porter work in progress" })).toHaveAttribute("data-count", "1");
  });

  it("leaves the desk click on the sheet and has no vault write", async () => {
    const user = userEvent.setup();
    const opened = renderFloor(true);
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(opened).toEqual(["atelier"]);
    expect(document.querySelector(".desk-drawer")).toBeNull();

    const forbidden =
      /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|noteRepo|indexedDB|fetch\(|Approve/;
    expect(drawerSource).not.toMatch(forbidden);
    expect(drawerView).not.toMatch(forbidden);
    expect(gridSource).not.toMatch(forbidden);
  });
});
