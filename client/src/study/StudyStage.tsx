import { useEffect, useRef, type ReactNode } from "react";
import { Sprite } from "../design/Sprite";
import { deskLampFailed, deskLampOff, deskLampOn } from "../design/sprites";
import type { AgentStatus } from "../team/chatStore";
import { paintDeskPool, paintPaperWash } from "./lightPool";

export type PaperPose = "desk" | "lifted";

type StudyStageProps = {
  lampStatus: AgentStatus;
  lampScale: number;
  behind?: ReactNode;
  onDesk?: ReactNode;
  beside?: ReactNode;
  paper?: ReactNode;
  pose?: PaperPose;
  still?: boolean;
  caption?: ReactNode;
};

export function StudyStage({
  lampStatus,
  lampScale,
  behind,
  onDesk,
  beside,
  paper,
  pose = "desk",
  still = false,
  caption,
}: StudyStageProps) {
  return (
    <div className="study-stage">
      <div className="study-world">
        <div className="back-wall" aria-hidden="true" />
        <div className="floor-plane" aria-hidden="true" />
        {behind ? <div className="behind-cast">{behind}</div> : null}
        <div className="desk-rig">
          <div className="desk-top">
            <span className="plank plank-a" aria-hidden="true" />
            <span className="plank plank-b" aria-hidden="true" />
            <span className="plank plank-c" aria-hidden="true" />
            <DeskPool status={lampStatus} />
            {onDesk}
          </div>
          <div className="desk-front" aria-hidden="true">
            <span className="desk-leg leg-left" />
            <span className="desk-leg leg-right" />
          </div>
          <Lamp status={lampStatus} scale={lampScale} />
          {beside}
        </div>
      </div>
      {paper ? (
        <div className="paper-slot" data-pose={pose} data-still={still ? "true" : "false"}>
          {paper}
        </div>
      ) : null}
      {caption ? <div className="stage-caption">{caption}</div> : null}
    </div>
  );
}

export function PaperWash({ status }: { status: AgentStatus }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintPaperWash(canvas, status);
  }, [status]);
  return <canvas ref={ref} className="paper-wash sprite" aria-hidden="true" />;
}

function DeskPool({ status }: { status: AgentStatus }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintDeskPool(canvas, status);
  }, [status]);
  return <canvas ref={ref} className="desk-pool sprite" data-pool={status} aria-hidden="true" />;
}

function Lamp({ status, scale }: { status: AgentStatus; scale: number }) {
  const rows = status === "working" ? deskLampOn : status === "failed" ? deskLampFailed : deskLampOff;
  const title =
    status === "working" ? "Desk lamp, lit" : status === "failed" ? "Desk lamp, failed" : "Desk lamp, dark";
  return (
    <figure className="figure lamp-spot">
      <Sprite rows={rows} scale={scale} title={title} />
      <figcaption>{status === "working" ? "Working" : status === "failed" ? "Failed" : "Idle"}</figcaption>
    </figure>
  );
}
