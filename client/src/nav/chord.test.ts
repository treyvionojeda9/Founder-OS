import { doors } from "../fixtures/doors";
import { teamById } from "../team/chatStore";
import { describe, expect, it } from "vitest";
import {
  CHORD_MS,
  buildLedger,
  collectSnapshot,
  isTypingTarget,
  rankLedger,
  reduceChord,
  type LedgerContext,
  type LedgerItem,
} from "./chord";
import { resetNavForTests } from "./room";
import chordSource from "./chord.ts?raw";
import chromeSource from "./GotoChrome.tsx?raw";
import flameSource from "./FlamePress.tsx?raw";

const forbidden = /humanNotes|humanRevisions|machineNotes|saveHumanEdit|saveMachineOutput|noteRepo|settle\(|toggleWorkPause|appendFounderLine/;

function ctx(over: Partial<LedgerContext> = {}): LedgerContext {
  return {
    room: "work",
    teamId: null,
    learnId: null,
    overviewSheet: false,
    librarySheet: false,
    pathOpen: false,
    hasPathBook: false,
    ponderLifted: false,
    chatLifted: false,
    staplerOpen: false,
    ...over,
  };
}

function groups(items: readonly LedgerItem[]): string[] {
  return items.map((item) => item.group);
}

describe("go-to chords", () => {
  it("arms on G and completes W S O L T inside the window", () => {
    const armed = reduceChord(null, { key: "g" }, 1_000, false);
    expect(armed.consume).toBe(true);
    expect(armed.place).toBeNull();
    expect(armed.state).toEqual({ armedAt: 1_000 });

    expect(reduceChord(armed.state, { key: "W" }, 1_400, false).place).toBe("work");
    expect(reduceChord(armed.state, { key: "s" }, 1_400, false).place).toBe("school");
    expect(reduceChord(armed.state, { key: "o" }, 1_400, false).place).toBe("overview");
    expect(reduceChord(armed.state, { key: "l" }, 1_400, false).place).toBe("library");
    expect(reduceChord(armed.state, { key: "t" }, 1_799, false).place).toBe("team");
  });

  it("drops an unfinished chord after the quiet timeout and does not swallow the late key", () => {
    const armed = reduceChord(null, { key: "G" }, 0, false);
    const late = reduceChord(armed.state, { key: "s" }, CHORD_MS + 1, false);
    expect(late.place).toBeNull();
    expect(late.consume).toBe(false);
    expect(late.state).toBeNull();
  });

  it("cancels on any other letter and lets that letter through", () => {
    const armed = reduceChord(null, { key: "g" }, 0, false);
    const next = reduceChord(armed.state, { key: "j" }, 200, false);
    expect(next.place).toBeNull();
    expect(next.consume).toBe(false);
    expect(next.state).toBeNull();
  });

  it("ignores letters while a paper, chat, or ponder field is focused", () => {
    const field = document.createElement("textarea");
    field.id = "ponder-note";
    document.body.append(field);
    const composer = document.createElement("textarea");
    composer.id = "ceo-composer";
    document.body.append(composer);
    const paper = document.createElement("input");
    paper.type = "text";
    document.body.append(paper);
    expect(isTypingTarget(field)).toBe(true);
    expect(isTypingTarget(composer)).toBe(true);
    expect(isTypingTarget(paper)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);

    const typed = reduceChord(null, { key: "g" }, 0, true);
    expect(typed.consume).toBe(false);
    expect(typed.state).toBeNull();
    const armed = reduceChord(null, { key: "g" }, 0, false);
    const inField = reduceChord(armed.state, { key: "w" }, 100, true);
    expect(inField.place).toBeNull();
    expect(inField.consume).toBe(false);
    expect(inField.state).toBeNull();
    field.remove();
    composer.remove();
    paper.remove();
  });

  it("toggles the ledger on Cmd or Ctrl K and not on a plain K", () => {
    expect(reduceChord(null, { key: "k", metaKey: true }, 0, false).ledger).toBe("toggle");
    expect(reduceChord(null, { key: "k", ctrlKey: true }, 0, true).ledger).toBe("toggle");
    expect(reduceChord(null, { key: "k" }, 0, false).ledger).toBeNull();
  });
});

describe("room-ranked ledger", () => {
  it("lists the current room before the other wings", () => {
    const hale = teamById("hale-design-lab") ?? null;
    const overview = buildLedger(ctx({ room: "overview", teamId: "hale-design-lab" }), doors, hale);
    expect(groups(overview)[0]).toBe("room");
    expect(overview[0]?.label).toBe("Open the mail slot");
    expect(overview.map((item) => item.label)).toContain("Open CEO's desk");
    expect(overview.filter((item) => item.group === "room").every((item, index) => overview[index] === item)).toBe(true);
    expect(overview.find((item) => item.label === "Overview")).toBeUndefined();
    expect(overview.find((item) => item.label === "Work hall")?.group).toBe("anywhere");

    const hall = buildLedger(ctx({ room: "work" }), doors, null);
    expect(hall.filter((item) => item.group === "room").map((item) => item.label)).toEqual([
      "Open Hale Design Lab",
      "Open Cloud Agent Team",
      "Open Local Agent Team",
    ]);
    expect(hall.find((item) => item.label === "Work hall")).toBeUndefined();
    expect(hall.find((item) => item.label === "School")?.group).toBe("anywhere");

    const school = buildLedger(ctx({ room: "school" }), doors, null);
    expect(school[0]?.label).toBe("Open Reading Room");
    expect(school.find((item) => item.label === "Open Hale Design Lab")).toBeUndefined();

    const swapped = rankLedger([...overview].reverse());
    expect(swapped[0]?.group).toBe("room");
    expect(swapped.at(-1)?.group).toBe("anywhere");
  });

  it("reads an open sheet from the page and never offers approve or a vault write", () => {
    resetNavForTests();
    document.body.innerHTML = `<div class="overview-sheet"><button class="set-down">Set it down</button><textarea></textarea></div>`;
    const snap = collectSnapshot(document, { room: "overview", teamId: "hale-design-lab", learnId: null });
    const items = buildLedger(snap, doors, teamById("hale-design-lab") ?? null);
    expect(items[0]?.label).toBe("Set the sheet down");
    expect(items.some((item) => /approve|keep this note|save this note/i.test(item.label))).toBe(false);
    expect(items.some((item) => item.action.type === "click" && /approve|keep-note|save-note/.test(item.action.selector))).toBe(
      false,
    );
    expect(`${chordSource}\n${chromeSource}\n${flameSource}`).not.toMatch(forbidden);
  });

});
