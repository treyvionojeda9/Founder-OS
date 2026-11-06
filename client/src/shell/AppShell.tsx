import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import { nextGotoSeq, useRoomStamp } from "../nav/room";
import { settingsRepo } from "../storage/services";
import { AgentRail } from "./AgentRail";
import { ChatDock } from "./ChatDock";
import { railAgents, type RailAgent } from "./railAgents";
import { dockModeFor, shellDeskSearch, shellMotion } from "./shellLayout";
import "./shell.css";

type AppShellProps = {
  layout: FormFactor;
  children: ReactNode;
};

type Selection = { teamId: string; agentId: string };

/**
 * E Ink × Antigravity frame. The center is the existing room.
 * Selection stays on the shell unless the route already understands `?desk=`.
 */
export function AppShell({ layout, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const still = useStillFrame();
  const stamp = useRoomStamp();
  const agents = useMemo(() => railAgents(), []);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1600 : window.innerWidth));
  const section = stamp.room === "school" ? "school" : "work";
  const mode = dockModeFor(layout, width);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const dockOpen = mode === "column" || selection !== null;
  const selected = useMemo(() => {
    if (!selection) return null;
    return agents.find((agent) => agent.id === selection.agentId && agent.teamId === selection.teamId) ?? null;
  }, [agents, selection]);

  useEffect(() => {
    if (!selection) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (target instanceof Element && target.closest("dialog, [role='dialog']")) return;
      const inChrome = target instanceof Element && !!target.closest("[data-shell-chrome]");
      if (!inChrome && mode !== "overlay") return;
      setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, mode]);

  const select = (agent: RailAgent) => {
    setSelection({ teamId: agent.teamId, agentId: agent.id });
    const next = shellDeskSearch(location.pathname, location.search, agent.id);
    if (next == null || next === location.search) return;
    navigate({ pathname: location.pathname, search: next }, { replace: true });
  };

  const onSpaces = () => {
    const next = section === "work" ? "school" : "work";
    void settingsRepo.setSection(next).catch(() => undefined);
    navigate("/home", { state: { gotoSection: next, gotoSeq: nextGotoSeq() } });
  };

  return (
    <div
      className="app-shell"
      data-shell-frame=""
      data-dock-mode={mode}
      data-dock={dockOpen ? "open" : "closed"}
      data-motion={shellMotion(still)}
    >
      <div className="shell-center">{children}</div>
      <AgentRail
        agents={agents}
        selectedId={selected?.id ?? null}
        still={still}
        section={section}
        onSelect={select}
        onSpaces={onSpaces}
      />
      {dockOpen ? <ChatDock agent={selected} still={still} /> : null}
    </div>
  );
}
