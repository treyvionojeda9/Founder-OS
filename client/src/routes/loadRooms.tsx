import { useEffect, useState } from "react";

type TeamModule = typeof import("./TeamRoom");
type LearnModule = typeof import("./LearnStub");

let teamMod: TeamModule | null = null;
let learnMod: LearnModule | null = null;
let teamLoading: Promise<TeamModule> | null = null;
let learnLoading: Promise<LearnModule> | null = null;

export function prefetchTeamRoom() {
  teamLoading ??= import("./TeamRoom").then((mod) => {
    teamMod = mod;
    mod.primeTeamArt();
    return mod;
  });
  return teamLoading;
}

export function prefetchLearnRoom() {
  learnLoading ??= import("./LearnStub").then((mod) => {
    learnMod = mod;
    mod.primeLearnArt();
    return mod;
  });
  return learnLoading;
}

/** Warm a wing's room when a door is shown, hovered, or focused. */
export function prefetchRoom(section: "work" | "school") {
  if (section === "work") return prefetchTeamRoom();
  return prefetchLearnRoom();
}

type TeamProps = { teamId?: string; preview?: boolean };
type LearnProps = { doorId?: string; preview?: boolean };

function useTeamModule() {
  const [mod, setMod] = useState(teamMod);
  useEffect(() => {
    if (mod) return;
    let live = true;
    void prefetchTeamRoom().then((loaded) => {
      if (live) setMod(loaded);
    });
    return () => {
      live = false;
    };
  }, [mod]);
  return mod;
}

function useLearnModule() {
  const [mod, setMod] = useState(learnMod);
  useEffect(() => {
    if (mod) return;
    let live = true;
    void prefetchLearnRoom().then((loaded) => {
      if (live) setMod(loaded);
    });
    return () => {
      live = false;
    };
  }, [mod]);
  return mod;
}

export function TeamRoomReady(props: TeamProps) {
  const mod = useTeamModule();
  if (!mod) return null;
  const Room = mod.TeamRoom;
  return <Room {...props} />;
}

export function LearnRoomReady(props: LearnProps) {
  const mod = useLearnModule();
  if (!mod) return null;
  const Room = mod.LearnStub;
  return <Room {...props} />;
}
