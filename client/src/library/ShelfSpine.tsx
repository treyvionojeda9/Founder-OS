import type { AgentStatus } from "../team/chatStore";
import { StatusFrame } from "../design/StatusFrame";
import { spineLines, type SpineBand, type SpineTone } from "./shelfNote";

type ShelfSpineProps = {
  id: string;
  label: string;
  tone: SpineTone;
  band: SpineBand;
  status: AgentStatus;
  still: boolean;
  onClick?: () => void;
};

/** One book. The title stays the accessible name. The status frame is the description. */
export function ShelfSpine({ id, label, tone, band, status, still, onClick }: ShelfSpineProps) {
  const lines = spineLines(label);
  const stateId = `spine-state-${id}`;

  return (
    <button
      type="button"
      className="spine"
      data-tone={tone}
      data-band={band}
      aria-label={label}
      aria-describedby={stateId}
      onClick={onClick}
    >
      <span className="spine-body" aria-hidden="true">
        <span className="spine-band" />
      </span>
      <span className="spine-title" data-label="pixel" aria-hidden="true">
        {lines.map((line, lineIndex) => (
          <span key={`${lineIndex}-${line}`} className="spine-line">
            {line}
          </span>
        ))}
      </span>
      <StatusFrame status={status} still={still} density="spine" labelId={stateId} />
    </button>
  );
}
