import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { lampArt } from "../study/lampArt";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { listTeams, resetChatForTests } from "../team/chatStore";
import { TeamBoard } from "../team/TeamBoard";
import boardSource from "../team/TeamBoard.tsx?raw";
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
    expect(screen.getByRole("dialog", { name: "Approve this action?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Approved. Nothing ran.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
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

describe("team board", () => {
  it("shows a plaque, a title, and a lamp for every agent", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    for (const team of listTeams()) {
      cleanup();
      renderRoom(team.id);
      await user.click(screen.getByRole("button", { name: "Team" }));
      expect(document.querySelector(".team-board")).toHaveAttribute("data-count", String(team.agents.length));
      expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
      expect(document.querySelector(".board-team")).toHaveTextContent(team.name);
      expect(screen.queryByText(/Team is a stub/)).not.toBeInTheDocument();
      for (const agent of team.agents) {
        const lamp = lampArt(agent.status);
        const plaque = screen.getByRole("button", { name: new RegExp(agent.name) });
        expect(plaque).toHaveAttribute("data-status", agent.status);
        expect(plaque).toHaveTextContent(lamp.caption);
        if (agent.title) expect(plaque).toHaveTextContent(agent.title);
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
    await user.click(screen.getByRole("button", { name: "Approve" }));
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
    expect(screen.getByText("The shelf is bare.")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "A margin I kept." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lamp hours on the forge." })).toBeInTheDocument();
    expect(screen.queryByText("A machine draft that must stay off the shelf.")).not.toBeInTheDocument();
    expect(screen.queryByText("The shelf is bare.")).not.toBeInTheDocument();
    const spines = document.querySelectorAll(".spine");
    expect(spines[0]?.getAttribute("data-band")).not.toBe(spines[1]?.getAttribute("data-band"));

    await user.click(screen.getByRole("button", { name: "A margin I kept." }));
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
    expect(screen.getByRole("button", { name: "A margin I rewrote." })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Read this. Do not overwrite it." }));
    await user.type(screen.getByRole("textbox", { name: "Your note" }), " Extra.");
    await user.click(screen.getByRole("button", { name: "Save this note" }));
    expect(await screen.findByText("Only you can write on this sheet.")).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.get("HN-READ")).toMatchObject({
      content: "Read this. Do not overwrite it.",
      revision: 1,
    });
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

  it("cuts the open sheet to one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = await openLibrary();
    await user.click(screen.getByRole("button", { name: "Place a sheet" }));
    const paper = document.querySelector(".library-paper");
    expect(paper).toHaveAttribute("data-still", "true");
    expect(paper).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(document.querySelector(".library-paper")).not.toBeInTheDocument();
  });
});
