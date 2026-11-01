import { learningPathFor, learningPaths } from "../fixtures/learning";
import type { NoteRepository } from "../storage/noteRepository";
import { pathMapFor } from "../study/pathMap";
import { workProjectId } from "../library/shelfNote";
import { listTeams, teamById } from "../team/chatStore";
import { rememberedTeam } from "./room";

/**
 * In-app addresses for one agent, one Human Vault note, or one school station.
 * A link only opens a room. It never writes a vault and it never approves.
 */

export const DEFAULT_WORK_TEAM = "hale-design-lab";
export const DEFAULT_SCHOOL_DOOR = "reading-room";

export type DeepKind = "agent" | "note" | "node";

export type DeepSurface = "overview" | "library" | "path";

export type DeepRequest = {
  surface: DeepSurface;
  /** Trimmed id from the query or hash. Null when the param is absent or unsafe. */
  rawId: string | null;
  /** Team or school door already named by `/team/:id` or `/learn/:id`. */
  boundId: string | null;
};

const OVERVIEW = /^\/work\/overview\/?$/;
const LIBRARY = /^\/work\/library\/?$/;
const PATH = /^\/school\/path\/?$/;
const TEAM = /^\/team\/([^/]+)\/?$/;
const LEARN = /^\/learn\/([^/]+)\/?$/;

/** Ids are fixture keys or HN- ulids. Anything else is treated as missing. */
function cleanId(value: string | null): string | null {
  if (value == null) return null;
  const id = value.trim();
  if (!id || id.length > 80) return null;
  if (!/^[\w.-]+$/.test(id)) return null;
  return id;
}

function readParam(search: string, hash: string, key: string): string | null {
  const fromSearch = cleanId(new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(key));
  if (fromSearch) return fromSearch;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || raw.startsWith("/")) return null;
  return cleanId(new URLSearchParams(raw).get(key));
}

export function readDeepRequest(pathname: string, search: string, hash = ""): DeepRequest | null {
  const agent = readParam(search, hash, "agent");
  const note = readParam(search, hash, "note");
  const node = readParam(search, hash, "node");

  if (OVERVIEW.test(pathname)) return { surface: "overview", rawId: agent, boundId: null };
  if (LIBRARY.test(pathname)) return { surface: "library", rawId: note, boundId: null };
  if (PATH.test(pathname)) return { surface: "path", rawId: node, boundId: null };

  const team = TEAM.exec(pathname);
  if (team) {
    const boundId = decodeURIComponent(team[1] ?? "");
    if (note) return { surface: "library", rawId: note, boundId };
    if (agent) return { surface: "overview", rawId: agent, boundId };
    return null;
  }

  const learn = LEARN.exec(pathname);
  if (learn && (node || hash.includes("node=") || search.includes("node="))) {
    return { surface: "path", rawId: node, boundId: decodeURIComponent(learn[1] ?? "") };
  }
  return null;
}

/** Canonical shareable path. The copy pin always writes this shape. */
export function deepPath(kind: DeepKind, id: string): string {
  const safe = encodeURIComponent(id);
  if (kind === "agent") return `/work/overview?agent=${safe}`;
  if (kind === "note") return `/work/library?note=${safe}`;
  return `/school/path?node=${safe}`;
}

export function shareUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const origin = window.location?.origin;
  if (!origin || origin === "null") return path;
  return `${origin}${path}`;
}

export async function copyText(text: string): Promise<boolean> {
  const clip = navigator.clipboard;
  if (clip?.writeText) {
    try {
      await clip.writeText(text);
      return true;
    } catch {
      /* The page can still copy through a hidden field. */
    }
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "0";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function workTeamsForAgent(agentId: string): string[] {
  return listTeams()
    .filter((team) => team.agents.some((agent) => agent.id === agentId))
    .map((team) => team.id);
}

export function pickWorkTeam(agentId: string | null, boundId: string | null): string {
  if (boundId && teamById(boundId)) return boundId;
  const remembered = rememberedTeam();
  const home = teamById(remembered) ? remembered : DEFAULT_WORK_TEAM;
  if (!agentId) return home;
  const hits = workTeamsForAgent(agentId);
  if (hits.length === 0) return home;
  if (hits.length === 1) return hits[0] ?? home;
  if (hits.includes(remembered)) return remembered;
  return hits[0] ?? home;
}

export function agentFocus(teamId: string, agentId: string | null): string | null {
  if (!agentId) return null;
  const team = teamById(teamId);
  if (!team?.agents.some((agent) => agent.id === agentId)) return null;
  return agentId;
}

export function stationIds(doorId: string): string[] {
  const path = learningPathFor(doorId);
  if (!path) return [];
  return pathMapFor(path).stations.map((station) => station.id);
}

export function schoolDoorForNode(nodeId: string): string | null {
  for (const path of learningPaths) {
    if (stationIds(path.doorId).includes(nodeId)) return path.doorId;
  }
  return null;
}

export function pickSchoolDoor(nodeId: string | null, boundId: string | null): string {
  if (boundId && learningPathFor(boundId)) return boundId;
  if (nodeId) {
    const door = schoolDoorForNode(nodeId);
    if (door) return door;
  }
  return DEFAULT_SCHOOL_DOOR;
}

export function focusNode(nodeId: string | null, doorId: string): string | null {
  if (!nodeId) return null;
  return stationIds(doorId).includes(nodeId) ? nodeId : null;
}

export type LibraryTarget = {
  teamId: string;
  noteId: string | null;
};

/**
 * Read one shelf note. Missing, machine, and school notes leave focus empty.
 * This function does not save.
 */
export async function resolveLibraryNote(
  rawId: string | null,
  boundId: string | null,
  repo: NoteRepository,
): Promise<LibraryTarget> {
  const home = pickWorkTeam(null, boundId);
  if (!rawId) return { teamId: home, noteId: null };
  let note: Awaited<ReturnType<NoteRepository["get"]>>;
  try {
    note = await repo.get(rawId);
  } catch {
    return { teamId: home, noteId: null };
  }
  if (!note || note.vault !== "human" || !note.id.startsWith("HN-")) return { teamId: home, noteId: null };
  const owner = teamById(note.projectId.startsWith("work:") ? note.projectId.slice("work:".length) : "");
  if (!owner || note.projectId !== workProjectId(owner.id)) return { teamId: home, noteId: null };
  if (boundId && owner.id !== boundId) return { teamId: home, noteId: null };
  return { teamId: owner.id, noteId: note.id };
}
