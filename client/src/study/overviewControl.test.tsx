import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TeamRoom } from "../routes/TeamRoom";
import { localDb, noteRepo } from "../storage/services";
import { SessionProvider } from "../storage/session";
import roomSource from "../routes/TeamRoom.tsx?raw";
import sheetSource from "./OverviewSheet.tsx?raw";
import pauseSource from "./deskPause.ts?raw";

function renderOverview() {
  render(
    <SessionProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TeamRoom teamId="hale-design-lab" />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("overview control plane", () => {
  it("pauses a desk in the fixture and does not approve or write either vault", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));

    await user.click(screen.getByRole("switch", { name: "Pause CEO" }));
    const desk = document.querySelector(".agent-desk[data-agent='ceo']");
    expect(desk).toHaveAttribute("data-paused", "true");
    expect(desk).toHaveAttribute("data-status", "working");
    expect(desk?.querySelector(".status-chip")).toHaveTextContent("Working");
    expect(desk?.querySelector(".desk-stamp-hold")).toHaveTextContent("Paused");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);

    await user.click(screen.getByRole("switch", { name: "Resume CEO" }));
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-work", "live");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("expands the paper over the overview and Escape sets it down", async () => {
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /Atelier/ }));

    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(document.querySelector(".overview-sheet")).toHaveAttribute("data-material", "plaster");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-sheet", "open");
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set it down" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".overview-sheet")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Atelier/ })).toHaveFocus();
  });

  it("sets the paper down without approving", async () => {
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /Courier/ }));
    await user.click(screen.getByRole("button", { name: "Set it down" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("keeps an approval Escape on the slip", async () => {
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    await user.click(screen.getByRole("button", { name: "File the swatch" }));
    expect(screen.getByRole("dialog", { name: "Approve this action?" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("status")).toHaveTextContent("Declined. Nothing ran.");
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(document.querySelector(".overview-sheet")).toBeInTheDocument();
  });

  it("has no vault write on the pause or sheet path", () => {
    const forbidden = /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|fetch\(|vault:\s*"human"/;
    expect(pauseSource).not.toMatch(forbidden);
    expect(sheetSource).not.toMatch(forbidden);
    expect(roomSource).not.toMatch(/saveHumanEdit|saveMachineOutput|humanNotes|machineNotes|fetch\(/);
  });
});
