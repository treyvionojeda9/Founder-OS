import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_MS, SparkFlame, requestLedger } from "./FlamePress";
import { LEDGER_EVENT } from "./FlamePress";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("flame long press", () => {
  it("opens the ledger after a touch hold and ignores a mouse hold", () => {
    vi.useFakeTimers();
    const heard = vi.fn();
    window.addEventListener(LEDGER_EVENT, heard);
    render(<SparkFlame scale={2} enabled />);
    const mark = document.querySelector("[data-flame='spark']");
    expect(mark).toBeTruthy();
    fireEvent.pointerDown(mark!, { pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(heard).not.toHaveBeenCalled();

    fireEvent.pointerDown(mark!, { pointerType: "touch", pointerId: 1 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    });
    expect(heard).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(LEDGER_EVENT, heard);
  });

  it("does not add a press target when the flame is only a picture", () => {
    render(<SparkFlame scale={2} enabled={false} />);
    expect(document.querySelector("[data-flame='spark']")).toBeNull();
    expect(screen.getByRole("img", { name: "Spark of Freedom flame" })).toBeInTheDocument();
  });

  it("can ask for the ledger without a button", () => {
    const heard = vi.fn();
    window.addEventListener(LEDGER_EVENT, heard);
    requestLedger();
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(LEDGER_EVENT, heard);
  });
});
