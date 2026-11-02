import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { frameSpec } from "../design/statusFrame";
import { lampArt } from "../study/lampArt";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { getBoardPrefs } from "../team/boardPrefs";
import { listTeams, resetChatForTests, teamById } from "../team/chatStore";
import { TeamBoard } from "../team/TeamBoard";
import boardSource from "../team/TeamBoard.tsx?raw";
import { TeamRoom } from "./TeamRoom";
import roomSource from "./TeamRoom.tsx?raw";

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
  sessionSource.principal = "human";
  localDb.close();
  await localDb.delete();
});

function renderRoom(id = "hale-design-lab") {
  return render(
    <SessionProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TeamRoom teamId={id} />
      </MemoryRouter>
    </SessionProvider>,
  );
}

function renderRouted(id = "hale-design-lab") {
  return render(
    <SessionProvider>
      <MemoryRouter
        initialEntries={[`/team/${id}`]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/team/:id" element={<TeamRoom />} />
          <Route path="/home" element={<h1>Hall</h1>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
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
    const dialog = screen.getByRole("dialog", { name: "Approve this action?" });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(screen.getByRole("status")).toHaveAttribute("data-stamp", "approve");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("lays the approval stamp over the live room and does not run a decline", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderRoom();

    await user.click(screen.getByRole("button", { name: "Publish the forge note" }));
    const dialog = screen.getByRole("dialog", { name: "Approve this action?" });
    expect(dialog).toHaveAttribute("data-approval", "overlay");
    expect(document.querySelector("dialog")).toBeNull();
    expect(dialog.querySelector(".approval-seal")).not.toBeNull();
    expect(document.querySelector(".study-world")).not.toBeNull();
    expect(document.querySelector(".lamp-spot")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Desk lamp, lit" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "CEO" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Decline" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-stamp", "decline");
    expect(screen.getByRole("status")).toHaveTextContent("Declined. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
  });

  it("declines from Escape and does not treat a chat line as approval", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await localDb.open();
    renderRoom();

    await user.type(screen.getByRole("textbox", { name: "Message the CEO" }), "Approve the forge note");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Approve the forge note")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish the forge note" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Declined. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("keeps approval off the human vault in the room source", () => {
    expect(roomSource).not.toMatch(/saveHumanEdit|humanNotes|humanRevisions|fetch\(|showModal/);
  });

  it("opens the team board instead of a stub", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.queryByText(/Team is a stub/)).not.toBeInTheDocument();
    expect(document.querySelector(".team-board")).toHaveAttribute("data-count", "3");
    expect(document.querySelector(".team-board")).toHaveAttribute("data-still", "true");
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
    expect(slot()).toHaveAttribute("data-pose", "desk");
  });

  it("settles an inline approval on the desk without the overlay", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderRoom();
    const slot = () => document.querySelector(".paper-slot");
    expect(slot()).toHaveAttribute("data-pose", "desk");
    expect(document.querySelector("[data-approval='inline']")).toBeTruthy();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(slot()).toHaveAttribute("data-pose", "desk");
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
  });

  it("settles the sheet on lift and set, and cuts that motion when frames are still", async () => {
    const user = userEvent.setup();
    renderRoom();
    const slot = () => document.querySelector(".paper-slot");
    await user.click(screen.getByRole("heading", { name: "CEO chat" }));
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    expect(slot()).toHaveAttribute("data-settle", "lift");
    await waitFor(() => expect(slot()).not.toHaveAttribute("data-settle"));
    await user.click(screen.getByRole("button", { name: "Set it down" }));
    expect(slot()).toHaveAttribute("data-pose", "desk");
    expect(slot()).toHaveAttribute("data-settle", "set");

    cleanup();
    preferStillFrames();
    renderRoom();
    await user.click(screen.getByRole("heading", { name: "CEO chat" }));
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-still", "true");
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    expect(document.querySelector(".paper-slot")).not.toHaveAttribute("data-settle");
    const flame = document.querySelector(".lamp-spot .lamp-flame");
    expect(flame).toHaveAttribute("data-flicker", "still");
    expect(flame).toHaveAttribute("data-frame", "0");
    expect(flame?.querySelectorAll(".lamp-frame")).toHaveLength(1);
  });

  it("flickers the working lamp on three frames and leaves the idle lamp alone", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRoom();
    expect(document.querySelector(".lamp-spot .lamp-flame")).toHaveAttribute("data-flicker", "still");
    cleanup();
    window.matchMedia = originalMatchMedia;
    renderRoom();
    const working = document.querySelector(".lamp-spot .lamp-flame");
    expect(working).toHaveAttribute("data-flicker", "on");
    expect(working?.querySelectorAll(".lamp-frame")).toHaveLength(3);
    expect(working?.querySelectorAll("[aria-label='Desk lamp, lit']")).toHaveLength(1);
    await user.click(screen.getByRole("tab", { name: "Atelier" }));
    expect(document.querySelector(".lamp-spot .lamp-flame")).toHaveAttribute("data-flicker", "off");
    expect(document.querySelector(".lamp-frame")).toBeNull();
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
    expect(document.querySelector(".overview-sheet")).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-sheet", "open");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Message Atelier" }), "Pin the swatch.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Pin the swatch.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "File the swatch" }));
    const dialog = screen.getByRole("dialog", { name: "Approve this action?" });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(screen.getByRole("button", { name: /Atelier/ })).toHaveFocus();

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
    expect(document.querySelector(".overview-sheet .paper-log")).toHaveTextContent(/lamp is out/);
    expect(screen.getByRole("img", { name: "Desk lamp, failed" })).toBeInTheDocument();
    expect(document.querySelector(".overview-sheet")).toHaveAttribute("data-still", "true");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(document.querySelector(".overview-sheet .paper-slot")).toHaveAttribute("data-pose", "expanded");
  });
});

describe("team board", () => {
  it("shows a plaque, a title, and a lamp for every agent", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    for (const team of listTeams()) {
      cleanup();
      renderRoom(team.id);
      await user.click(screen.getByRole("button", { name: "Team" }));
      expect(document.querySelector(".team-board")).toHaveAttribute("data-count", String(team.agents.length));
      expect(document.querySelector(".team-board")).toHaveAttribute("data-mount", "wall");
      expect(document.querySelector(".board-wall")).toHaveAttribute("data-material", "plaster");
      expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
      expect(document.querySelector(".board-team")).toHaveTextContent(team.name);
      expect(screen.queryByText(/Team is a stub/)).not.toBeInTheDocument();
      for (const agent of team.agents) {
        const lamp = lampArt(agent.status);
        const plaque = screen.getByRole("button", { name: new RegExp(agent.name) });
        expect(plaque).toHaveAttribute("data-status", agent.status);
        expect(plaque).toHaveAttribute("data-plaque", "engraved");
        expect(plaque.querySelector("input, textarea, select")).toBeNull();
        expect(plaque.querySelector(".plaque-plate")).not.toBeNull();
        expect(plaque).toHaveTextContent(lamp.caption);
        const frame = frameSpec(agent.status);
        expect(plaque.querySelector(".status-frame")).toHaveAttribute("data-status", agent.status);
        expect(plaque.querySelector(".status-frame")).toHaveAttribute("data-state", frame.state);
        expect(plaque.querySelector(".status-frame")).toHaveAttribute("data-pattern", frame.pattern);
        if (agent.title) expect(plaque).toHaveTextContent(agent.title);
        expect(plaque.querySelector("[data-slot='model']")).toHaveTextContent("Model");
        expect(plaque.querySelector("[data-slot='tools']")).toHaveTextContent("Tools");
        expect(plaque.querySelector("[data-slot='room']")).toHaveTextContent("Room");
        if (agent.slots?.model) expect(plaque).toHaveTextContent(agent.slots.model);
        if (agent.slots?.room) expect(plaque).toHaveTextContent(agent.slots.room);
        expect(plaque.querySelector(`[aria-label="${lamp.title}"]`)).toBeTruthy();
      }
    }
  });

  it("opens an agent paper chat and Back returns to the board, then the CEO study", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await localDb.open();
    renderRouted();

    await user.click(screen.getByRole("button", { name: "Team" }));
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(screen.getByText(/swatch sheet is waiting/)).toBeInTheDocument();
    expect(screen.getByText("generated · not verified")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, dark" })).toBeInTheDocument();
    expect(document.querySelector(".team-board")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Message Atelier" }), "Pin the swatch.");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Pin the swatch.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "File the swatch" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(document.querySelector(".team-board")).toHaveAttribute("data-count", "3");
    expect(screen.queryByRole("heading", { name: "Hall" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "CEO chat" })).toBeInTheDocument();
    expect(document.querySelector(".team-board")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hall" })).not.toBeInTheDocument();
    expect(screen.queryByText("Pin the swatch.")).not.toBeInTheDocument();
  });

  it("returns to the open desk chat, then Overview, without shutting the door", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRouted();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hall" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
  });

  it("returns to Overview when the board was opened from the desks", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRouted();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(document.querySelector(".team-board")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hall" })).not.toBeInTheDocument();
  });

  it("lists fixture tools on the stapler slip and does not call out", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    await user.click(screen.getByRole("button", { name: "Stapler" }));
    expect(screen.getByRole("button", { name: "Stapler" })).toHaveAttribute("data-reach", "local");
    expect(screen.getByRole("menu", { name: "Fixture tools" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Swatch sheet" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Forge stamp" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Errand slip" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Swatch sheet" }));
    expect(screen.getByRole("status")).toHaveTextContent("Label only. Nothing left this board.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Fixture tools" })).not.toBeInTheDocument();
  });

  it("hides a missing title and shows a blank slip when the fixture has no tools", async () => {
    const user = userEvent.setup();
    render(
      <TeamBoard
        team={{
          id: "bare",
          name: "Bare Team",
          tools: [],
          transcript: [],
          agents: [{ id: "ceo", name: "CEO", status: "idle" }],
        }}
        still
        expandingId={null}
        onOpen={() => {}}
      />,
    );
    const plaque = screen.getByRole("button", { name: /CEO/ });
    expect(plaque).toHaveTextContent("Idle");
    expect(plaque.querySelector(".plaque-title")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stapler" }));
    expect(screen.getByText("This slip is blank.")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps the board off the human vault", () => {
    expect(boardSource).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|fetch\(/);
  });

  it("swaps a plaque into chat in one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(document.querySelector(".team-board")).toHaveAttribute("data-still", "true");
    await user.click(screen.getByRole("button", { name: /Courier/ }));
    expect(screen.getByRole("heading", { name: "Courier chat" })).toBeInTheDocument();
    expect(screen.getByText(/lamp is out/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, failed" })).toBeInTheDocument();
    expect(document.querySelector(".plaque")).not.toBeInTheDocument();
  });

  it("pins a seat to the top of the roster without writing a vault", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    const order = () => [...document.querySelectorAll(".plaque")].map((node) => node.getAttribute("data-agent"));
    expect(order()).toEqual(["ceo", "atelier", "courier"]);
    expect(document.querySelector(".brass-pin[data-agent='courier']")).toHaveAttribute("data-pin", "out");
    expect(document.querySelector(".plaque[data-agent='courier'] .status-frame")).toHaveAttribute("data-state", "error");

    await user.click(document.querySelector(".brass-pin[data-agent='courier']")!);
    expect(order()).toEqual(["courier", "ceo", "atelier"]);
    expect(document.querySelector(".plaque-seat[data-agent='courier']")).toHaveAttribute("data-pinned", "true");
    expect(document.querySelector(".brass-pin[data-agent='courier']")).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".brass-pin[data-agent='courier']")).toHaveAttribute("data-pin", "in");

    await user.click(document.querySelector(".brass-pin[data-agent='atelier']")!);
    expect(order()).toEqual(["atelier", "courier", "ceo"]);
    await user.click(document.querySelector(".brass-pin[data-agent='atelier']")!);
    expect(order()).toEqual(["courier", "ceo", "atelier"]);
    expect(document.querySelector(".tools-dock")).toHaveAttribute("data-reach", "local");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
    expect(localStorage.getItem("founder-os.team-board")).toContain("courier");
  });

  it("opens swap and edit on the board and leaves the agent and both vaults alone", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));

    await user.click(document.querySelector(".scene-swap[data-agent='atelier']")!);
    const swap = screen.getByRole("dialog", { name: "Swap seat" });
    expect(swap).toHaveAttribute("data-overlay", "swap");
    expect(swap).toHaveAttribute("data-reach", "local");
    expect(swap).toHaveAttribute("data-frames", "1");
    expect(swap).toHaveAttribute("data-still", "true");
    expect(swap).toHaveTextContent("Nothing is sent.");
    expect(screen.queryByRole("heading", { name: "Approve this action?" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Swap with Courier" }));
    expect(screen.getByRole("status")).toHaveTextContent("Marked on this board. Nothing was sent.");
    expect(getBoardPrefs().marks["hale-design-lab:atelier"]).toBe("courier");
    expect([...document.querySelectorAll(".plaque")].map((node) => node.getAttribute("data-agent"))).toEqual([
      "ceo",
      "atelier",
      "courier",
    ]);

    await user.click(document.querySelector(".scene-edit[data-agent='atelier']")!);
    const edit = screen.getByRole("dialog", { name: "Edit agent" });
    expect(edit).toHaveTextContent("This changes the agent everywhere.");
    expect(edit).toHaveTextContent("This sheet does not send it.");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Atelier");
    await user.clear(screen.getByRole("textbox", { name: "Name" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Painter");
    await user.click(screen.getByRole("button", { name: "Keep on this sheet" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Painter/ })).toHaveAttribute("data-agent", "atelier");
    expect(screen.getByRole("button", { name: /Painter/ }).querySelector(".status-frame")).toHaveAttribute(
      "data-status",
      "idle",
    );
    expect(teamById("hale-design-lab")?.agents.find((agent) => agent.id === "atelier")?.name).toBe("Atelier");
    expect(screen.getByRole("tab", { name: "Atelier" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("keeps a local tool label on the dock and refuses an address", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await localDb.open();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(document.querySelector(".dock-label[data-tool='Swatch sheet']")).toHaveTextContent("Swatch sheet");
    await user.click(screen.getByRole("button", { name: "Stapler" }));
    await user.click(screen.getByRole("menuitem", { name: "Swatch sheet" }));
    const field = screen.getByRole("textbox", { name: "Local label" });
    await user.clear(field);
    await user.type(field, "Swatch card");
    await user.click(screen.getByRole("button", { name: "Keep label" }));
    expect(screen.getByRole("status")).toHaveTextContent("Kept on this board. Nothing was sent.");
    expect(screen.getByRole("menuitem", { name: "Swatch card" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(document.querySelector(".dock-label[data-tool='Swatch sheet']")).toHaveTextContent("Swatch card");

    await user.click(screen.getByRole("button", { name: "Stapler" }));
    await user.click(screen.getByRole("menuitem", { name: "Forge stamp" }));
    const stamp = screen.getByRole("textbox", { name: "Local label" });
    await user.clear(stamp);
    await user.type(stamp, "https://forge.example");
    await user.click(screen.getByRole("button", { name: "Keep label" }));
    expect(screen.getByRole("status")).toHaveTextContent("That label stays here.");
    expect(screen.getByRole("menuitem", { name: "Forge stamp" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("swells a plaque before the chat when motion is allowed", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Team" }));
    await user.click(screen.getByRole("button", { name: /Courier/ }));
    expect(document.querySelector('.plaque[data-expanding="true"]')).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Courier chat" })).toBeInTheDocument();
    expect(document.querySelector(".plaque")).not.toBeInTheDocument();
  });
});

describe("work library shelf", () => {
  async function openLibrary() {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Library" }));
    await waitFor(() => {
      expect(document.querySelector(".library-room")).toHaveAttribute("data-ready", "true");
    });
    return user;
  }

  it("shows an empty human shelf and Back returns to the CEO study", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = await openLibrary();
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(document.querySelector(".bookcase .library-head")).toBeTruthy();
    expect(screen.getByText("The shelf is bare.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a note" })).toBeInTheDocument();
    expect(document.querySelectorAll(".dust-spine")).toHaveLength(3);
    expect(screen.getByText("Human notes for this team.")).toBeInTheDocument();
    expect(document.querySelector(".library-room")).toHaveAttribute("data-vault", "human");
    expect(screen.queryByText(/Library is a stub/)).not.toBeInTheDocument();
    expect(screen.queryByText(/machine shelf/i)).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "CEO chat" })).toBeInTheDocument();
    expect(document.querySelector(".library-room")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lists human notes, opens one, and saves an edit", async () => {
    await noteRepo.saveHumanEdit(
      {
        id: "HN-OLDER",
        projectId: "work:hale-design-lab",
        vault: "human",
        content: "Lamp hours on the forge.",
        revision: 1,
        updatedAt: "2026-10-29T09:00:00.000Z",
      },
      "human",
    );
    await noteRepo.saveHumanEdit(
      {
        id: "HN-NEWER",
        projectId: "work:hale-design-lab",
        vault: "human",
        content: "A margin I kept.",
        revision: 1,
        updatedAt: "2026-10-29T10:00:00.000Z",
      },
      "human",
    );
    await noteRepo.saveMachineOutput(
      {
        id: "MN-SHELFMACHINE0000000001",
        projectId: "work:hale-design-lab",
        vault: "machine",
        content: "A machine draft that must stay off the shelf.",
        revision: 1,
        updatedAt: "2026-10-29T13:00:00.000Z",
      },
      "machine",
    );

    const user = await openLibrary();
    expect(screen.getByRole("button", { name: /A margin I kept\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lamp hours on the forge\./ })).toBeInTheDocument();
    expect(screen.queryByText("A machine draft that must stay off the shelf.")).not.toBeInTheDocument();
    expect(screen.queryByText("The shelf is bare.")).not.toBeInTheDocument();
    const notesBay = document.querySelector('.shelf-bay[data-kind="notes"]');
    const spines = notesBay?.querySelectorAll(".spine") ?? [];
    expect(notesBay?.contains(screen.getByRole("button", { name: /A margin I kept\./ }))).toBe(true);
    expect(document.querySelector('.shelf-bay[data-kind="kit"]')).toHaveAttribute("data-pinned", "true");
    expect(spines[0]?.getAttribute("data-band")).not.toBe(spines[1]?.getAttribute("data-band"));
    expect(spines[0]?.getAttribute("data-tone")).not.toBe(spines[1]?.getAttribute("data-tone"));
    expect(spines[0]?.querySelector(".spine-title")).toHaveAttribute("data-label", "pixel");
    expect(spines[0]?.querySelector(".spine-line")).toBeTruthy();
    expect(spines[0]?.querySelector(".status-frame")).toHaveAttribute("data-state", "done");
    expect(spines[0]?.querySelector(".status-frame")).toHaveAttribute("data-pattern", "corners");
    expect(spines[1]?.querySelector(".status-frame")).toHaveTextContent("Done");

    await user.click(screen.getByRole("button", { name: /A margin I kept\./ }));
    expect(screen.getByRole("heading", { name: "A margin I kept." })).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Your note" });
    expect(box).toHaveValue("A margin I kept.");
    await user.clear(box);
    await user.type(box, "A margin I rewrote.");
    await user.click(screen.getByRole("button", { name: "Save this note" }));
    expect(await screen.findByText("Saved on the shelf.")).toBeInTheDocument();

    const kept = await localDb.humanNotes.get("HN-NEWER");
    expect(kept).toMatchObject({
      vault: "human",
      projectId: "work:hale-design-lab",
      content: "A margin I rewrote.",
      revision: 2,
    });
    expect(await localDb.machineNotes.count()).toBe(1);
    expect((await localDb.machineNotes.toArray())[0]?.content).toBe("A machine draft that must stay off the shelf.");

    await user.click(screen.getByRole("button", { name: "Set it down" }));
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /A margin I rewrote\./ })).toBeInTheDocument();
  });

  it("places a new sheet only when a person saves it", async () => {
    const user = await openLibrary();
    await user.click(screen.getByRole("button", { name: "Place a sheet" }));
    await user.click(screen.getByRole("button", { name: "Save this note" }));
    expect(await screen.findByText("Write a line before you save it.")).toBeInTheDocument();
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "Filed from the shelf.");
    await user.click(screen.getByRole("button", { name: "Save this note" }));
    expect(await screen.findByText("Saved on the shelf.")).toBeInTheDocument();
    const kept = await localDb.humanNotes.toArray();
    expect(kept).toHaveLength(1);
    expect(kept[0]?.id.startsWith("HN-")).toBe(true);
    expect(kept[0]).toMatchObject({ vault: "human", projectId: "work:hale-design-lab", content: "Filed from the shelf." });
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("refuses a machine principal before any human vault write", async () => {
    await noteRepo.saveHumanEdit(
      {
        id: "HN-READ",
        projectId: "work:hale-design-lab",
        vault: "human",
        content: "Read this. Do not overwrite it.",
        revision: 1,
        updatedAt: "2026-10-29T09:00:00.000Z",
      },
      "human",
    );
    sessionSource.principal = "machine";
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const user = await openLibrary();
    await user.click(screen.getByRole("button", { name: /Read this\. Do not overwrite it\./ }));
    expect(screen.queryByRole("textbox", { name: "Your note" })).not.toBeInTheDocument();
    expect(await screen.findByText("Only you can open this sheet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Place a sheet" }));
    expect(screen.queryByRole("textbox", { name: "Your note" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Filter Notes" }), "overwrite");
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.get("HN-READ")).toMatchObject({
      content: "Read this. Do not overwrite it.",
      revision: 1,
    });
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("returns to Overview when the shelf was opened from the desks", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "Library" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(document.querySelector(".library-room")).not.toBeInTheDocument();
  });

  it("groups shelves, pins the default kit first, and filters without a vault write", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const user = await openLibrary();
    expect(
      [...document.querySelectorAll(".shelf-bay")].map((bay) => bay.getAttribute("data-kind")),
    ).toEqual(["kit", "notes", "paths"]);
    expect(document.querySelector(".shelf-kind")).toHaveAttribute("data-label", "pixel");
    expect(screen.getByText("Default kit")).toBeInTheDocument();
    expect(screen.getByText("Paths")).toBeInTheDocument();
    expect(document.querySelector('.shelf-bay[data-kind="paths"]')).toContainElement(
      screen.getByRole("button", { name: /Reading Room path/ }),
    );
    expect(document.querySelector('.shelf-bay[data-kind="kit"] .status-frame')).toHaveAttribute("data-state", "idle");
    expect(document.querySelector('.shelf-bay[data-kind="kit"] .status-frame')).toHaveAttribute("data-pattern", "solid");
    expect(screen.getByText("The shelf is bare.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Founder seal/ }));
    expect(screen.queryByRole("textbox", { name: "Your note" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unpin default kit" }));
    expect(
      [...document.querySelectorAll(".shelf-bay")].map((bay) => bay.getAttribute("data-kind")),
    ).toEqual(["notes", "paths", "kit"]);
    expect(document.querySelector('.shelf-bay[data-kind="kit"]')).toHaveAttribute("data-pinned", "false");
    expect(localStorage.getItem("founder-os.library-shelf")).toContain("false");
    await user.click(screen.getByRole("button", { name: "Pin default kit" }));
    expect(document.querySelector(".shelf-bay")?.getAttribute("data-kind")).toBe("kit");

    await user.type(screen.getByRole("textbox", { name: "Filter Default kit" }), "quill");
    expect(screen.getByRole("button", { name: /Quill/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Founder seal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+4 more on Default kit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reading Room path/ })).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("opens +N as a title list and keeps human edits on the notes shelf", async () => {
    const stamps = ["09", "10", "11", "12"];
    for (const [index, stamp] of stamps.entries()) {
      await noteRepo.saveHumanEdit(
        {
          id: `HN-ROW${index + 1}`,
          projectId: "work:hale-design-lab",
          vault: "human",
          content: `Sheet ${index + 1}.`,
          revision: 1,
          updatedAt: `2026-10-29T${stamp}:00:00.000Z`,
        },
        "human",
      );
    }
    const user = await openLibrary();
    const notesBay = document.querySelector('.shelf-bay[data-kind="notes"]');
    expect(notesBay?.querySelectorAll(".spine:not(.spine-more)")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Sheet 4\./ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sheet 1\./ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+2 more on Notes" }));
    const list = screen.getByRole("region", { name: "More on Notes" });
    expect(list).toHaveTextContent("Sheet 1.");
    expect(list).toHaveTextContent("Sheet 2.");
    expect(screen.queryByRole("textbox", { name: "Your note" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sheet 1." }));
    expect(screen.getByRole("textbox", { name: "Your note" })).toHaveValue("Sheet 1.");
    expect(await localDb.humanNotes.count()).toBe(4);
  });

  it("cuts the open sheet to one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = await openLibrary();
    await user.click(screen.getByRole("button", { name: "+4 more on Default kit" }));
    expect(document.querySelector(".overflow-slip")).toHaveAttribute("data-still", "true");
    expect(document.querySelector(".overflow-slip")).toHaveAttribute("data-pose", "shown");
    expect(document.querySelector('.shelf-bay[data-kind="kit"] .status-frame')).toHaveAttribute("data-frames", "1");
    expect(document.querySelector('.shelf-bay[data-kind="kit"] .status-frame')).toHaveAttribute("data-still", "true");
    await user.keyboard("{Escape}");
    expect(document.querySelector(".overflow-slip")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Place a sheet" }));
    const paper = document.querySelector(".library-paper");
    expect(paper).toHaveAttribute("data-still", "true");
    expect(paper).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(document.querySelector(".library-paper")).not.toBeInTheDocument();
  });
});
