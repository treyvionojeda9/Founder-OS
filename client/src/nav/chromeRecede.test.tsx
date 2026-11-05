import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { founderEmber } from "../design/palette";
import { ChromeRecede } from "./ChromeRecede";
import { LONG_PRESS_MS, SparkFlame } from "./FlamePress";
import { LEDGER_EVENT } from "./FlamePress";
import {
  CHROME_DIM_MS,
  CHROME_LEAVE_MS,
  CHROME_RESTORE_MS,
  MAIL_MOUTH_OPACITY,
  chromeFrames,
  chromeInputForLayout,
  chromeTransitionMs,
  chromeZone,
  dimChrome,
  initialRecede,
  luma,
  reduceRecede,
} from "./chromeRecede";
import logicSource from "./chromeRecede.ts?raw";
import viewSource from "./ChromeRecede.tsx?raw";

const originalMatchMedia = window.matchMedia.bind(window);
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
const originalTouch = navigator.maxTouchPoints;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: originalTouch });
  delete document.documentElement.dataset.recede;
  delete document.documentElement.dataset.chromeInput;
  delete document.documentElement.dataset.chromeFrames;
  delete document.documentElement.dataset.mailMouth;
});

function media(matches: (query: string) => boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function useDesktop(reduce = false) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  media((query) => {
    if (/prefers-reduced-motion:\s*reduce/.test(query)) return reduce;
    if (/pointer:\s*fine/.test(query)) return true;
    return false;
  });
}

function Harness() {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <button type="button" className="continue">
        Continue
      </button>
      <main className="study">
        <div className="pixel-bar">
          <button type="button">Back</button>
          <button type="button">Library</button>
          <p className="study-team">Hale</p>
        </div>
        <div className="study-scene">
          <button type="button" className="mail-mouth" data-discoverable="mouth">
            Needs you
          </button>
          <div className="desk-room">Room</div>
        </div>
      </main>
      <div className="toggle-dock">
        <button type="button">Work</button>
      </div>
      <ChromeRecede />
    </MemoryRouter>
  );
}

describe("chrome recede rules", () => {
  it("dims the desktop bar only after the pointer has been away for 400ms", () => {
    const full = initialRecede();
    const left = reduceRecede(full, { type: "leave", at: 1_000 }, "pointer");
    expect(left.pose).toBe("full");
    expect(reduceRecede(left, { type: "tick", at: 1_000 + CHROME_LEAVE_MS - 1 }, "pointer").pose).toBe("full");
    expect(reduceRecede(left, { type: "tick", at: 1_000 + CHROME_LEAVE_MS }, "pointer").pose).toBe("dim");
    const back = reduceRecede(left, { type: "enter" }, "pointer");
    expect(back).toEqual({ pose: "full", pendingLeaveAt: null });
    expect(reduceRecede(back, { type: "tick", at: 9_000 }, "pointer").pose).toBe("full");
  });

  it("ignores the other input and starts full on arrival", () => {
    const dimmed = reduceRecede(initialRecede(), { type: "tap-room" }, "tap");
    expect(dimmed.pose).toBe("dim");
    expect(reduceRecede(dimmed, { type: "tap-chrome" }, "tap").pose).toBe("full");
    expect(reduceRecede(dimmed, { type: "leave", at: 10 }, "tap")).toEqual(dimmed);
    expect(reduceRecede(initialRecede(), { type: "tap-room" }, "pointer").pose).toBe("full");
    expect(reduceRecede(dimmed, { type: "arrive" }, "tap").pose).toBe("full");
    expect(chromeInputForLayout("desktop")).toBe("pointer");
    expect(chromeInputForLayout("portrait")).toBe("tap");
    expect(chromeInputForLayout("landscape")).toBe("tap");
  });

  it("snaps in one frame when motion is reduced and restores in two otherwise", () => {
    expect(chromeFrames(true)).toBe(1);
    expect(chromeFrames(false)).toBe(2);
    expect(chromeTransitionMs("full", true)).toBe(0);
    expect(chromeTransitionMs("dim", true)).toBe(0);
    expect(chromeTransitionMs("full", false)).toBe(CHROME_RESTORE_MS);
    expect(chromeTransitionMs("dim", false)).toBe(CHROME_DIM_MS);
    expect(CHROME_RESTORE_MS).toBeLessThanOrEqual(34);
  });

  it("keeps dim labels readable in grayscale by outline, not by hue", () => {
    expect(dimChrome.ground).toBe(founderEmber.night);
    expect(dimChrome.label).toBe(founderEmber.paper);
    expect(dimChrome.outline).toBe(founderEmber.paper);
    expect(dimChrome.outline).not.toBe(founderEmber.flame);
    expect(dimChrome.outline).not.toBe(founderEmber.ember);
    expect(luma(dimChrome.label) - luma(dimChrome.ground)).toBeGreaterThanOrEqual(80);
    expect(luma(dimChrome.selected) - luma(dimChrome.ground)).toBeGreaterThanOrEqual(40);
    expect(luma(dimChrome.label) - luma(dimChrome.selected)).toBeGreaterThanOrEqual(40);
    expect(MAIL_MOUTH_OPACITY).toBe(1);
  });

  it("treats the top bar, the dock, the room, and the ledger as different zones", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="pixel-bar"><button id="back">Back</button></div>
      <div class="toggle-dock"><button id="work">Work</button></div>
      <main class="study"><div class="desk-room" id="room"></div></main>
      <div class="command-ledger"><button id="ledger">Ledger</button></div>
      <button id="splash" class="continue">Continue</button>
    `;
    expect(chromeZone(root.querySelector("#back"))).toBe("top");
    expect(chromeZone(root.querySelector("#work"))).toBe("control");
    expect(chromeZone(root.querySelector("#room"))).toBe("room");
    expect(chromeZone(root.querySelector("#ledger"))).toBe("other");
    expect(chromeZone(root.querySelector("#splash"))).toBe("other");
    expect(chromeZone(null)).toBe("other");
  });

  it("stays off both vaults", () => {
    const source = `${logicSource}\n${viewSource}`;
    expect(source).not.toMatch(/humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|noteRepo|indexedDB|fetch\(/);
  });
});

describe("chrome recede on the page", () => {
  it("dims after the pointer leaves and restores when it comes back", () => {
    vi.useFakeTimers();
    useDesktop(false);
    render(<Harness />);
    const root = document.documentElement;
    expect(root).toHaveAttribute("data-chrome-input", "pointer");
    expect(root).toHaveAttribute("data-recede", "full");
    expect(root).toHaveAttribute("data-chrome-frames", "2");
    expect(root).toHaveAttribute("data-mail-mouth", "shown");

    const back = screen.getByRole("button", { name: "Back" });
    const library = screen.getByRole("button", { name: "Library" });
    const room = document.querySelector(".desk-room");
    expect(room).toBeTruthy();

    fireEvent.pointerOut(back, { pointerType: "mouse", relatedTarget: library });
    act(() => {
      vi.advanceTimersByTime(CHROME_LEAVE_MS);
    });
    expect(root).toHaveAttribute("data-recede", "full");

    fireEvent.pointerOut(back, { pointerType: "mouse", relatedTarget: room });
    act(() => {
      vi.advanceTimersByTime(CHROME_LEAVE_MS - 1);
    });
    expect(root).toHaveAttribute("data-recede", "full");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(root).toHaveAttribute("data-recede", "dim");
    expect(screen.getByRole("button", { name: "Needs you" })).toHaveAttribute("data-discoverable", "mouth");

    fireEvent.pointerOver(back, { pointerType: "mouse", relatedTarget: room });
    expect(root).toHaveAttribute("data-recede", "full");
    act(() => {
      vi.advanceTimersByTime(CHROME_LEAVE_MS);
    });
    expect(root).toHaveAttribute("data-recede", "full");
  });

  it("snaps the frame count when motion is reduced", () => {
    useDesktop(true);
    render(<Harness />);
    expect(document.documentElement).toHaveAttribute("data-chrome-frames", "1");
    expect(chromeTransitionMs("dim", true)).toBe(0);
  });

  it("dims on a room tap, restores on a chrome control, and leaves the mail mouth up", () => {
    render(<Harness />);
    const root = document.documentElement;
    expect(root).toHaveAttribute("data-chrome-input", "tap");
    const room = document.querySelector(".desk-room");
    const mail = screen.getByRole("button", { name: "Needs you" });
    expect(room).toBeTruthy();

    fireEvent.pointerUp(screen.getByRole("button", { name: "Continue" }), { pointerType: "touch" });
    expect(root).toHaveAttribute("data-recede", "full");

    fireEvent.pointerUp(room!, { pointerType: "touch" });
    expect(root).toHaveAttribute("data-recede", "dim");
    expect(mail).toBeVisible();
    expect(mail).toHaveAttribute("data-discoverable", "mouth");

    fireEvent.pointerUp(mail, { pointerType: "touch" });
    expect(root).toHaveAttribute("data-recede", "dim");
    expect(mail).toBeVisible();

    fireEvent.pointerUp(screen.getByRole("button", { name: "Library" }), { pointerType: "touch" });
    expect(root).toHaveAttribute("data-recede", "full");

    fireEvent.pointerUp(room!, { pointerType: "touch" });
    fireEvent.pointerUp(screen.getByRole("button", { name: "Work" }), { pointerType: "touch" });
    expect(root).toHaveAttribute("data-recede", "full");
  });

  it("still opens the ledger on a long press of the flame", () => {
    vi.useFakeTimers();
    const heard = vi.fn();
    window.addEventListener(LEDGER_EVENT, heard);
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <header className="pixel-bar">
          <SparkFlame scale={2} enabled />
        </header>
        <main className="hall">
          <div className="stage">Room</div>
        </main>
        <ChromeRecede />
      </MemoryRouter>,
    );
    const room = document.querySelector(".stage");
    const flame = document.querySelector("[data-flame='spark']");
    expect(room).toBeTruthy();
    expect(flame).toBeTruthy();
    fireEvent.pointerUp(room!, { pointerType: "touch" });
    expect(document.documentElement).toHaveAttribute("data-recede", "dim");

    fireEvent.pointerDown(flame!, { pointerType: "touch", pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveAttribute("data-recede", "dim");
    fireEvent.pointerUp(flame!, { pointerType: "touch", pointerId: 1 });
    expect(document.documentElement).toHaveAttribute("data-recede", "full");
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(LEDGER_EVENT, heard);
  });
});
