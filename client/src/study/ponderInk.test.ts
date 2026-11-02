import { afterEach, describe, expect, it, vi } from "vitest";
import type { NoteRepository } from "../storage/noteRepository";
import { localDb, noteRepo, sessionSource } from "../storage/services";
import { WP_STROKE_EXAMPLE, type Stroke } from "../storage/strokes";
import { joinPonderContent, ponderBody } from "./ponderContent";
import { keepPonderNote } from "./ponderNote";
import { canonicalStrokesJson, savePonderInk } from "./ponderInk";

afterEach(async () => {
  sessionSource.principal = "human";
  localDb.close();
  await localDb.delete();
});

function bareExample(): Stroke {
  return {
    ...WP_STROKE_EXAMPLE,
    note_id: "HN-01JEXAMPLE43",
    points: [{ x: 20.2, y: 41, t_ms: 0 }],
  };
}

describe("ponder ink vault", () => {
  it("round-trips the white paper stroke with and without pressure as byte-exact JSON", async () => {
    const withPressure = canonicalStrokesJson([WP_STROKE_EXAMPLE]);
    expect(withPressure).toBe(JSON.stringify([WP_STROKE_EXAMPLE]));
    const first = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE],
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
      previewPng: "data:image/png;base64,aaaa",
      now: new Date("2026-11-02T00:00:00.000Z"),
      createAssetId: () => "INK-000104",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.note.revision).toBe(1);
    expect(first.note.vault).toBe("human");
    expect(first.note.content).toContain("source_type: ink");
    expect(first.note.content).toContain("ink_asset: INK-000104");
    expect(first.note.content).not.toContain("data:image/png");
    expect(first.asset.strokesJson).toBe(withPressure);
    expect(first.asset.previewPng).toBe("data:image/png;base64,aaaa");
    expect(JSON.stringify(JSON.parse(first.asset.strokesJson))).toBe(withPressure);
    const stored = await noteRepo.getHumanInk("INK-000104");
    expect(stored?.strokesJson).toBe(withPressure);
    expect(await localDb.humanNotes.count()).toBe(1);
    expect(await localDb.humanRevisions.count()).toBe(1);
    expect(await localDb.machineNotes.count()).toBe(0);

    const without = bareExample();
    const withoutJson = canonicalStrokesJson([without]);
    expect(withoutJson).not.toContain('"p"');
    const second = await savePonderInk({
      doorId: "field-notes",
      strokes: [without],
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
      now: new Date("2026-11-02T00:01:00.000Z"),
      createAssetId: () => "INK-000105",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect((await noteRepo.getHumanInk("INK-000105"))?.strokesJson).toBe(withoutJson);
    expect((await noteRepo.getHumanInk("INK-000105"))?.previewPng).toBeUndefined();
  });

  it("refuses a machine principal and an invalid stroke before any vault call", async () => {
    const get = vi.spyOn(noteRepo, "get");
    const saveHuman = vi.spyOn(noteRepo, "saveHumanEdit");
    const saveInk = vi.spyOn(noteRepo, "saveHumanInk");
    const machine = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE],
      principal: "machine",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
    });
    const invalid = await savePonderInk({
      doorId: "reading-room",
      strokes: [{ ...WP_STROKE_EXAMPLE, points: [{ x: Number.NaN, y: 1, t_ms: 0 }] }],
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
    });
    expect(machine).toEqual({ ok: false, reason: "machine" });
    expect(invalid).toEqual({ ok: false, reason: "invalid" });
    expect(get).not.toHaveBeenCalled();
    expect(saveHuman).not.toHaveBeenCalled();
    expect(saveInk).not.toHaveBeenCalled();
    await localDb.open();
    expect(await localDb.humanNotes.count()).toBe(0);
    expect(await localDb.humanInk.count()).toBe(0);
    expect(await localDb.machineNotes.count()).toBe(0);
  });

  it("increments the human revision and keeps a typed line beside the ink link", async () => {
    const first = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE],
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
      now: new Date("2026-11-02T00:00:00.000Z"),
      createAssetId: () => "INK-000104",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const kept = await keepPonderNote({
      doorId: "reading-room",
      content: "A sentence beside the ink.",
      principal: "human",
      existing: first.note,
      repo: noteRepo,
      now: new Date("2026-11-02T00:02:00.000Z"),
    });
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.note.revision).toBe(2);
    expect(kept.note.content).toContain("ink_asset: INK-000104");
    expect(ponderBody(kept.note.content)).toBe("A sentence beside the ink.");
    expect((await noteRepo.getHumanInk("INK-000104"))?.strokesJson).toBe(canonicalStrokesJson([WP_STROKE_EXAMPLE]));

    const nextStroke: Stroke = {
      ...WP_STROKE_EXAMPLE,
      stroke_id: "STR-004",
      points: [{ x: 3, y: 4, t_ms: 0, p: 0.25 }],
    };
    const again = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE, nextStroke],
      principal: "human",
      existing: kept.note,
      repo: noteRepo,
      ink: noteRepo,
      now: new Date("2026-11-02T00:03:00.000Z"),
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.note.revision).toBe(3);
    expect(ponderBody(again.note.content)).toBe("A sentence beside the ink.");
    expect(await localDb.humanNotes.count()).toBe(1);
    expect(await localDb.humanRevisions.count()).toBe(3);
  });

  it("respects REVISION_CONFLICT and keeps the newer typed body", async () => {
    const first = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE],
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
      now: new Date("2026-11-02T00:00:00.000Z"),
      createAssetId: () => "INK-000104",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    let thrown = false;
    const racing: NoteRepository = {
      get: (id) => noteRepo.get(id),
      listByProject: (projectId) => noteRepo.listByProject(projectId),
      saveMachineOutput: (note, principal) => noteRepo.saveMachineOutput(note, principal),
      saveHumanEdit: async (note, principal) => {
        if (!thrown) {
          thrown = true;
          await noteRepo.saveHumanEdit({
            ...first.note,
            revision: first.note.revision + 1,
            content: joinPonderContent(first.note.id, "INK-000104", "Newer words."),
            updatedAt: "2026-11-02T00:01:00.000Z",
          });
          throw new Error("REVISION_CONFLICT");
        }
        await noteRepo.saveHumanEdit(note, principal);
      },
    };
    const secondStroke: Stroke = {
      ...WP_STROKE_EXAMPLE,
      stroke_id: "STR-004",
      points: [{ x: 1, y: 2, t_ms: 0 }],
    };
    const second = await savePonderInk({
      doorId: "reading-room",
      strokes: [WP_STROKE_EXAMPLE, secondStroke],
      principal: "human",
      existing: first.note,
      repo: racing,
      ink: noteRepo,
      now: new Date("2026-11-02T00:02:00.000Z"),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.note.revision).toBe(3);
    expect(second.note.content).toContain("Newer words.");
    expect(second.note.content).toContain("ink_asset: INK-000104");
    expect((await noteRepo.getHumanInk("INK-000104"))?.strokesJson).toBe(
      canonicalStrokesJson([WP_STROKE_EXAMPLE, secondStroke]),
    );
  });

  it("saves and reloads 5000 strokes", async () => {
    const strokes: Stroke[] = [];
    for (let i = 0; i < 5000; i += 1) {
      const point: Stroke["points"][number] = { x: i, y: i % 97, t_ms: 0 };
      const mid: Stroke["points"][number] = { x: i + 0.5, y: 1.25, t_ms: 8 };
      const end: Stroke["points"][number] = { x: i + 1, y: 0.5, t_ms: 16 };
      if (i % 7 === 0) end.p = 0.4;
      strokes.push({
        note_id: "HN-SOAK5000",
        page_id: "PAGE-01",
        stroke_id: `STR-${String(i + 1).padStart(4, "0")}`,
        points: [point, mid, end],
        tool: "pen",
        color: "#21223C",
        width: 2,
      });
    }
    const heapUsed = () => {
      const proc = globalThis as { process?: { memoryUsage?: () => { heapUsed: number } } };
      return proc.process?.memoryUsage?.().heapUsed ?? 0;
    };
    const expected = canonicalStrokesJson(strokes);
    const before = heapUsed();
    const started = performance.now();
    const saved = await savePonderInk({
      doorId: "reading-room",
      strokes,
      principal: "human",
      existing: null,
      repo: noteRepo,
      ink: noteRepo,
      now: new Date("2026-11-02T00:00:00.000Z"),
      createAssetId: () => "INK-SOAK5000",
    });
    const saveMs = performance.now() - started;
    expect(saved.ok).toBe(true);
    const loadedAt = performance.now();
    const asset = await noteRepo.getHumanInk("INK-SOAK5000");
    const loadMs = performance.now() - loadedAt;
    expect(asset?.strokesJson).toBe(expected);
    expect(JSON.parse(asset?.strokesJson ?? "[]")).toHaveLength(5000);
    const heapDelta = heapUsed() - before;
    console.info(
      `INK_SOAK ${JSON.stringify({
        strokes: 5000,
        bytes: expected.length,
        saveMs: Math.round(saveMs * 100) / 100,
        loadMs: Math.round(loadMs * 100) / 100,
        heapDeltaBytes: heapDelta,
      })}`,
    );
  }, 30_000);
});
