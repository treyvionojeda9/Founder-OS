import { afterEach, describe, expect, it, vi } from "vitest";
import { learningPathFor } from "../fixtures/learning";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import type { Note } from "../storage/noteRepository";
import { pathMapFor } from "../study/pathMap";
import { fallbackRoom, rememberTeam, resetNavForTests, stampMatchesPath } from "./room";
import linkSource from "./deepLink.ts?raw";
import copySource from "./CopyLink.tsx?raw";
import {
  agentFocus,
  copyText,
  deepPath,
  focusNode,
  pickSchoolDoor,
  pickWorkTeam,
  readDeepRequest,
  resolveLibraryNote,
  schoolDoorForNode,
} from "./deepLink";

afterEach(async () => {
  resetNavForTests();
  sessionSource.principal = "human";
  vi.restoreAllMocks();
  localDb.close();
  await localDb.delete();
});

function human(partial: Partial<Note> & Pick<Note, "id" | "content">): Note {
  return {
    projectId: "work:hale-design-lab",
    vault: "human",
    revision: 1,
    updatedAt: "2026-10-29T12:00:00.000Z",
    ...partial,
  };
}

describe("deep link addresses", () => {
  it("reads the work and school paths, and the same params on the existing rooms", () => {
    expect(readDeepRequest("/work/overview", "?agent=atelier")).toEqual({
      surface: "overview",
      rawId: "atelier",
      boundId: null,
    });
    expect(readDeepRequest("/work/library", "?note=HN-KEPT01")).toEqual({
      surface: "library",
      rawId: "HN-KEPT01",
      boundId: null,
    });
    expect(readDeepRequest("/school/path", "?node=task-one-page")).toEqual({
      surface: "path",
      rawId: "task-one-page",
      boundId: null,
    });
    expect(readDeepRequest("/team/cloud-agent-team", "?agent=relay")).toEqual({
      surface: "overview",
      rawId: "relay",
      boundId: "cloud-agent-team",
    });
    expect(readDeepRequest("/learn/field-notes", "", "#node=task-notice")).toEqual({
      surface: "path",
      rawId: "task-notice",
      boundId: "field-notes",
    });
    expect(readDeepRequest("/work/overview", "", "#agent=atelier")).toEqual({
      surface: "overview",
      rawId: "atelier",
      boundId: null,
    });
    expect(readDeepRequest("/home", "?agent=ceo")).toBeNull();
    expect(readDeepRequest("/work/overview", "?desk=ceo")).toEqual({
      surface: "overview",
      rawId: "ceo",
      boundId: null,
    });
    expect(readDeepRequest("/team/hale-design-lab", "?desk=atelier")).toEqual({
      surface: "overview",
      rawId: "atelier",
      boundId: "hale-design-lab",
    });
    expect(readDeepRequest("/work/overview", "?agent=ceo&desk=atelier")).toEqual({
      surface: "overview",
      rawId: "ceo",
      boundId: null,
    });
  });

  it("keeps the room stamp on the deep paths", () => {
    expect(fallbackRoom("/work/overview").room).toBe("overview");
    expect(fallbackRoom("/work/library").room).toBe("library");
    expect(fallbackRoom("/school/path")).toEqual({ room: "learn", teamId: null, learnId: "reading-room" });
    expect(stampMatchesPath({ room: "overview", teamId: "cloud-agent-team", learnId: null }, "/work/overview")).toBe(true);
    expect(stampMatchesPath({ room: "library", teamId: "hale-design-lab", learnId: null }, "/work/library")).toBe(true);
    expect(stampMatchesPath({ room: "learn", teamId: null, learnId: "field-notes" }, "/school/path")).toBe(true);
    expect(stampMatchesPath({ room: "chat", teamId: "hale-design-lab", learnId: null }, "/work/overview")).toBe(false);
  });

  it("treats a blank, huge, or unsafe id as no focus and still names the room", () => {
    expect(readDeepRequest("/work/overview", "?agent=")).toEqual({
      surface: "overview",
      rawId: null,
      boundId: null,
    });
    expect(readDeepRequest("/work/library", "?note=%3Cscript%3E")).toEqual({
      surface: "library",
      rawId: null,
      boundId: null,
    });
    expect(readDeepRequest("/school/path", `?node=${"n".repeat(81)}`)?.rawId).toBeNull();
    expect(readDeepRequest("/school/path", "")?.surface).toBe("path");
  });

  it("builds the canonical copy path", () => {
    expect(deepPath("agent", "ceo")).toBe("/work/overview?agent=ceo");
    expect(deepPath("note", "HN-KEPT01")).toBe("/work/library?note=HN-KEPT01");
    expect(deepPath("node", "task-one-page")).toBe("/school/path?node=task-one-page");
  });

  it("picks the only team that seats an agent, and the home team when the id is missing", () => {
    expect(pickWorkTeam("relay", null)).toBe("cloud-agent-team");
    expect(pickWorkTeam("atelier", null)).toBe("hale-design-lab");
    expect(pickWorkTeam("missing", null)).toBe("hale-design-lab");
    expect(agentFocus("hale-design-lab", "atelier")).toBe("atelier");
    expect(agentFocus("hale-design-lab", "relay")).toBeNull();
    expect(agentFocus("cloud-agent-team", "ceo")).toBe("ceo");
    rememberTeam("cloud-agent-team");
    expect(pickWorkTeam("ceo", null)).toBe("cloud-agent-team");
    expect(pickWorkTeam("ceo", "local-agent-team")).toBe("local-agent-team");
  });

  it("finds a school door from a station and leaves an unknown station unfocused", () => {
    expect(schoolDoorForNode("task-notice")).toBe("field-notes");
    expect(schoolDoorForNode("assign-margin")).toBe("reading-room");
    expect(schoolDoorForNode("no-such-station")).toBeNull();
    expect(pickSchoolDoor("task-notice", null)).toBe("field-notes");
    expect(pickSchoolDoor("no-such-station", null)).toBe("reading-room");
    expect(pickSchoolDoor("task-one-page", "field-notes")).toBe("field-notes");
    expect(focusNode("task-notice", "field-notes")).toBe("task-notice");
    expect(focusNode("task-one-page", "field-notes")).toBeNull();
    expect(focusNode(null, "reading-room")).toBeNull();
    const reading = learningPathFor("reading-room");
    expect(reading && pathMapFor(reading).stations.some((station) => station.id === "task-one-page")).toBe(true);
  });

  it("opens a human work note and refuses missing, machine, and school notes without saving", async () => {
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");
    await noteRepo.saveHumanEdit(human({ id: "HN-KEPT01", content: "A kept margin." }), "human");
    await noteRepo.saveHumanEdit(
      human({ id: "HN-CLOUD1", projectId: "work:cloud-agent-team", content: "Cloud margin." }),
      "human",
    );
    await noteRepo.saveHumanEdit(
      human({ id: "HN-SCHOOL", projectId: "school:reading-room", content: "Ponder line." }),
      "human",
    );
    await noteRepo.saveMachineOutput(
      {
        id: "MN-MACHINE1",
        projectId: "work:hale-design-lab",
        vault: "machine",
        content: "Generated.",
        revision: 1,
        updatedAt: "2026-10-29T12:00:00.000Z",
      },
      "machine",
    );
    saveHuman.mockClear();
    saveMachine.mockClear();

    await expect(resolveLibraryNote("HN-KEPT01", null, noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: "HN-KEPT01",
    });
    await expect(resolveLibraryNote("HN-CLOUD1", null, noteRepo)).resolves.toEqual({
      teamId: "cloud-agent-team",
      noteId: "HN-CLOUD1",
    });
    await expect(resolveLibraryNote("HN-CLOUD1", "hale-design-lab", noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: null,
    });
    await expect(resolveLibraryNote("HN-MISSING", null, noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: null,
    });
    await expect(resolveLibraryNote("HN-SCHOOL", null, noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: null,
    });
    await expect(resolveLibraryNote("MN-MACHINE1", null, noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: null,
    });
    await expect(resolveLibraryNote(null, null, noteRepo)).resolves.toEqual({
      teamId: "hale-design-lab",
      noteId: null,
    });
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(3);
    expect(await localDb.machineNotes.count()).toBe(1);
  });

  it("copies through the clipboard and does not write a vault", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await expect(copyText("http://localhost/work/overview?agent=ceo")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("http://localhost/work/overview?agent=ceo");
    expect(linkSource).not.toMatch(/saveHumanEdit|saveMachineOutput|humanNotes|machineNotes/);
    expect(copySource).not.toMatch(/saveHumanEdit|saveMachineOutput|noteRepo|Approve|humanNotes/);
  });
});
