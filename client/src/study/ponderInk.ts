import {
  type HumanInkAsset,
  type Note,
  type NoteRepository,
  type PrincipalRole,
} from "../storage/noteRepository";
import { isValidStroke, type Stroke, type StrokePoint } from "../storage/strokes";
import { createInkAssetId } from "../storage/ulid";
import { PONDER_PAGE_ID } from "./inkPointer";
import { joinPonderContent, splitPonderContent } from "./ponderContent";
import { ponderProjectId } from "./ponderNote";

export const INK_AUTOSAVE_MS = 200;

export type InkAssetStore = {
  saveHumanInk(asset: HumanInkAsset, principal?: PrincipalRole): Promise<void>;
  getHumanInk(id: string): Promise<HumanInkAsset | undefined>;
};

export type InkRefusal = "machine" | "invalid" | "conflict";

export type InkSaveResult =
  | { ok: true; note: Note; asset: HumanInkAsset }
  | { ok: false; reason: InkRefusal };

export function isRevisionConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("REVISION_CONFLICT");
}

export function canonicalStroke(stroke: Stroke): Stroke {
  const points = stroke.points.map((point) => {
    const next: StrokePoint = { x: point.x, y: point.y, t_ms: point.t_ms };
    if (typeof point.p === "number") next.p = point.p;
    return next;
  });
  return {
    note_id: stroke.note_id,
    page_id: stroke.page_id,
    stroke_id: stroke.stroke_id,
    points,
    tool: stroke.tool,
    color: stroke.color,
    width: stroke.width,
  };
}

export function canonicalStrokesJson(strokes: readonly Stroke[]): string {
  return JSON.stringify(strokes.map(canonicalStroke));
}

function pageIsValid(strokes: readonly Stroke[]): boolean {
  if (strokes.length === 0) return false;
  const noteId = strokes[0]?.note_id;
  if (!noteId || !noteId.startsWith("HN-")) return false;
  for (const stroke of strokes) {
    if (stroke.note_id !== noteId) return false;
    if (stroke.page_id !== PONDER_PAGE_ID) return false;
    if (stroke.tool !== "pen") return false;
    if (!isValidStroke(stroke)) return false;
  }
  return true;
}

function finiteOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function pngOrNothing(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("data:image/png")) return undefined;
  return value;
}

async function writeHumanNote(
  repo: NoteRepository,
  note: Note,
  principal: PrincipalRole,
): Promise<"ok" | "conflict"> {
  try {
    await repo.saveHumanEdit(note, principal);
    return "ok";
  } catch (error) {
    if (isRevisionConflict(error)) return "conflict";
    throw error;
  }
}

function assetFrom(
  id: string,
  noteId: string,
  strokes: readonly Stroke[],
  previewPng: string | undefined,
  pageWidth: number | undefined,
  pageHeight: number | undefined,
  updatedAt: string,
): HumanInkAsset {
  const preview = pngOrNothing(previewPng);
  return {
    id,
    noteId,
    pageId: PONDER_PAGE_ID,
    strokesJson: canonicalStrokesJson(strokes),
    pageWidth: finiteOrZero(pageWidth),
    pageHeight: finiteOrZero(pageHeight),
    updatedAt,
    ...(preview ? { previewPng: preview } : {}),
  };
}

/**
 * Human ink for one ponder page. A machine principal returns before any vault
 * call. Raw strokes are stored as an INK- asset; the human note only links to it.
 */
export async function savePonderInk(input: {
  doorId: string;
  strokes: Stroke[];
  principal: PrincipalRole;
  existing: Note | null;
  repo: NoteRepository;
  ink: InkAssetStore;
  previewPng?: string;
  pageWidth?: number;
  pageHeight?: number;
  now?: Date;
  createAssetId?: () => string;
}): Promise<InkSaveResult> {
  if (input.principal !== "human") return { ok: false, reason: "machine" };
  if (!pageIsValid(input.strokes)) return { ok: false, reason: "invalid" };
  if (input.existing && input.existing.id !== input.strokes[0]?.note_id) {
    return { ok: false, reason: "invalid" };
  }

  const noteId = input.strokes[0].note_id;
  const now = (input.now ?? new Date()).toISOString();
  const stored = await input.repo.get(noteId);
  const base = stored ?? null;
  const parts = base ? splitPonderContent(base.content) : { noteId: null, assetId: null, body: "" };
  const body = base ? parts.body : "";
  const assetId = parts.assetId ?? (input.createAssetId ?? createInkAssetId)();
  const note: Note = {
    id: noteId,
    projectId: base?.projectId ?? ponderProjectId(input.doorId),
    vault: "human",
    content: joinPonderContent(noteId, assetId, body),
    revision: base ? base.revision + 1 : 1,
    updatedAt: now,
  };
  let asset = assetFrom(assetId, noteId, input.strokes, input.previewPng, input.pageWidth, input.pageHeight, now);

  const wrote = await writeHumanNote(input.repo, note, input.principal);
  if (wrote === "conflict") {
    const latest = await input.repo.get(noteId);
    if (!latest || latest.vault !== "human") return { ok: false, reason: "conflict" };
    const latestParts = splitPonderContent(latest.content);
    const linked = latestParts.assetId ?? assetId;
    const retry: Note = {
      id: latest.id,
      projectId: latest.projectId,
      vault: "human",
      content: joinPonderContent(latest.id, linked, latestParts.body),
      revision: latest.revision + 1,
      updatedAt: now,
    };
    const again = await writeHumanNote(input.repo, retry, input.principal);
    if (again === "conflict") return { ok: false, reason: "conflict" };
    asset = assetFrom(linked, latest.id, input.strokes, input.previewPng, input.pageWidth, input.pageHeight, now);
    await input.ink.saveHumanInk(asset, input.principal);
    return { ok: true, note: retry, asset };
  }

  await input.ink.saveHumanInk(asset, input.principal);
  return { ok: true, note, asset };
}

export async function loadPonderInk(note: Note | null, ink: Pick<InkAssetStore, "getHumanInk">): Promise<HumanInkAsset | null> {
  if (!note) return null;
  const parts = splitPonderContent(note.content);
  if (!parts.assetId) return null;
  const asset = await ink.getHumanInk(parts.assetId);
  if (!asset || typeof asset.strokesJson !== "string" || asset.strokesJson.length === 0) return null;
  return asset;
}

export function strokesFromAsset(asset: HumanInkAsset | null): Stroke[] {
  if (!asset) return [];
  try {
    const parsed = JSON.parse(asset.strokesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Stroke[];
  } catch {
    return [];
  }
}
