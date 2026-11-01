import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TeamRoom } from "../routes/TeamRoom";
import { localDb, noteRepo } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { resetChatForTests, teamById } from "../team/chatStore";
import traySource from "./MailTray.tsx?raw";
import { MailTray } from "./MailTray";

const originalMatchMedia = window.matchMedia.bind(window);

function preferStillFrames() {
  window.matchMedia = (query: string) =>
    ({
      matches: /prefers-reduced-motion:\s*reduce/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function renderOverview(teamId = "hale-design-lab") {
  render(
    <SessionProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TeamRoom teamId={teamId} />
      </MemoryRouter>
    </SessionProvider>,
  );
}

afterEach(async () => {
  cleanup();
  resetChatForTests();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  localDb.close();
  await localDb.delete();
});

describe("mail slot tray", () => {
  it("filters slips, moves with J and K, and Escape returns to the slot", async () => {
    const user = userEvent.setup();
    const hale = teamById("hale-design-lab");
    if (!hale) throw new Error("missing hale");
    render(<MailTray teamId="hale-design-lab" agents={hale.agents} still onOpen={() => {}} />);

    const slot = screen.getByRole("button", { name: "2 Needs you, mail slot" });
    expect(slot).toHaveTextContent("2 Needs you");
    await user.click(slot);
    const list = screen.getByRole("listbox", { name: "Needs you" });
    expect(list).toHaveFocus();
    let options = within(list).getAllByRole("option");
    expect(options.map((option) => option.getAttribute("data-agent"))).toEqual(["ceo", "atelier"]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("data-glyph", "seal");
    expect(options[0]).toHaveAttribute("data-pattern", "corners");
    expect(options[1]).toHaveAttribute("aria-selected", "false");

    await user.keyboard("j");
    options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveTextContent("File the swatch");
    await user.keyboard("k");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    const filters = screen.getByRole("toolbar", { name: "Filter by agent" });
    await user.click(within(filters).getByRole("button", { name: "Atelier" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("File the swatch");

    await user.click(within(filters).getByRole("button", { name: "Courier" }));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("The tray is empty.")).toBeInTheDocument();
    expect(document.querySelector(".mail-tray")).toHaveAttribute("data-material", "desk");
    expect(document.querySelector(".mail-tray")).toHaveAttribute("data-empty", "true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 Needs you, mail slot" })).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens in one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    const slot = document.querySelector(".mail-slot");
    expect(slot).toHaveAttribute("data-still", "true");
    expect(slot).toHaveAttribute("data-frames", "1");
    await user.click(screen.getByRole("button", { name: /\d+ Needs you, mail slot/ }));
    expect(document.querySelector(".mail-tray")).toHaveAttribute("data-frames", "1");
    expect(document.querySelector(".mail-slot")).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
    expect(document.querySelector(".lamp-chain[data-agent='ceo']")).toHaveAttribute("data-pattern", "hanging");
  });

  it("Enter opens the approval stamp and does not approve or write either vault", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "2 Needs you, mail slot" }));
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { name: "Approve this action?" });
    expect(dialog).toHaveAttribute("data-approval", "overlay");
    expect(dialog).toHaveTextContent("Publish the forge note");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved. Nothing ran.")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("Enter on a waiting desk expands that paper and does not approve", async () => {
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderOverview("cloud-agent-team");
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /\d+ Needs you, mail slot/ }));
    const filters = screen.getByRole("toolbar", { name: "Filter by agent" });
    await user.click(within(filters).getByRole("button", { name: "Relay" }));
    expect(screen.getByRole("option")).toHaveAttribute("data-glyph", "hand");
    expect(screen.getByRole("option")).toHaveAttribute("data-pattern", "double");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Relay chat" })).toBeInTheDocument();
    expect(document.querySelector(".overview-sheet")).toHaveAttribute("data-material", "plaster");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-sheet", "open");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved. Nothing ran.")).not.toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("has no vault write on the tray path", () => {
    expect(traySource).not.toMatch(
      /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|fetch\(|vault:\s*"human"|settle\(/,
    );
  });
});
