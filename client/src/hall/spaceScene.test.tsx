import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { doors } from "../fixtures/doors";
import { localDb } from "../storage/services";
import { Home } from "../routes/Home";
import { SPACE_SOUND_KEY } from "./spaceSound";

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

afterEach(async () => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  localDb.close();
  await localDb.delete();
});

function renderHall() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home doors={doors} />
    </MemoryRouter>,
  );
}

describe("hall space scene", () => {
  it("swaps the backdrop with the Work/School toggle and keeps the sound pref out of the vault", async () => {
    const user = userEvent.setup();
    renderHall();

    const hall = document.querySelector(".hall");
    expect(hall).toHaveAttribute("data-space", "work");
    expect(hall).toHaveAttribute("data-lighting", "ember");
    expect(hall).toHaveAttribute("data-motion", "crossfade");
    expect(hall).toHaveAttribute("data-frames", "4");
    expect(hall).toHaveAttribute("data-space-tick", "0");
    expect(document.querySelector(".space-layer")).toHaveAttribute("data-pattern", "pools");
    expect(document.querySelector(".space-layer")).toHaveAttribute("data-lighting", "ember");
    expect(document.querySelector("canvas.vignette")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sound" }));
    expect(screen.getByRole("group", { name: "Quiet / Sound" })).toHaveAttribute("data-sound", "sound");
    expect(localStorage.getItem(SPACE_SOUND_KEY)).toBe("sound");

    await user.click(screen.getByRole("tab", { name: "School" }));
    expect(document.querySelector(".hall")).toHaveAttribute("data-space", "school");
    expect(document.querySelector(".hall")).toHaveAttribute("data-lighting", "school");
    expect(document.querySelector(".hall")).toHaveAttribute("data-space-tick", "1");
    await waitFor(() => {
      expect(document.querySelector(".space-layer[data-space='school']")).toHaveAttribute("data-pattern", "shafts");
    });
    expect(screen.getByRole("button", { name: /Reading Room/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hale Design Lab/ })).not.toBeInTheDocument();
  });

  it("cuts the toggle to one frame under reduced motion", async () => {
    matchMedia(true);
    const user = userEvent.setup();
    renderHall();
    expect(document.querySelector(".hall")).toHaveAttribute("data-motion", "cut");
    expect(document.querySelector(".hall")).toHaveAttribute("data-frames", "1");
    await user.click(screen.getByRole("tab", { name: "School" }));
    expect(document.querySelector(".hall")).toHaveAttribute("data-space", "school");
    expect(document.querySelector(".hall")).toHaveAttribute("data-frames", "1");
    expect(document.querySelector(".space-layer[data-live='out']")).toBeNull();
    expect(document.querySelectorAll(".space-layer")).toHaveLength(1);
  });
});
