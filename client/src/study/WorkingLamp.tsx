import { Sprite } from "../design/Sprite";
import type { AgentStatus } from "../team/chatStore";
import { lampArt } from "./lampArt";
import { lampFlickerFrames } from "./lampFlicker";

type WorkingLampProps = {
  status: AgentStatus;
  scale: number;
  still: boolean;
};

/** Idle and failed lamps stay on one frame. A working lamp flickers only when motion is allowed. */
export function WorkingLamp({ status, scale, still }: WorkingLampProps) {
  const art = lampArt(status);
  if (status !== "working") {
    return (
      <span className="lamp-flame" data-flicker="off">
        <Sprite rows={art.rows} scale={scale} title={art.title} />
      </span>
    );
  }

  const frames = still ? lampFlickerFrames.slice(0, 1) : lampFlickerFrames;
  return (
    <span className="lamp-flame" data-flicker={still ? "still" : "on"} data-frame={still ? "0" : undefined}>
      {frames.map((rows, index) => (
        <span key={art.title + index} className="lamp-frame" data-frame={index}>
          <Sprite rows={rows} scale={scale} title={index === 0 ? art.title : ""} />
        </span>
      ))}
    </span>
  );
}
