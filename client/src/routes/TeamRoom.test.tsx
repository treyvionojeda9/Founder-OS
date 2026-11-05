import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { localDb, noteRepo } from "../storage/services";
import { resetChatForTests } from "../team/chatStore";
import { TeamRoom } from "./TeamRoom";

afterEach(async () => {
  cleanup();
  resetChatForTests();
  vi.restoreAllMocks();
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

  it("labels the other agents, Overview, Library, and Team as placeholders", async () => {
    const user = userEvent.setup();
    renderRoom();
    expect(screen.getByRole("tab", { name: "CEO" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Atelier" }));
    expect(screen.getByRole("heading", { name: "Atelier" })).toHaveTextContent("Atelier");
    expect(screen.getByText(/Atelier is a placeholder/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Desk lamp, dark" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByText(/Overview is a placeholder/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByText(/Library is a stub/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByText(/Team is a stub/)).toBeInTheDocument();
  });
});
