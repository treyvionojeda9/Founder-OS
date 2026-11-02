import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import type { Note } from "../storage/noteRepository";
import { SessionProvider } from "../storage/session";
import { LearnStub } from "../routes/LearnStub";
import { TeamRoom } from "../routes/TeamRoom";
import { resetNavForTests } from "./room";

afterEach(async () => {
  cleanup();
  resetNavForTests();
  sessionSource.principal = "human";
  vi.restoreAllMocks();
  localDb.close();
  await localDb.delete();
});

function renderAt(path: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/work/overview" element={<TeamRoom />} />
          <Route path="/work/library" element={<TeamRoom />} />
          <Route path="/school/path" element={<LearnStub />} />
          <Route path="/team/:id" element={<TeamRoom />} />
          <Route path="/learn/:id" element={<LearnStub />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
}

function human(partial: Partial<Note> & Pick<Note, "id" | "content" | "projectId">): Note {
  return {
    vault: "human",
    revision: 1,
    updatedAt: "2026-10-29T12:00:00.000Z",
    ...partial,
  };
}

describe("deep link rooms", () => {
  it("opens an agent sheet from the overview url and does not approve", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    renderAt("/work/overview?agent=atelier");
    expect(await screen.findByRole("heading", { name: "Atelier chat" })).toBeInTheDocument();
    expect(document.querySelector(".study")).toHaveAttribute("data-deep", "overview");
    expect(document.querySelector(".study")).toHaveAttribute("data-deep-focus", "atelier");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-lighting", "ember");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-space", "work");
    expect(document.querySelector(".desk-room > .pipeline-rooms")).toBeTruthy();
    expect(document.querySelector(".desk-hall .pipeline-rooms")).toBeNull();
    expect(document.querySelector(".mail-slot, .mail-tray, [aria-label*='mail slot']")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveAttribute("data-kind", "agent");
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Approve this action?" })).not.toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
  });

  it("opens the only team that seats a unique agent", async () => {
    renderAt("/work/overview?agent=relay");
    expect(await screen.findByRole("heading", { name: "Relay chat" })).toBeInTheDocument();
    expect(screen.getByText("Cloud Agent Team")).toBeInTheDocument();
    expect(document.querySelector(".copy-link")).toHaveAttribute("data-id", "relay");
  });

  it("lands on the overview with no sheet when the agent id is missing", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderAt("/work/overview?agent=not-a-desk");
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(document.querySelector(".study")).toHaveAttribute("data-deep-focus", "none");
    expect(document.querySelector(".overview-sheet")).not.toBeInTheDocument();
    expect(document.querySelector(".copy-link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Library" })).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
  });

  it("opens the same agent from the existing team route", async () => {
    renderAt("/team/hale-design-lab?agent=courier");
    expect(await screen.findByRole("heading", { name: "Courier chat" })).toBeInTheDocument();
    expect(document.querySelector(".copy-link")).toHaveAttribute("data-pattern", "corner");
  });

  it("opens a human note from the library url and ignores a missing id", async () => {
    await noteRepo.saveHumanEdit(
      human({ id: "HN-KEPT01", projectId: "work:hale-design-lab", content: "A kept margin." }),
      "human",
    );
    await noteRepo.saveHumanEdit(
      human({ id: "HN-CLOUD1", projectId: "work:cloud-agent-team", content: "Cloud margin." }),
      "human",
    );
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    const view = renderAt("/work/library?note=HN-CLOUD1");
    await waitFor(() => {
      expect(document.querySelector(".library-room")).toHaveAttribute("data-ready", "true");
      expect(document.querySelector(".library-room")).toHaveAttribute("data-focus", "HN-CLOUD1");
    });
    expect(screen.getByText("Cloud Agent Team")).toBeInTheDocument();
    expect(screen.getByLabelText("Your note")).toHaveValue("Cloud margin.");
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveAttribute("data-kind", "note");
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(2);

    view.unmount();
    renderAt("/work/library?note=HN-NOT-REAL");
    await waitFor(() => {
      expect(document.querySelector(".library-room")).toHaveAttribute("data-ready", "true");
    });
    expect(document.querySelector(".library-room")).toHaveAttribute("data-focus", "none");
    expect(document.querySelector(".library-paper")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(2);
  });

  it("opens a path station from the school url and leaves a bad id unfocused", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    renderAt("/school/path?node=task-notice");
    expect(await screen.findByRole("dialog", { name: "Field Notes path" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Name one thing you noticed" })).toBeInTheDocument();
    expect(document.querySelector(".learn-room")).toHaveAttribute("data-deep-focus", "task-notice");
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveAttribute("data-kind", "node");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(document.querySelector(".path-sheet textarea, .path-sheet form")).toBeNull();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);

    cleanup();
    renderAt("/school/path?node=missing-station");
    expect(await screen.findByRole("dialog", { name: "Reading Room path" })).toBeInTheDocument();
    expect(document.querySelector(".learn-room")).toHaveAttribute("data-deep-focus", "none");
    expect(document.querySelector(".path-sheet")).not.toBeInTheDocument();
    expect(document.querySelector(".path-map")).toBeTruthy();
    expect(saveHuman).not.toHaveBeenCalled();
  });

  it("opens a station from the existing learn route", async () => {
    renderAt("/learn/reading-room?node=assign-margin");
    expect(await screen.findByRole("region", { name: "Margin key" })).toBeInTheDocument();
    expect(document.querySelector(".copy-link")).toHaveAttribute("data-id", "assign-margin");
  });

  it("copies the canonical url from the paper corner", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderAt("/work/overview?agent=ceo");
    await screen.findByRole("heading", { name: "CEO chat" });
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/work/overview?agent=ceo"));
    expect(screen.getByRole("button", { name: "Link copied" })).toHaveAttribute("data-copied", "true");
    expect(screen.getByRole("button", { name: "Link copied" })).toHaveAttribute("data-pattern", "tick");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
