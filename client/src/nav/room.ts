import { useSyncExternalStore } from "react";
import { teamById } from "../team/chatStore";

export type RoomId =
  | "work"
  | "school"
  | "overview"
  | "library"
  | "team"
  | "chat"
  | "learn"
  | "splash"
  | "settings"
  | "other";

export type RoomStamp = {
  room: RoomId;
  teamId: string | null;
  learnId: string | null;
};

const INITIAL: RoomStamp = { room: "other", teamId: null, learnId: null };

let stamp: RoomStamp = INITIAL;
let lastTeamId = "hale-design-lab";
let gotoSeq = 0;
const listeners = new Set<() => void>();

export function getRoom(): RoomStamp {
  return stamp;
}

export function publishRoom(next: RoomStamp) {
  if (stamp.room === next.room && stamp.teamId === next.teamId && stamp.learnId === next.learnId) return;
  stamp = next;
  if (next.teamId && teamById(next.teamId)) lastTeamId = next.teamId;
  for (const listener of listeners) listener();
}

export function subscribeRoom(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoomStamp(): RoomStamp {
  return useSyncExternalStore(subscribeRoom, getRoom, () => INITIAL);
}

/** Last work room this session. Overview, Library, and Team land here from the hall. */
export function rememberedTeam(): string {
  return teamById(lastTeamId) ? lastTeamId : "hale-design-lab";
}

export function rememberTeam(id: string) {
  if (teamById(id)) lastTeamId = id;
}

export function nextGotoSeq(): number {
  gotoSeq += 1;
  return gotoSeq;
}

export type HallGoto = { section: "work" | "school"; seq: number };
export type RoomGoto = { place: "overview" | "library" | "team"; seq: number };

export function readHallGoto(state: unknown): HallGoto | null {
  if (!state || typeof state !== "object") return null;
  const section = (state as { gotoSection?: unknown }).gotoSection;
  const seq = (state as { gotoSeq?: unknown }).gotoSeq;
  if ((section !== "work" && section !== "school") || typeof seq !== "number") return null;
  return { section, seq };
}

export function readRoomGoto(state: unknown): RoomGoto | null {
  if (!state || typeof state !== "object") return null;
  const place = (state as { gotoPlace?: unknown }).gotoPlace;
  const seq = (state as { gotoSeq?: unknown }).gotoSeq;
  if (place !== "overview" && place !== "library" && place !== "team") return null;
  if (typeof seq !== "number") return null;
  return { place, seq };
}

export function fallbackRoom(pathname: string): RoomStamp {
  if (pathname === "/") return { room: "splash", teamId: null, learnId: null };
  if (pathname === "/home") return { room: "work", teamId: null, learnId: null };
  if (pathname === "/work/overview") return { room: "overview", teamId: "hale-design-lab", learnId: null };
  if (pathname === "/work/library") return { room: "library", teamId: "hale-design-lab", learnId: null };
  if (pathname === "/school/path") return { room: "learn", teamId: null, learnId: "reading-room" };
  if (pathname === "/settings") return { room: "settings", teamId: null, learnId: null };
  const team = /^\/team\/([^/]+)/.exec(pathname);
  if (team) return { room: "chat", teamId: decodeURIComponent(team[1]), learnId: null };
  const learn = /^\/learn\/([^/]+)/.exec(pathname);
  if (learn) return { room: "learn", teamId: null, learnId: decodeURIComponent(learn[1]) };
  return { room: "other", teamId: null, learnId: null };
}

export function stampMatchesPath(current: RoomStamp, pathname: string): boolean {
  if (pathname === "/") return current.room === "splash";
  if (pathname === "/home") return current.room === "work" || current.room === "school";
  if (pathname === "/work/overview") return current.room === "overview";
  if (pathname === "/work/library") return current.room === "library";
  if (pathname === "/school/path") return current.room === "learn";
  if (pathname === "/settings") return current.room === "settings";
  const team = /^\/team\/([^/]+)/.exec(pathname);
  if (team) {
    const id = decodeURIComponent(team[1]);
    const surface =
      current.room === "overview" || current.room === "library" || current.room === "team" || current.room === "chat";
    return surface && current.teamId === id;
  }
  const learn = /^\/learn\/([^/]+)/.exec(pathname);
  if (learn) return current.room === "learn" && current.learnId === decodeURIComponent(learn[1]);
  return current.room === "other";
}

export function resetNavForTests() {
  stamp = INITIAL;
  lastTeamId = "hale-design-lab";
  gotoSeq = 0;
  for (const listener of listeners) listener();
}
