import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { doors } from "../fixtures/doors";
import { localDb, settingsRepo } from "../storage/services";
import { Home } from "./Home";

afterEach(async () => {
  cleanup();
  localDb.close();
  await localDb.delete();
});

function renderHome(items = doors) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home doors={items} />
    </MemoryRouter>,
  );
}

describe("Home hall", () => {
  it("shows the Work/School toggle only when there are two or more doors", async () => {
    const { unmount } = renderHome([doors[0]]);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hale Design Lab/ })).toBeInTheDocument();
    unmount();

    renderHome(doors);
    expect(await screen.findByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Cloud Agent Team/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reading Room/ })).not.toBeInTheDocument();
  });

  it("switches tabs with arrow keys and stores the choice in IndexedDB", async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    renderHome(doors);

    const work = await screen.findByRole("tab", { name: "Work" });
    work.focus();
    await user.keyboard("{ArrowRight}");

    const school = screen.getByRole("tab", { name: "School" });
    expect(school).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("button", { name: /Reading Room/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hale Design Lab/ })).not.toBeInTheDocument();
    await waitFor(async () => {
      expect(await settingsRepo.getSection()).toBe("school");
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    setItem.mockRestore();
  });
});
