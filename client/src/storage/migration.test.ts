import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { FounderOSLocalDatabase } from "./noteRepository";

const DB_NAME = "founder-os-migration-spec";

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe("Dexie vault migration", () => {
  it("splits legacy notes rows by vault", async () => {
    const legacy = new Dexie(DB_NAME);
    legacy.version(1).stores({
      notes: "id, projectId, vault, revision, updatedAt",
    });
    await legacy.table("notes").bulkAdd([
      {
        id: "HN-LEGACYHUMAN0000000000001",
        projectId: "p",
        vault: "human",
        content: "ink",
        revision: 1,
        updatedAt: "t1",
      },
      {
        id: "MN-LEGACYMACHINE00000000001",
        projectId: "p",
        vault: "machine",
        content: "report",
        revision: 1,
        updatedAt: "t2",
      },
    ]);
    legacy.close();

    const upgraded = new FounderOSLocalDatabase(DB_NAME);
    await upgraded.open();

    const human = await upgraded.humanNotes.get("HN-LEGACYHUMAN0000000000001");
    const machine = await upgraded.machineNotes.get("MN-LEGACYMACHINE00000000001");
    expect(human).toMatchObject({ content: "ink", vault: "human" });
    expect(machine).toMatchObject({ content: "report", vault: "machine" });
    expect(await upgraded.humanNotes.get("MN-LEGACYMACHINE00000000001")).toBeUndefined();
    expect(await upgraded.machineNotes.get("HN-LEGACYHUMAN0000000000001")).toBeUndefined();
    expect(await upgraded.humanRevisions.get(["HN-LEGACYHUMAN0000000000001", 1])).toMatchObject({
      content: "ink",
    });
    expect(await upgraded.humanRevisions.count()).toBe(1);
    upgraded.close();
  });
});
