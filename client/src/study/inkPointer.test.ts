import { describe, expect, it } from "vitest";
import { grayscaleGrid } from "../design/spriteGrid";
import { schoolAccent } from "../design/palette";
import { isValidStroke } from "../storage/strokes";
import {
  PONDER_INK_COLOR,
  buildPenStroke,
  idleInkAdapter,
  stepInkPointer,
  type InkPointerInput,
  type InkView,
} from "./inkPointer";

const view: InkView = { frameLeft: 10, frameTop: 20, panX: 5, panY: 7 };

function pointer(partial: Partial<InkPointerInput>): InkPointerInput {
  return {
    phase: "down",
    pointerId: 1,
    pointerType: "pen",
    buttons: 1,
    clientX: 30,
    clientY: 50,
    timeStamp: 1000,
    pressure: 0.4,
    coalesced: [],
    ...partial,
  };
}

describe("ink pointer adapter", () => {
  it("draws pen and mouse in page coordinates and lets touch pan", () => {
    const down = stepInkPointer(idleInkAdapter(), pointer({}), view);
    expect(down.added).toEqual([{ x: 15, y: 23, t_ms: 0, p: 0.4 }]);
    expect(down.finished).toBeNull();

    const move = stepInkPointer(
      down.state,
      pointer({
        phase: "move",
        timeStamp: 1016,
        pressure: 0.5,
        clientX: 40,
        clientY: 60,
        coalesced: [
          { clientX: 34, clientY: 54, timeStamp: 1008, pressure: 0.7 },
          { clientX: 40, clientY: 60, timeStamp: 1004, pressure: 0.2 },
        ],
      }),
      view,
    );
    expect(move.added.map((point) => point.t_ms)).toEqual([8, 8]);
    expect(move.added[0]).toMatchObject({ x: 19, y: 27, p: 0.7 });
    expect(move.added[1]).toEqual({ x: 25, y: 33, t_ms: 8, p: 0.2 });
    expect("p" in (move.added[0] ?? {})).toBe(true);

    const up = stepInkPointer(move.state, pointer({ phase: "up", timeStamp: 1024, pressure: 0.5, clientX: 42, clientY: 61 }), view);
    expect(up.finished).not.toBeNull();
    const finished = up.finished ?? [];
    expect(finished[0]).toMatchObject({ p: 0.4 });
    expect(finished.some((point) => point.p === 0.5)).toBe(false);
    const stroke = buildPenStroke({ noteId: "HN-01JEXAMPLE42", strokeId: "STR-003", points: finished });
    expect(stroke && isValidStroke(stroke)).toBe(true);
    expect(stroke?.color).toBe(PONDER_INK_COLOR);
    expect(stroke?.color).toBe(schoolAccent.ink);

    let mouse = stepInkPointer(idleInkAdapter(), pointer({ pointerType: "mouse", pointerId: 2, pressure: 0.5, timeStamp: 0 }), view);
    mouse = stepInkPointer(
      mouse.state,
      pointer({ phase: "up", pointerType: "mouse", pointerId: 2, pressure: 0.5, timeStamp: 12, clientX: 31, clientY: 52 }),
      view,
    );
    expect(mouse.finished?.every((point) => !("p" in point))).toBe(true);
    expect(buildPenStroke({ noteId: "HN-01JEXAMPLE42", strokeId: "STR-004", points: mouse.finished ?? [] })).not.toBeNull();

    const touchDown = stepInkPointer(idleInkAdapter(), pointer({ pointerType: "touch", pointerId: 4, clientX: 10, clientY: 10 }), view);
    expect(touchDown.added).toEqual([]);
    expect(touchDown.state.draw).toBeNull();
    const touchMove = stepInkPointer(
      touchDown.state,
      pointer({ phase: "move", pointerType: "touch", pointerId: 4, clientX: 28, clientY: 16 }),
      view,
    );
    expect(touchMove.added).toEqual([]);
    expect(touchMove.finished).toBeNull();
    expect(touchMove.panX).toBe(view.panX + 18);
    expect(touchMove.panY).toBe(view.panY + 6);

    const palm = stepInkPointer(down.state, pointer({ phase: "move", pointerType: "touch", pointerId: 9, clientX: 80, clientY: 80 }), view);
    expect(palm.panX).toBe(view.panX);
    expect(palm.added).toEqual([]);
    expect(palm.state.draw).not.toBeNull();
  });

  it("keeps ink darker than the paper in grayscale", () => {
    const ink = grayscaleGrid(["i"])[0]?.[0] ?? 0;
    const paper = grayscaleGrid(["p"])[0]?.[0] ?? 0;
    expect(paper).toBeGreaterThan(ink + 40);
  });
});
