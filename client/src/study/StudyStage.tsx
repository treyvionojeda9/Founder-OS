import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { StatusFrame } from "../design/StatusFrame";
import type { AgentStatus } from "../team/chatStore";
import { DOLLY_MS } from "../hall/doorMotion";
import { SpaceWash } from "../hall/SpaceWash";
import { lampPoolPalette, paintDeskPool, paintPaperWash } from "./lightPool";
import { usePaperSettle } from "./paperSettle";
import { WorkingLamp } from "./WorkingLamp";

const FLOOR_DEPTHS = ["7", "6", "5", "4", "3", "2", "1", "0"] as const;
const SHELF_BAYS = [0, 1, 2, 3] as const;

export type PaperPose = "desk" | "lifted";
export type StudyVariant = "work" | "school";
export type DeskApproach = "far" | "near";

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
  /** Walk-up: far is the room at a distance, near is the desk the dolly lands on. */
  approach?: DeskApproach;
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
  approach = "near",
  caption,
  overlay,
}: StudyStageProps) {
  const poolPalette = lampPoolPalette(variant);
  const settle = usePaperSettle(pose, still);
  const fitted = variant === "work" && pose === "desk" && !!paper;
  const stageStyle = {
    "--dolly-ms": `${DOLLY_MS}ms`,
    "--lamp-h": `${32 * lampScale}px`,
  } as CSSProperties;
  return (
    <div
      className="study-stage"
      data-variant={variant}
      data-space={variant}
      data-lighting={variant === "school" ? "school" : "ember"}
      data-approach={variant === "work" ? approach : undefined}
      style={stageStyle}
    >
      <div className="study-world">
        <div className="back-wall" data-material="plaster" aria-hidden="true">
          <SpaceWash space={variant} part="wall" />
          {variant === "school" ? <ReadingWindow /> : null}
        </div>
        <div className="wainscot" data-material="wainscot" aria-hidden="true">
          {variant === "school" ? <ReadingShelves /> : null}
        </div>
        {variant === "school" ? <span className="desk-room-rail reading-rail" aria-hidden="true" /> : null}
        <div className="floor-plane" data-material="floor" aria-hidden="true">
          {variant === "school" ? <ReadingFloor /> : null}
        </div>
        <div className="desk-rig" data-desk={variant === "work" ? "fitted" : "study"}>
          {variant === "work" ? <span className="desk-shadow" aria-hidden="true" /> : null}
          {behind ? <div className="behind-cast">{behind}</div> : null}
          <div className="desk-top" data-material="desk">
            <SpaceWash space={variant} part="desk" />
            <span className="plank plank-a" aria-hidden="true" />
            <span className="plank plank-b" aria-hidden="true" />
            <span className="plank plank-c" aria-hidden="true" />
            <DeskPool status={lampStatus} palette={poolPalette} />
            {onDesk}
            {fitted ? (
              <div
                className="paper-slot"
                data-pose={pose}
                data-still={still ? "true" : "false"}
                data-settle={settle ?? undefined}
              >
                {paper}
              </div>
            ) : null}
          </div>
          {variant === "work" ? <span className="desk-side" data-material="wainscot" aria-hidden="true" /> : null}
          <div className="desk-front" data-material="wainscot" aria-hidden="true">
            {variant === "school" ? (
              <span className="desk-apron" data-material="desk">
                <span className="apron-rail" data-accent="school" />
              </span>
            ) : null}
            <span className="desk-leg leg-left" />
            <span className="desk-leg leg-right" />
          </div>
          {variant === "school" ? <span className="reading-shadow" aria-hidden="true" /> : null}
          {variant === "work" ? (
            <div className="desk-nameplate">
              <StatusFrame status={lampStatus} still={still} />
            </div>
          ) : null}
          <Lamp status={lampStatus} scale={lampScale} still={still} chip={variant !== "work"} />
          {beside}
        </div>
      </div>
      {paper && !fitted ? (
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

function ReadingWindow() {
  return (
    <div className="reading-window">
      <div className="desk-room-window">
        <span className="window-reveal">
          <span className="window-glass">
            <span className="window-star" />
            <span className="window-star" />
            <span className="window-star" />
            <span className="window-mullion window-mullion-v" />
            <span className="window-mullion window-mullion-h" />
          </span>
        </span>
        <span className="window-sill" />
      </div>
    </div>
  );
}

function ReadingShelves() {
  return (
    <span className="wall-bays">
      {SHELF_BAYS.map((bay) => (
        <span key={bay} className="wall-bay">
          <span className="wall-cubby">
            <span className="shelf-tome" data-tome="a" />
            <span className="shelf-tome" data-tome="b" />
          </span>
          <span className="wall-shelf" />
          <span className="wall-cubby">
            <span className="shelf-tome" data-tome="c" />
          </span>
        </span>
      ))}
    </span>
  );
}

function ReadingFloor() {
  return (
    <span className="floor-steps">
      {FLOOR_DEPTHS.map((depth) => (
        <span key={depth} className="floor-board" data-depth={depth} />
      ))}
    </span>
  );
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

function Lamp({
  status,
  scale,
  still,
  chip = true,
}: {
  status: AgentStatus;
  scale: number;
  still: boolean;
  chip?: boolean;
}) {
  return (
    <figure className="figure lamp-spot">
      <WorkingLamp status={status} scale={scale} still={still} />
      {chip ? <StatusFrame status={status} still={still} /> : null}
    </figure>
  );
}
