import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ponderSource from "../study/ponderNote.ts?raw";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { LearnStub } from "./LearnStub";

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
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
  sessionSource.principal = "human";
  localDb.close();
  await localDb.delete();
});

function renderDesk(id = "reading-room") {
  return render(
    <SessionProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LearnStub doorId={id} />
      </MemoryRouter>
    </SessionProvider>,
  );
}

async function readyDesk(id = "reading-room") {
  renderDesk(id);
  await screen.findByRole("heading", { name: "Ponder" });
  await waitFor(() => {
    expect(document.querySelector(".learn-room")).toHaveAttribute("data-ready", "true");
  });
  return document.querySelector(".learn-room");
}

describe("learning desk", () => {
  it("lands a perspective desk with an ember pool, a writing sheet, a book, and a key", async () => {
    const room = await readyDesk();
    expect(room).toHaveAttribute("data-room", "learn");
    expect(room).toHaveAttribute("data-paper", "desk");
    expect(room).toHaveAttribute("data-assignment", "true");
    expect(document.querySelector(".study-stage")).toHaveAttribute("data-variant", "school");
    expect(document.querySelector(".desk-top")).toBeTruthy();
    expect(document.querySelector(".desk-apron")).toBeTruthy();
    expect(document.querySelector(".apron-rail")).toBeTruthy();
    expect(document.querySelector(".floor-plane")).toHaveAttribute("data-material", "floor");
    expect(document.querySelector(".back-wall")).toHaveAttribute("data-material", "plaster");
    expect(document.querySelector(".wainscot")).toHaveAttribute("data-material", "wainscot");
    expect(document.querySelector(".apron-rail")).toHaveAttribute("data-accent", "school");
    expect(document.querySelector(".desk-pool")).toHaveAttribute("data-pool", "working");
    expect(document.querySelector(".desk-pool")).toHaveAttribute("data-pool-palette", "ember");
    expect(screen.getByRole("img", { name: "Desk lamp, lit" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Assignment key" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the current path" })).toBeInTheDocument();
    expect(screen.getByText("A blank sheet. Lift it to write.")).toBeInTheDocument();
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-pose", "desk");
    expect(document.querySelector(".paper-glow")).toBeNull();
    expect(document.body.textContent).not.toMatch(/checker/i);
  });

  it("leaves the key off a desk that has no assignment", async () => {
    const room = await readyDesk("field-notes");
    expect(room).toHaveAttribute("data-assignment", "false");
    expect(screen.queryByRole("img", { name: "Assignment key" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the current path" })).toBeInTheDocument();
  });

  it("lifts the sheet into a typed note and sets it down without writing the vault", async () => {
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await readyDesk();
    const slot = () => document.querySelector(".paper-slot");

    await user.click(screen.getByRole("heading", { name: "Ponder" }));
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.type(screen.getByRole("textbox", { name: "Your note" }), "A line I have not kept.");
    await user.click(screen.getByRole("button", { name: "Set it down" }));
    expect(slot()).toHaveAttribute("data-pose", "desk");
    expect(screen.getByText("A line I have not kept.")).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);

    screen.getByLabelText("Ponder").focus();
    await user.keyboard("{Enter}");
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(slot()).toHaveAttribute("data-pose", "desk");
    screen.getByLabelText("Ponder").focus();
    await user.keyboard(" ");
    expect(slot()).toHaveAttribute("data-pose", "lifted");
    await user.keyboard("{Escape}");
    expect(slot()).toHaveAttribute("data-pose", "desk");
  });

  it("keeps a typed note only when a person asks", async () => {
    const user = userEvent.setup();
    await readyDesk();
    await user.click(screen.getByRole("heading", { name: "Ponder" }));
    await user.click(screen.getByRole("button", { name: "Keep this note" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Write a line before you keep it.");
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "The sentence in my words.");
    await user.click(screen.getByRole("button", { name: "Keep this note" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Kept with your notes.");
    const kept = await localDb.humanNotes.toArray();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      vault: "human",
      projectId: "school:reading-room",
      content: "The sentence in my words.",
      revision: 1,
    });
    expect(kept[0].id.startsWith("HN-")).toBe(true);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("refuses a machine principal before any human vault write", async () => {
    sessionSource.principal = "machine";
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    await readyDesk();
    await user.click(screen.getByRole("heading", { name: "Ponder" }));
    await user.type(screen.getByRole("textbox", { name: "Your note" }), "Not mine to keep.");
    await user.click(screen.getByRole("button", { name: "Keep this note" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Only you can keep this note.");
    expect(saveHuman).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
  });

  it("opens the fixture path from the book and does not write a note", async () => {
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await readyDesk();
    await user.click(screen.getByRole("button", { name: "Open the current path" }));
    const dialog = screen.getByRole("dialog", { name: "Reading Room path" });
    expect(dialog).toHaveTextContent("Sit with one page");
    expect(dialog).toHaveTextContent("A fixture. No course is loaded.");
    expect(dialog).toHaveTextContent("Margin key");
    expect(dialog).toHaveTextContent("Write that sentence in your own words.");
    await user.click(screen.getByRole("button", { name: "Close the book" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("opens the field notes path without an assignment", async () => {
    const user = userEvent.setup();
    await readyDesk("field-notes");
    await user.click(screen.getByRole("button", { name: "Open the current path" }));
    const field = screen.getByRole("dialog", { name: "Field Notes path" });
    expect(field).toHaveTextContent("Name one thing you noticed");
    expect(field).toHaveTextContent("No assignment on this desk.");
    expect(field).not.toHaveTextContent("Margin key");
  });

  it("cuts the lift to one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    await readyDesk();
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-still", "true");
    await user.click(screen.getByRole("heading", { name: "Ponder" }));
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-pose", "lifted");
    expect(document.querySelector(".paper-slot")).toHaveAttribute("data-still", "true");
  });

  it("has no machine vault write in the ponder save path", () => {
    expect(ponderSource).not.toMatch(/saveMachineOutput|machineNotes/);
    expect(ponderSource).toMatch(/saveHumanEdit/);
  });
});
