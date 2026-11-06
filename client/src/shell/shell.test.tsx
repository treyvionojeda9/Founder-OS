import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { grayscaleGrid } from "../design/spriteGrid";
import { frameCatalog, glyphFrames } from "../design/statusFrame";
import type { FormFactor } from "../hooks/useFormFactor";
import { resetNavForTests } from "../nav/room";
import { localDb, settingsRepo } from "../storage/services";
import { resetChatForTests } from "../team/chatStore";
import { RailStatus } from "./AgentRail";
import { AppShell } from "./AppShell";
import appSource from "./AppShell.tsx?raw";
import dockSource from "./ChatDock.tsx?raw";
import railSource from "./AgentRail.tsx?raw";
import agentsSource from "./railAgents.ts?raw";
import { agentGlyphs, fallbackGlyph, glyphSettings, glyphSpaces } from "./railGlyphs";
import { railAgents } from "./railAgents";
import { shellDeskSearch } from "./shellLayout";
import layoutSource from "./shellLayout.ts?raw";

const originalMatchMedia = window.matchMedia.bind(window);

function matchMedia(reduce: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && /prefers-reduced-motion:\s*reduce/.test(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeEach(() => {
  resetNavForTests();
});

afterEach(async () => {
  cleanup();
  resetChatForTests();
  resetNavForTests();
  window.matchMedia = originalMatchMedia;
  localDb.close();
  await localDb.delete();
});

function Probe() {
  const location = useLocation();
  const state = location.state as { gotoSection?: string } | null;
  return (
    <>
      <button type="button">Room control</button>
      <output data-testid="where">
        {location.pathname}
        {location.search}|{state?.gotoSection ?? ""}
      </output>
    </>
  );
}

function renderShell(path: string, layout: FormFactor = "desktop") {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: layout === "portrait" ? 800 : 1440,
  });
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell layout={layout}>
        <Probe />
      </AppShell>
    </MemoryRouter>,
  );
}

describe("shell desk link", () => {
  it("updates desk search only where a room already reads it", () => {
    expect(shellDeskSearch("/work/overview", "", "atelier")).toBe("?desk=atelier");
    expect(shellDeskSearch("/work/overview", "?agent=ceo", "atelier")).toBe("?desk=atelier");
    expect(shellDeskSearch("/team/hale-design-lab", "", "courier")).toBe("?desk=courier");
    expect(shellDeskSearch("/team/hale-design-lab", "", "relay")).toBeNull();
    expect(shellDeskSearch("/home", "", "atelier")).toBeNull();
    expect(shellDeskSearch("/work/library", "", "ceo")).toBeNull();
    expect(shellDeskSearch("/school/path", "?node=sit", "ceo")).toBeNull();
  });
});

describe("rail symbols", () => {
  it("keeps every symbol a different Founder Ember shape in grayscale", () => {
    const ember = new Set([".", "n", "s", "p", "w", "d", "e", "f", "m"]);
    const glyphs = [...Object.values(agentGlyphs), glyphSettings, glyphSpaces, fallbackGlyph("Quill")];
    for (const rows of glyphs) {
      for (const row of rows) {
        for (const ch of row) expect(ember.has(ch)).toBe(true);
      }
    }
    const paints = glyphs.map((rows) => grayscaleGrid(rows));
    for (let i = 0; i < paints.length; i += 1) {
      for (let j = i + 1; j < paints.length; j += 1) {
        expect(paints[i]).not.toEqual(paints[j]);
      }
    }
    expect(railAgents().map((agent) => agent.id)).toEqual(["ceo", "atelier", "courier", "relay", "bench"]);
  });

  it("separates Idle, Working, Waiting, Done, and Error by pattern and glyph", () => {
    const { container } = render(
      <div>
        {frameCatalog.map((spec) => (
          <RailStatus key={spec.state} status={spec.status} still />
        ))}
      </div>,
    );
    const frames = [...container.querySelectorAll(".status-frame")];
    expect(frames.map((frame) => frame.getAttribute("data-pattern"))).toEqual([
      "solid",
      "dash",
      "double",
      "corners",
      "crack",
    ]);
    expect(new Set(frames.map((frame) => frame.getAttribute("data-glyph"))).size).toBe(5);
    const paints = frameCatalog.map((spec) => {
      const grid = glyphFrames(spec.status, true)[0];
      if (!grid) throw new Error(`missing glyph for ${spec.status}`);
      return grayscaleGrid(grid);
    });
    for (let i = 0; i < paints.length; i += 1) {
      for (let j = i + 1; j < paints.length; j += 1) {
        expect(paints[i]).not.toEqual(paints[j]);
      }
    }
  });
});

describe("AppShell", () => {
  it("selects a rail agent and shows that chat with a composer", async () => {
    const user = userEvent.setup();
    renderShell("/home");
    expect(screen.getByText("Pick an agent to read the chat here.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Atelier/ }));

    expect(screen.getByTestId("where")).toHaveTextContent("/home|");
    const dock = screen.getByRole("complementary", { name: "Atelier chat" });
    expect(dock).toHaveTextContent("The desk is quiet.");
    expect(screen.getByRole("textbox", { name: "Write to Atelier" })).toBeInTheDocument();
    expect(dock).toHaveTextContent("Nothing is sent.");
    expect(screen.queryByRole("button", { name: "Publish the forge note" })).not.toBeInTheDocument();
  });

  it("writes a chat line and does not touch a vault", async () => {
    const user = userEvent.setup();
    await localDb.open();
    const humanPut = vi.spyOn(localDb.humanNotes, "put");
    const machinePut = vi.spyOn(localDb.machineNotes, "put");
    renderShell("/home");
    await user.click(screen.getByRole("button", { name: /CEO/ }));
    await user.type(screen.getByRole("textbox", { name: "Write to CEO" }), "Leave it in chat.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Leave it in chat.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(humanPut).not.toHaveBeenCalled();
    expect(machinePut).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("moves on the rail with arrows and Enter, and opens the existing desk link", async () => {
    const user = userEvent.setup();
    renderShell("/work/overview");
    screen.getByRole("button", { name: /Atelier/ }).focus();
    await user.keyboard("{ArrowDown}");
    const courier = screen.getByRole("button", { name: /Courier/ });
    expect(courier).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("where")).toHaveTextContent("/work/overview?desk=courier");
    expect(screen.getByRole("complementary", { name: "Courier chat" })).toHaveTextContent("The lamp is out.");
  });

  it("keeps selection local when the route has no desk link", async () => {
    const user = userEvent.setup();
    renderShell("/team/hale-design-lab");
    await user.click(screen.getByRole("button", { name: /Relay/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/team/hale-design-lab|");
    expect(screen.getByRole("complementary", { name: "Relay chat" })).toHaveTextContent("A packet is on this desk.");
  });

  it("collapses the overlay dock on Escape and leaves a column dock alone from the room", async () => {
    const user = userEvent.setup();
    const portrait = renderShell("/home", "portrait");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /CEO/ }));
    expect(screen.getByRole("complementary", { name: "CEO chat" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    portrait.unmount();

    renderShell("/home", "desktop");
    await user.click(screen.getByRole("button", { name: /Atelier/ }));
    screen.getByRole("button", { name: "Room control" }).focus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("complementary", { name: "Atelier chat" })).toHaveTextContent("The desk is quiet.");
  });

  it("snaps under reduced motion and steps when motion is allowed", () => {
    matchMedia(true);
    const reduced = renderShell("/home");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-motion", "snap");
    for (const frame of document.querySelectorAll(".agent-rail .status-frame")) {
      expect(frame).toHaveAttribute("data-still", "true");
      if (frame.getAttribute("data-status") === "working") {
        expect(frame).toHaveAttribute("data-frames", "1");
      }
    }
    reduced.unmount();

    matchMedia(false);
    renderShell("/home");
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-motion", "slide");
    const working = document.querySelector(".agent-rail .status-frame[data-status='working']");
    expect(working).toHaveAttribute("data-frames", "2");
    expect(working).toHaveAttribute("data-still", "false");
  });

  it("toggles Spaces through the hall goto and never writes a vault from the shell", async () => {
    const user = userEvent.setup();
    renderShell("/settings");
    await user.click(screen.getByRole("button", { name: "Spaces, Work" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/home|school");
    await vi.waitFor(async () => {
      expect(await settingsRepo.getSection()).toBe("school");
    });
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("does not import a vault writer", () => {
    const source = [appSource, railSource, dockSource, layoutSource, agentsSource].join("\n");
    expect(source).not.toMatch(/storage\/strokes|noteRepository|saveHumanEdit|humanNotes|machineNotes/);
  });
});
