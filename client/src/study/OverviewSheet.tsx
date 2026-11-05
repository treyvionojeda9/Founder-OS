import type { ReactNode } from "react";
import { StatusFrame } from "../design/StatusFrame";
import { CopyLink } from "../nav/CopyLink";
import type { AgentStatus } from "../team/chatStore";
import { PaperWash } from "./StudyStage";
import { WorkingLamp } from "./WorkingLamp";

type OverviewSheetProps = {
  agentId: string;
  status: AgentStatus;
  paused: boolean;
  still: boolean;
  lampScale: number;
  onSetDown: () => void;
  children: ReactNode;
};

/**
 * The desk paper, opened over the Overview room.
 * Night dither is the plaster fill. Founder Ember only. Reduced motion is one frame.
 * Pause is not this sheet: the lamp chain on the desk halts work, and this view never approves.
 */
export function OverviewSheet({ agentId, status, paused, still, lampScale, onSetDown, children }: OverviewSheetProps) {
  const halted = paused;
  return (
    <div
      className="overview-sheet study-stage"
      data-material="plaster"
      data-still={still ? "true" : "false"}
      data-work={halted ? "halted" : "live"}
      data-paused={halted ? "true" : "false"}
      role="region"
      aria-label="Desk paper"
    >
      <figure className="overview-sheet-lamp">
        <WorkingLamp status={status} scale={lampScale} still={still || halted} />
        <StatusFrame status={status} still={still} />
      </figure>
      <div className="paper-slot" data-pose="expanded" data-still={still ? "true" : "false"}>
        <div className={status === "working" && !halted ? "paper is-lit" : "paper"}>
          <CopyLink kind="agent" id={agentId} />
          <PaperWash status={halted ? "idle" : status} />
          <button type="button" className="set-down" onClick={onSetDown}>
            Set it down
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
