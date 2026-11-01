import { Sprite } from "./Sprite";
import { frameSpec, glyphFrames } from "./statusFrame";
import type { AgentStatus } from "../team/chatStore";

type StatusFrameProps = {
  status: AgentStatus;
  still?: boolean;
  /** Spine frames sit on the book. Chip frames sit beside a lamp or on a plaque. */
  density?: "chip" | "spine";
  className?: string;
  labelId?: string;
};

/**
 * One status mark for desks, plaques, and spines.
 * Outline pattern plus glyph, inside Founder Ember. Reduced motion keeps a single frame.
 */
export function StatusFrame({ status, still = false, density = "chip", className, labelId }: StatusFrameProps) {
  const spec = frameSpec(status);
  const frames = glyphFrames(status, still);
  const scale = density === "spine" ? 2 : 3;

  return (
    <span
      className={["status-chip", "status-frame", density === "spine" ? "is-spine" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
      data-state={spec.state}
      data-pattern={spec.pattern}
      data-glyph={spec.glyph}
      data-frames={frames.length === 1 ? "1" : "2"}
      data-still={still ? "true" : "false"}
    >
      <span className="status-glyph" aria-hidden="true">
        {frames.map((rows, index) => (
          <span key={spec.glyph + index} className="glyph-frame" data-frame={index}>
            <Sprite rows={rows} scale={scale} title="" />
          </span>
        ))}
      </span>
      <span className="status-label" id={labelId}>
        {spec.label}
      </span>
    </span>
  );
}
