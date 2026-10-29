import { afterEach, describe, expect, it, vi } from "vitest";
import source from "./chatStore.ts?raw";
import { localDb, noteRepo } from "../storage/services";
import {
  appendFounderLine,
  isMachineLine,
  listTeams,
  resetChatForTests,
  teamById,
  transcriptFor,
} from "./chatStore";

afterEach(async () => {
  resetChatForTests();
  vi.restoreAllMocks();
  localDb.close();
  await localDb.delete();
});

describe("team chat store", () => {
  it("stamps every machine line and keeps founder lines as chat history", () => {
    for (const team of listTeams()) {
      const lines = transcriptFor(team.id);
      const machine = lines.filter(isMachineLine);
      expect(machine.length).toBeGreaterThan(0);
      for (const line of machine) {
        expect(line.record).toBe("machine");
        expect(line.source.length).toBeGreaterThan(0);
        expect(line.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(line).not.toHaveProperty("vault");
      }
      for (const line of lines) {
        if (!isMachineLine(line)) {
          expect(line.record).toBe("chat");
          expect(line.author).toBe("founder");
        }
      }
    }
    const hale = teamById("hale-design-lab");
    expect(hale?.agents.map((agent) => agent.status)).toEqual(["working", "idle", "failed"]);
    expect(transcriptFor("hale-design-lab").some((line) => isMachineLine(line) && line.action)).toBe(true);
  });

  it("appends a founder line without touching the human vault table", async () => {
    await localDb.open();
    const humanPut = vi.spyOn(localDb.humanNotes, "put");
    const humanAdd = vi.spyOn(localDb.humanNotes, "add");
    const humanBulk = vi.spyOn(localDb.humanNotes, "bulkPut");
    const revisionPut = vi.spyOn(localDb.humanRevisions, "put");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveMachine = vi.spyOn(noteRepo, "saveMachineOutput");

    const line = appendFounderLine("hale-design-lab", "Leave this on the desk.");

    expect(line.record).toBe("chat");
    expect(line).not.toHaveProperty("vault");
    expect(transcriptFor("hale-design-lab").at(-1)?.body).toBe("Leave this on the desk.");
    expect(humanPut).not.toHaveBeenCalled();
    expect(humanAdd).not.toHaveBeenCalled();
    expect(humanBulk).not.toHaveBeenCalled();
    expect(revisionPut).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveMachine).not.toHaveBeenCalled();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.humanRevisions.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("has no human-vault write path in the chat store", () => {
    expect(source).not.toMatch(/humanNotes|humanRevisions|saveHumanEdit|vault:\s*"human"/);
  });
});
