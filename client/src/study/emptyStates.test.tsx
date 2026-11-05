import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import emptyShelfSource from "../library/EmptyShelf.tsx?raw";
import librarySource from "../library/LibraryShelf.tsx?raw";
import { TeamRoom } from "../routes/TeamRoom";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { resetChatForTests } from "../team/chatStore";
import { DeskGrid } from "./DeskGrid";
import emptyDeskSource from "./EmptyDesk.tsx?raw";

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

describe("empty states as objects", () => {
  it("keeps a seated overview free of the vacant card", async () => {
    const user = userEvent.setup();
    renderRoom();
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-empty", "false");
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-count", "3");
    expect(screen.queryByRole("button", { name: "Seat an agent" })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".agent-desk .status-frame")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /mail slot/i })).toBeInTheDocument();
  });

  it("seats from the empty desk through the existing swap slip and writes nothing", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderRoom("quiet-bench");

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    const card = document.querySelector(".empty-desk");
    expect(card).toHaveAttribute("data-object", "empty-desk");
    expect(card).toHaveAttribute("data-still", "true");
    expect(card).toHaveAttribute("data-frames", "1");
    expect(card?.querySelector(".empty-desk-plaque")).toHaveAttribute("data-plaque", "engraved");
    expect(card?.querySelector(".empty-desk-plaque")).toHaveAttribute("data-label", "pixel");
    expect(card?.querySelector(".empty-desk-seat")).toHaveAttribute("data-pattern", "dashed");
    expect(screen.getByText("This desk is empty.")).toBeInTheDocument();
    expect(document.querySelector(".mail-slot")).toBeTruthy();
    expect(document.querySelector(".agent-desk")).toBeNull();
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-arrange", "strip");

    await user.click(screen.getByRole("button", { name: "Seat an agent" }));
    const dialog = await screen.findByRole("dialog", { name: "Swap seat" });
    expect(dialog).toHaveAttribute("data-overlay", "swap");
    expect(dialog).toHaveAttribute("data-reach", "local");
    expect(dialog).toHaveAttribute("data-frames", "1");
    expect(dialog).toHaveAttribute("data-still", "true");
    expect(screen.getByText("No other seat on this board.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);

    await user.click(screen.getByRole("button", { name: "Set it aside" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stapler" })).toBeInTheDocument();
  });

  it("draws dust on an empty shelf and opens the human sheet without writing", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Library" }));
    await waitFor(() => expect(document.querySelector(".library-room")).toHaveAttribute("data-ready", "true"));

    const dust = document.querySelector(".shelf-dust");
    expect(dust).toHaveAttribute("data-object", "empty-shelf");
    expect(dust).toHaveAttribute("data-still", "true");
    expect(dust).toHaveAttribute("data-frames", "1");
    expect(dust?.querySelectorAll(".dust-spine")).toHaveLength(3);
    expect(dust?.querySelector(".dust-spine")).toHaveAttribute("data-pattern", "dashed");
    expect(screen.getByText("The shelf is bare.")).toBeInTheDocument();
    expect(document.querySelector(".shelf-bay[data-kind='kit'] .status-frame")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Place a sheet" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add a note" }));
    expect(screen.getByRole("textbox", { name: "Your note" })).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);

    await user.type(screen.getByRole("textbox", { name: "Your note" }), "A note from the dust.");
    await user.click(screen.getByRole("button", { name: "Save this note" }));
    expect(await screen.findByText("Saved on the shelf.")).toBeInTheDocument();
    const kept = await localDb.humanNotes.toArray();
    expect(kept).toHaveLength(1);
    expect(kept[0]?.id.startsWith("HN-")).toBe(true);
    expect(kept[0]).toMatchObject({ vault: "human", content: "A note from the dust." });
    expect(await localDb.machineNotes.count()).toBe(0);
    expect(saveMachine).not.toHaveBeenCalled();
    expect(screen.queryByText("The shelf is bare.")).not.toBeInTheDocument();
  });

  it("refuses a machine principal on the empty shelf before any vault call", async () => {
    sessionSource.principal = "machine";
    const user = userEvent.setup();
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await localDb.open();
    renderRoom();
    await user.click(screen.getByRole("button", { name: "Library" }));
    await waitFor(() => expect(document.querySelector(".library-room")).toHaveAttribute("data-ready", "true"));
    await user.click(screen.getByRole("button", { name: "Add a note" }));
    expect(screen.queryByRole("textbox", { name: "Your note" })).not.toBeInTheDocument();
    expect(await screen.findByText("Only you can open this sheet.")).toBeInTheDocument();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("has no vault write on the empty objects", () => {
    const forbidden = /saveHumanEdit|saveMachineOutput|humanNotes|machineNotes|fetch\(|indexedDB/;
    expect(emptyDeskSource).not.toMatch(forbidden);
    expect(emptyShelfSource).not.toMatch(forbidden);
    expect(librarySource).not.toMatch(/saveMachineOutput|machineNotes|fetch\(/);
  });

  it("renders the vacant card from the desk grid without a hire call", async () => {
    const user = userEvent.setup();
    const seated: string[] = [];
    render(
      <DeskGrid teamId="quiet-bench" agents={[]} still expandingId={null} onOpen={() => {}} onSeat={() => seated.push("seat")} />,
    );
    expect(document.querySelector(".desk-grid")).toHaveAttribute("data-empty", "true");
    await user.click(screen.getByRole("button", { name: "Seat an agent" }));
    expect(seated).toEqual(["seat"]);
    expect(screen.getByRole("button", { name: /mail slot/i })).toBeInTheDocument();
  });
});
