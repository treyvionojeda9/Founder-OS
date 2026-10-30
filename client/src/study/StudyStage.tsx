import { useEffect, useRef, type ReactNode } from "react";
import type { AgentStatus } from "../team/chatStore";
import { lampArt } from "./lampArt";
import { lampPoolPalette, paintDeskPool, paintPaperWash } from "./lightPool";
import { usePaperSettle } from "./paperSettle";
import { WorkingLamp } from "./WorkingLamp";

export type PaperPose = "desk" | "lifted";
export type StudyVariant = "work" | "school";

type StudyStageProps = {
  lampStatus: AgentStatus;
  lampScale: number;
  variant?: StudyVariant;
  behind?: ReactNode;
  onDesk?: ReactNode;
  beside?: ReactNode;
  paper?: ReactNode;
  pose?: PaperPose;
  still?: boolean;
  caption?: ReactNode;
  overlay?: ReactNode;
};

export function StudyStage({
  lampStatus,
  lampScale,
  variant = "work",
  behind,
  onDesk,
  beside,
  paper,
  pose = "desk",
  still = false,
  caption,
  overlay,
}: StudyStageProps) {
  const poolPalette = lampPoolPalette(variant);
  const settle = usePaperSettle(pose, still);
  return (
    <div className="study-stage" data-variant={variant}>
      <div className="study-world">
        <div className="back-wall" data-material="plaster" aria-hidden="true" />
        <div className="wainscot" data-material="wainscot" aria-hidden="true" />
        <div className="floor-plane" data-material="floor" aria-hidden="true" />
        {behind ? <div className="behind-cast">{behind}</div> : null}
        <div className="desk-rig">
          <div className="desk-top" data-material="desk">
            <span className="plank plank-a" aria-hidden="true" />
            <span className="plank plank-b" aria-hidden="true" />
            <span className="plank plank-c" aria-hidden="true" />
            <DeskPool status={lampStatus} palette={poolPalette} />
            {onDesk}
          </div>
          <div className="desk-front" data-material="wainscot" aria-hidden="true">
            {variant === "school" ? (
              <span className="desk-apron" data-material="desk">
                <span className="apron-rail" data-accent="school" />
              </span>
            ) : null}
            <span className="desk-leg leg-left" />
            <span className="desk-leg leg-right" />
          </div>
          <Lamp status={lampStatus} scale={lampScale} still={still} />
          {beside}
        </div>
      </div>
      {paper ? (
        <div
          className="paper-slot"
          data-pose={pose}
          data-still={still ? "true" : "false"}
          data-settle={settle ?? undefined}
        >
          {paper}
        </div>
      ) : null}
      {overlay ? <div className="stage-overlay">{overlay}</div> : null}
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

function DeskPool({ status, palette }: { status: AgentStatus; palette: "ember" | "school" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // School accent is not lighter than the wood top, so the painted pool stays ember.
    paintDeskPool(canvas, status);
  }, [status]);
  return (
    <canvas
      ref={ref}
      className="desk-pool sprite"
      data-pool={status}
      data-pool-palette={palette}
      aria-hidden="true"
    />
  );
}

function Lamp({ status, scale, still }: { status: AgentStatus; scale: number; still: boolean }) {
  const lamp = lampArt(status);
  return (
    <figure className="figure lamp-spot">
      <WorkingLamp status={status} scale={scale} still={still} />
      <figcaption className="status-chip" data-status={status}>
        {lamp.caption}
      </figcaption>
    </figure>
  );
}
