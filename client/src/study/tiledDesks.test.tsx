import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TeamRoom } from "../routes/TeamRoom";
import { localDb, noteRepo } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { TILE_TAP_MS, tileCount } from "./deskTiles";

const originalMatchMedia = window.matchMedia;
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function desktopWindow() {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 900 });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes("pointer") && query.includes("fine"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function restoreWindow() {
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: originalWidth });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: originalHeight });
}

afterEach(() => {
  restoreWindow();
});

function renderOverview() {
  render(
    <SessionProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TeamRoom teamId="hale-design-lab" />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe("tiled desks", () => {
  it("lays the tablet out as a snap strip and keeps a single tap on the sheet", async () => {
    const user = userEvent.setup();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    const grid = document.querySelector(".desk-grid");
    expect(grid).toHaveAttribute("data-arrange", "strip");
    expect(grid).toHaveAttribute("data-focus", "none");
    expect(grid).not.toHaveAttribute("data-tiles");
    expect(document.querySelector(".desk-scroll")).toHaveAttribute("data-strip", "snap");
    expect(screen.queryByRole("radio", { name: "2 tiles" })).not.toBeInTheDocument();
    expect(document.querySelector(".agent-desk[data-agent='ceo'] .status-frame")).toHaveAttribute("data-state", "working");
    expect(document.querySelector(".agent-desk[data-agent='atelier'] .desk-stamp")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Pause CEO" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(grid).toHaveAttribute("data-focus", "none");
  });

  it("saves a desktop tile count, focuses on double-tap or Enter, and Escape restores", async () => {
    desktopWindow();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderOverview();
    await user.click(screen.getByRole("tab", { name: "Overview" }));

    const grid = document.querySelector(".desk-grid");
    expect(grid).toHaveAttribute("data-arrange", "tiles");
    expect(grid).toHaveAttribute("data-tiles", "3");
    expect(screen.getByRole("group", { name: "Desk tiles" })).toHaveAttribute("data-reach", "local");

    await user.click(screen.getByRole("radio", { name: "2 tiles" }));
    expect(grid).toHaveAttribute("data-tiles", "2");
    expect(tileCount()).toBe(2);
    await user.click(screen.getByRole("radio", { name: "4 tiles" }));
    expect(grid).toHaveAttribute("data-tiles", "4");

    const atelier = screen.getByRole("button", { name: /Atelier/ });
    await user.dblClick(atelier);
    expect(grid).toHaveAttribute("data-focus", "atelier");
    expect(document.querySelector(".desk-grid-list > li[data-agent='ceo']")).toHaveAttribute("data-focused", "false");
    expect(document.querySelector(".desk-grid-list > li[data-agent='atelier']")).toHaveAttribute("data-focused", "true");
    expect(screen.queryByRole("heading", { name: "Atelier chat" })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, TILE_TAP_MS + 50));
    expect(screen.queryByRole("heading", { name: "Atelier chat" })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(grid).toHaveAttribute("data-focus", "none");
    expect(atelier).toHaveFocus();

    atelier.focus();
    await user.keyboard("{Enter}");
    expect(grid).toHaveAttribute("data-focus", "atelier");
    expect(screen.queryByRole("heading", { name: "Atelier chat" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(grid).toHaveAttribute("data-focus", "none");

    await user.click(atelier);
    expect(await screen.findByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(grid).toHaveAttribute("data-sheet", "open");
    expect(screen.getByRole("button", { name: "Set it down" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "Atelier chat" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Pause CEO" }));
    expect(document.querySelector(".agent-desk[data-agent='ceo']")).toHaveAttribute("data-paused", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });
});
