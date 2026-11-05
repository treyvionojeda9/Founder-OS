import type { Door } from "../fixtures/doors";
import type { TeamRecord } from "../team/chatStore";
import type { RoomId, RoomStamp } from "./room";

/** Quiet arm window. An unfinished chord clears itself and shows nothing. */
export const CHORD_MS = 800;

export type GotoPlace = "work" | "school" | "overview" | "library" | "team";

export type ChordState = { armedAt: number } | null;

export type ChordKey = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
};

export type ChordResult = {
  state: ChordState;
  place: GotoPlace | null;
  /** Swallow the key. A cancelled chord does not swallow the second key. */
  consume: boolean;
  ledger: "toggle" | null;
};

const PLACES: Record<string, GotoPlace> = {
  w: "work",
  s: "school",
  o: "overview",
  l: "library",
  t: "team",
};

/**
 * Paper, chat, and ponder fields keep their letters.
 * Buttons and switches are not typing, so a chord can still start from them.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
  const input = target.closest("input");
  if (!(input instanceof HTMLInputElement)) return false;
  const type = (input.type || "text").toLowerCase();
  return !["button", "checkbox", "radio", "submit", "reset", "file", "range", "color"].includes(type);
}

export function reduceChord(state: ChordState, event: ChordKey, now: number, typing: boolean): ChordResult {
  const key = event.key;
  const command =
    (key === "k" || key === "K") &&
    !!(event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat;
  if (command) {
    return { state: null, place: null, consume: true, ledger: "toggle" };
  }

  // A letter meant for a field ends the chord and is left alone.
  if (typing || event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return { state: null, place: null, consume: false, ledger: null };
  }

  const letter = key.length === 1 ? key.toLowerCase() : "";
  if (letter === "g") {
    return { state: { armedAt: now }, place: null, consume: true, ledger: null };
  }

  const armed = !!state && now - state.armedAt <= CHORD_MS;
  if (!armed) {
    return { state: null, place: null, consume: false, ledger: null };
  }

  const place = PLACES[letter];
  if (!place) {
    return { state: null, place: null, consume: false, ledger: null };
  }
  return { state: null, place, consume: true, ledger: null };
}

export type LedgerGroup = "room" | "anywhere";

export type LedgerAction =
  | { type: "goto"; place: GotoPlace }
  | { type: "href"; to: "/home" | "/settings" }
  | { type: "click"; selector: string }
  | { type: "focus"; selector: string };

export type LedgerItem = {
  id: string;
  label: string;
  hint: string;
  group: LedgerGroup;
  action: LedgerAction;
};

export type LedgerContext = RoomStamp & {
  overviewSheet: boolean;
  librarySheet: boolean;
  pathOpen: boolean;
  hasPathBook: boolean;
  ponderLifted: boolean;
  chatLifted: boolean;
  staplerOpen: boolean;
};

export const GOTO_COPY: Record<GotoPlace, { label: string; hint: string }> = {
  work: { label: "Work hall", hint: "G then W" },
  school: { label: "School", hint: "G then S" },
  overview: { label: "Overview", hint: "G then O" },
  library: { label: "Library", hint: "G then L" },
  team: { label: "Team", hint: "G then T" },
};

const ANYWHERE: readonly GotoPlace[] = ["work", "school", "overview", "library", "team"];

export function roomHeading(room: RoomId): string {
  switch (room) {
    case "work":
      return "Work hall";
    case "school":
      return "School";
    case "overview":
      return "Overview";
    case "library":
      return "Library";
    case "team":
      return "Team";
    case "chat":
    case "learn":
      return "This desk";
    case "splash":
      return "Splash";
    case "settings":
      return "Settings";
    default:
      return "This room";
  }
}

/** Room rows first, then the same global wings. Order inside a group stays put. */
export function rankLedger(items: readonly LedgerItem[]): LedgerItem[] {
  return [...items.filter((item) => item.group === "room"), ...items.filter((item) => item.group === "anywhere")];
}

function item(
  id: string,
  label: string,
  hint: string,
  group: LedgerGroup,
  action: LedgerAction,
): LedgerItem {
  return { id, label, hint, group, action };
}

function roomItems(ctx: LedgerContext, doors: readonly Door[], team: TeamRecord | null): LedgerItem[] {
  if (ctx.room === "work" || ctx.room === "school") {
    return doors
      .filter((door) => door.section === ctx.room)
      .map((door) =>
        item(`door-${door.id}`, `Open ${door.name}`, "Door", "room", {
          type: "click",
          selector: `[data-door-id="${door.id}"]`,
        }),
      );
  }

  if (ctx.room === "overview" && team) {
    if (ctx.overviewSheet) {
      return [
        item("set-sheet", "Set the sheet down", "Paper", "room", {
          type: "click",
          selector: ".overview-sheet .set-down",
        }),
        item("focus-sheet", "Focus the paper", "Paper", "room", {
          type: "focus",
          selector: ".overview-sheet textarea",
        }),
      ];
    }
    return [
      item("mail-slot", "Open the mail slot", "Needs you", "room", {
        type: "click",
        selector: ".mail-mouth",
      }),
      ...team.agents.map((agent) =>
        item(`desk-${agent.id}`, `Open ${agent.name}'s desk`, "Desk", "room", {
          type: "click",
          selector: `.agent-desk[data-agent="${agent.id}"]`,
        }),
      ),
    ];
  }

  if (ctx.room === "library") {
    if (ctx.librarySheet) {
      return [
        item("set-sheet", "Set it down", "Paper", "room", {
          type: "click",
          selector: ".library-paper .set-down",
        }),
        item("focus-note", "Focus your note", "Paper", "room", {
          type: "focus",
          selector: "#shelf-note",
        }),
      ];
    }
    return [
      item("place-sheet", "Place a sheet", "Shelf", "room", {
        type: "click",
        selector: ".place-sheet",
      }),
    ];
  }

  if (ctx.room === "team" && team) {
    return [
      ...team.agents.map((agent) =>
        item(`plaque-${agent.id}`, `Open ${agent.name}`, "Plaque", "room", {
          type: "click",
          selector: `.plaque[data-agent="${agent.id}"]`,
        }),
      ),
      item("stapler", ctx.staplerOpen ? "Close the stapler" : "Open the stapler", "Tools", "room", {
        type: "click",
        selector: ".stapler",
      }),
    ];
  }

  if (ctx.room === "chat") {
    const rows = [
      item("focus-message", "Focus the message", "Paper", "room", {
        type: "focus",
        selector: ".study textarea",
      }),
    ];
    if (ctx.chatLifted) {
      rows.unshift(
        item("set-paper", "Set it down", "Paper", "room", {
          type: "click",
          selector: ".study[data-room='team'] .set-down",
        }),
      );
    }
    return rows;
  }

  if (ctx.room === "learn") {
    const rows: LedgerItem[] = [];
    if (ctx.pathOpen) {
      rows.push(
        item("close-book", "Close the book", "Path", "room", {
          type: "click",
          selector: ".path-panel .sheet-close",
        }),
      );
    } else if (ctx.hasPathBook) {
      rows.push(
        item("open-path", "Open the current path", "Book", "room", {
          type: "click",
          selector: ".book-prop",
        }),
      );
    }
    if (ctx.ponderLifted) {
      rows.push(
        item("focus-ponder", "Focus the ponder note", "Paper", "room", {
          type: "focus",
          selector: "#ponder-note",
        }),
        item("set-ponder", "Set it down", "Paper", "room", {
          type: "click",
          selector: ".learn-room .set-down",
        }),
      );
    } else {
      rows.push(
        item("lift-ponder", "Lift the ponder sheet", "Paper", "room", {
          type: "click",
          selector: ".learn-room .paper-log",
        }),
      );
    }
    return rows;
  }

  if (ctx.room === "splash") {
    return [
      item("continue", "Continue", "Enter", "room", { type: "click", selector: ".splash .continue" }),
    ];
  }

  if (ctx.room === "settings") {
    return [item("back-hall", "Back to the hall", "Hall", "room", { type: "href", to: "/home" })];
  }

  return [];
}

/**
 * Commands that already exist on this page, then the five wings.
 * Nothing here approves, and nothing writes a Human or Machine Vault.
 */
export function buildLedger(ctx: LedgerContext, doors: readonly Door[], team: TeamRecord | null): LedgerItem[] {
  const here: GotoPlace | null =
    ctx.room === "work" || ctx.room === "school" || ctx.room === "overview" || ctx.room === "library" || ctx.room === "team"
      ? ctx.room
      : null;
  const anywhere = ANYWHERE.filter((place) => place !== here).map((place) =>
    item(`goto-${place}`, GOTO_COPY[place].label, GOTO_COPY[place].hint, "anywhere", { type: "goto", place }),
  );
  if (ctx.room !== "settings") {
    anywhere.push(item("settings", "Settings", "Page", "anywhere", { type: "href", to: "/settings" }));
  }
  return rankLedger([...roomItems(ctx, doors, team), ...anywhere]);
}

/** Read the fixtures that are actually on the page. The stamp says which room ranked first. */
export function collectSnapshot(root: ParentNode, stamp: RoomStamp): LedgerContext {
  const stapler = root.querySelector(".team-board .stapler");
  return {
    ...stamp,
    overviewSheet: !!root.querySelector(".overview-sheet"),
    librarySheet: !!root.querySelector(".library-paper"),
    pathOpen: !!root.querySelector("dialog.path-panel[open]"),
    hasPathBook: !!root.querySelector(".learn-room .book-prop"),
    ponderLifted: !!root.querySelector("#ponder-note"),
    chatLifted: stamp.room === "chat" && !!root.querySelector(".study[data-room='team'][data-paper='lifted'] .set-down"),
    staplerOpen: stapler?.getAttribute("aria-expanded") === "true",
  };
}
