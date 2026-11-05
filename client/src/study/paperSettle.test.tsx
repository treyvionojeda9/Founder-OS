import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PAPER_SETTLE_MS, usePaperSettle } from "./paperSettle";

function Probe({ pose, still }: { pose: "desk" | "lifted"; still: boolean }) {
  const settle = usePaperSettle(pose, still);
  return <div data-testid="sheet" data-settle={settle ?? ""} data-pose={pose} />;
}

describe("paper settle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not settle the sheet that is already on the desk", () => {
    const view = render(<Probe pose="desk" still={false} />);
    expect(view.getByTestId("sheet")).toHaveAttribute("data-settle", "");
    expect(PAPER_SETTLE_MS).toBeLessThanOrEqual(280);
    expect(PAPER_SETTLE_MS).toBeGreaterThanOrEqual(180);
  });

  it("plays one short settle on lift and on set down", () => {
    vi.useFakeTimers();
    const view = render(<Probe pose="desk" still={false} />);
    view.rerender(<Probe pose="lifted" still={false} />);
    expect(view.getByTestId("sheet")).toHaveAttribute("data-settle", "lift");
    act(() => {
      vi.advanceTimersByTime(PAPER_SETTLE_MS);
    });
    expect(view.getByTestId("sheet")).toHaveAttribute("data-settle", "");
    view.rerender(<Probe pose="desk" still={false} />);
    expect(view.getByTestId("sheet")).toHaveAttribute("data-settle", "set");
    expect(view.getByTestId("sheet")).toHaveAttribute("data-pose", "desk");
  });

  it("cuts to the new pose when motion is reduced", () => {
    const view = render(<Probe pose="desk" still />);
    view.rerender(<Probe pose="lifted" still />);
    expect(view.getByTestId("sheet")).toHaveAttribute("data-pose", "lifted");
    expect(view.getByTestId("sheet")).toHaveAttribute("data-settle", "");
  });
});
