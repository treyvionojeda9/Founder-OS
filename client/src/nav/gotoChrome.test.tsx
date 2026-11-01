import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CHORD_MS } from "./chord";
import { GotoChrome } from "./GotoChrome";
import { resetNavForTests } from "./room";
import { Home } from "../routes/Home";
import { LearnStub } from "../routes/LearnStub";
import { TeamRoom } from "../routes/TeamRoom";
import { localDb, sessionSource } from "../storage/services";
import { SessionProvider } from "../storage/session";
import { resetChatForTests } from "../team/chatStore";

afterEach(async () => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  resetNavForTests();
  resetChatForTests();
  vi.useRealTimers();
  sessionSource.principal = "human";
  localDb.close();
  await localDb.delete();
  delete document.documentElement.dataset.chord;
});

function renderShell(path = "/home") {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/team/:id" element={<TeamRoom />} />
            <Route path="/learn/:id" element={<LearnStub />} />
          </Routes>
          <GotoChrome />
        </>
      </MemoryRouter>
    </SessionProvider>,
  );
}

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

describe("go-to chords in the hall", () => {
  it("G then S opens School and G then O opens Overview", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(await screen.findByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("g");
    expect(document.documentElement).toHaveAttribute("data-chord", "armed");
    await user.keyboard("s");
    await waitFor(() => expect(screen.getByRole("tab", { name: "School" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByRole("button", { name: "Open Reading Room" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Hale Design Lab" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-place='school']")).toBeTruthy();

    await user.keyboard("g");
    await user.keyboard("o");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument());
    expect(document.querySelector("[data-place='overview']")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Approve this action?" })).not.toBeInTheDocument();
  });

  it("lets an unfinished chord expire without changing rooms", () => {
    vi.useFakeTimers();
    renderShell();
    fireEvent.keyDown(window, { key: "g" });
    expect(document.documentElement).toHaveAttribute("data-chord", "armed");
    act(() => {
      vi.advanceTimersByTime(CHORD_MS);
    });
    expect(document.documentElement).toHaveAttribute("data-chord", "idle");
    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
  });

  it("does not steal letters from the chat field", async () => {
    const user = userEvent.setup();
    renderShell("/team/hale-design-lab");
    const box = await screen.findByLabelText("Message the CEO");
    await user.click(box);
    await user.type(box, "go to school");
    expect(box).toHaveValue("go to school");
    expect(screen.getByRole("heading", { name: "CEO chat" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("ranks Overview commands ahead of the other wings and Escape closes the ledger", async () => {
    const user = userEvent.setup();
    renderShell("/team/hale-design-lab");
    await user.click(await screen.findByRole("tab", { name: "Overview" }));
    await user.keyboard("{Control>}k{/Control}");

    const dialog = await screen.findByRole("dialog", { name: "Command ledger" });
    expect(dialog).toHaveAttribute("data-room", "overview");
    expect(dialog).toHaveAttribute("data-ledger", "open");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("data-group", "room");
    expect(options[0]).toHaveTextContent("Open the mail slot");
    expect(options.some((option) => option.getAttribute("data-group") === "anywhere")).toBe(true);
    const split = options.findIndex((option) => option.getAttribute("data-group") === "anywhere");
    expect(options.slice(0, split).every((option) => option.getAttribute("data-group") === "room")).toBe(true);
    expect(options.slice(split).every((option) => option.getAttribute("data-group") === "anywhere")).toBe(true);
    expect(screen.queryByRole("option", { name: /Overview/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Work hall/ })).toHaveAttribute("data-group", "anywhere");
    expect(screen.queryByRole("option", { name: /Approve/ })).not.toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("button", { name: "Set it down" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approve this action?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Command ledger" })).not.toBeInTheDocument();
  });

  it("opens the ledger in one frame when motion is reduced", async () => {
    preferStillFrames();
    const user = userEvent.setup();
    renderShell("/home");
    await screen.findByRole("tab", { name: "Work" });
    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Command ledger" });
    expect(dialog).toHaveAttribute("data-still", "true");
    expect(dialog).toHaveAttribute("data-frames", "1");
    window.matchMedia = originalMatchMedia;
  });
});
