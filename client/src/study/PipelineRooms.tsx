import { forwardRef, type KeyboardEvent } from "react";
import { Sprite } from "../design/Sprite";
import { glyphFrames } from "../design/statusFrame";
import {
  pipelineFor,
  stageControlName,
  tokenBodyByMark,
  tokenPlaceFrames,
  toggleStage,
  type PipelineAgent,
  type PipelineStageId,
} from "./pipelineRooms";

type PipelineRoomsProps = {
  agents: readonly PipelineAgent[];
  still: boolean;
  filter: PipelineStageId | null;
  onFilter: (next: PipelineStageId | null) => void;
};

/**
 * A short row of pixel rooms under the desks.
 * Each token is the agent's StatusFrame. Tap a room to light matching desks.
 * Reduced motion sets the token down in one frame. Nothing here approves or writes a vault.
 */
export const PipelineRooms = forwardRef<HTMLDivElement, PipelineRoomsProps>(function PipelineRooms(
  { agents, still, filter, onFilter },
  ref,
) {
  const stages = pipelineFor(agents);
  const frames = tokenPlaceFrames(still);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(".pipeline-room")];
    const index = buttons.findIndex((button) => button === document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div
      ref={ref}
      className="pipeline-rooms"
      role="group"
      aria-label="Pipeline rooms"
      data-lighting="ember"
      data-reach="local"
      data-still={still ? "true" : "false"}
      data-frames={frames}
      data-filter={filter ?? "all"}
      onKeyDown={onKeyDown}
    >
      {stages.map((stage) => (
        <button
          key={stage.id}
          type="button"
          className="pipeline-room"
          data-stage={stage.id}
          data-pattern={stage.pattern}
          data-count={stage.tokens.length}
          aria-pressed={filter === stage.id}
          aria-label={stageControlName(stage.label, stage.tokens.length)}
          onClick={() => onFilter(toggleStage(filter, stage.id))}
        >
          <span className="pipeline-window" aria-hidden="true" />
          <span className="pipeline-room-name">{stage.label}</span>
          <span className="pipeline-floor" data-material="floor">
            {stage.tokens.map((token) => {
              const glyph = glyphFrames(token.status, still);
              return (
                <span
                  key={token.agentId}
                  className="pipeline-token"
                  data-agent={token.agentId}
                  data-status={token.status}
                  data-pattern={token.pattern}
                  data-glyph={token.glyph}
                  data-mark={token.mark}
                  data-frames={glyph.length}
                >
                  <Sprite rows={tokenBodyByMark[token.mark]} scale={2} title="" />
                  <span className="pipeline-glyph">
                    {glyph.map((rows, index) => (
                      <span key={token.glyph + index} className="glyph-frame" data-frame={index}>
                        <Sprite rows={rows} scale={2} title="" />
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
          </span>
        </button>
      ))}
    </div>
  );
});
