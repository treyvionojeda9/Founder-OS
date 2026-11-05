import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { lampArt } from "../study/lampArt";
import { localDb, noteRepo } from "../storage/services";
import { listTeams, resetChatForTests } from "../team/chatStore";
import { TeamRoom } from "./TeamRoom";

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

afterEach(async () => {
  cleanup();
  resetChatForTests();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  localDb.close();
  await localDb.delete();
});

function renderRoom(id = "hale-design-lab") {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TeamRoom teamId={id} />
    </MemoryRouter>,
  );
}

describe("CEO paper chat", () => {
  it("shows a source, a timestamp, and the unverified stamp on every machine line", () => {
    renderRoom();
    expect(screen.getByRole("heading", { name: "CEO chat" })).toBeInTheDocument();
    const machines = document.querySelectorAll(".machine-line");
    expect(machines.length).toBeGreaterThan(0);
    for (const line of machines) {
      expect(line.querySelector(".source")?.textContent).toBeTruthy();
      expect(line.querySelector("time")?.textContent).toBeTruthy();
      expect(line.textContent).toContain("generated · not verified");
    }
  });

  it("appends a founder line locally and does not write the human vault", async () => {
    const user = userEvent.setup();
    await localDb.open();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const humanPut = vi.spyOn(localDb.humanNotes, "put");
    renderRoom();

    await user.type(screen.getByRole("textbox", { name: "Message the CEO" }), "Hold the forge note.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Hold the forge note.")).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(humanPut).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
  });

  it("opens an approval dialog and does not execute the proposal", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderRoom();

    await user.click(screen.getByRole("button", { name: "Publish the forge note" }));
    expect(screen.getByRole("dialog", { name: "Approve this action?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
  });

  it("keeps Library and Team as stubs", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByText(/Library is a stub/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByText(/Team is a stub/)).toBeInTheDocument();
  });

  it("lifts the desk paper and sets it back down", async () => {
    const user = userEvent.setup();
    renderRoom();
    const slot = () => document.querySelector(".paper-slot");
    expect(slot()).toHaveAttribute("data-pose", "desk");
    expect(document.querySelector(".desk-top")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Forge note" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "CEO" })).toBeInTheDocument();

    await user.click(screen.getByRole("heading", { name: "CEO chat" }));
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.click(screen.getByRole("button", { name: "Set it down" }));
    expect(slot()).toHaveAttribute("data-pose", "desk");

    screen.getByRole("tabpanel").focus();
    await user.keyboard("{Enter}");
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(slot()).toHaveAttribute("data-pose", "desk");

    screen.getByRole("tabpanel").focus();
    await user.keyboard(" ");
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(slot()).toHaveAttribute("data-pose", "desk");

    await user.click(screen.getByRole("textbox", { name: "Message the CEO" }));
    expect(slot()).toHaveAttribute("data-pose", "lifted");
  });
});

describe("team overview desks", () => {
  it("shows a named desk and a lamp for every agent", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    for (const team of listTeams()) {
      cleanup();
      renderRoom(team.id);
      await user.click(screen.getByRole("tab", { name: "Overview" }));
      expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", String(team.agents.length));
      expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
      expect(screen.queryByText(/Overview is a placeholder/)).not.toBeInTheDocument();
      for (const agent of team.agents) {
        const lamp = lampArt(agent.status);
        const desk = screen.getByRole("button", { name: new RegExp(`${agent.name}.*${lamp.caption}`) });
        expect(desk).toHaveAttribute("data-status", agent.status);
        expect(desk.querySelector(`[aria-label="${lamp.title}"]`)).toBeTruthy();
      }
    }
  });

  it("opens an agent paper chat and Back returns to the desks", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await localDb.open();
    renderRoom();

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(screen.getByText(/swatch sheet is waiting/)).toBeInTheDocument();
    expect(screen.getByText("generated · not verified")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, dark" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Message Atelier" }), "Pin the swatch.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Pin the swatch.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "File the swatch" }));
    expect(screen.getByRole("dialog", { name: "Approve this action?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");

    await user.click(screen.getByRole("tab", { name: "CEO" }));
    expect(screen.getByRole("heading", { name: "CEO chat" })).toBeInTheDocument();
    expect(screen.queryByText("Pin the swatch.")).not.toBeInTheDocument();
  });

  it("swaps a desk into chat in one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-still", "true");
    await user.click(screen.getByRole("button", { name: /Courier/ }));
    expect(screen.getByRole("heading", { name: "Courier chat" })).toBeInTheDocument();
    expect(screen.getByText(/lamp is out/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, failed" })).toBeInTheDocument();
    expect(document.querySelector(".agent-desk")).not.toBeInTheDocument();
  });
});
