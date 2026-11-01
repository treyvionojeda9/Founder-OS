import { useEffect, useRef } from "react";
import type { LearningPath } from "../fixtures/learning";
import { CopyLink } from "../nav/CopyLink";
import {
  highlightFrames,
  mapBounds,
  markLabel,
  markPattern,
  myceliumRun,
  pathMapFor,
  pointsAttr,
  stationAnchor,
  stationOrigin,
  threadOffset,
  NODE_H,
  NODE_W,
} from "./pathMap";

type PathMapProps = {
  path: LearningPath;
  still: boolean;
  openId: string | null;
  onOpen: (id: string) => void;
  onCloseSheet: () => void;
};

/**
 * Pixel stations and thin links for one fixture path.
 * A tap opens a paper sheet. The sheet is not saved.
 */
export function PathMap({ path, still, openId, onOpen, onCloseSheet }: PathMapProps) {
  const model = pathMapFor(path);
  const bounds = mapBounds(model.stations);
  const frames = highlightFrames(still);
  const byId = new Map(model.stations.map((station) => [station.id, station]));
  const open = openId ? byId.get(openId) ?? null : null;
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus();
  }, [open]);

  return (
    <div className="path-map-wrap" data-map="network">
      <div
        className="path-map"
        role="group"
        aria-label="Learning path"
        data-still={still ? "true" : "false"}
        data-frames={frames}
        data-focus={model.focusId}
        style={{ width: bounds.width, height: bounds.height }}
      >
        <svg
          className="path-links"
          width={bounds.width}
          height={bounds.height}
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          aria-hidden="true"
        >
          {model.links.map((link) => {
            const from = byId.get(link.from);
            const to = byId.get(link.to);
            if (!from || !to) return null;
            const run = myceliumRun(stationAnchor(from), stationAnchor(to));
            const thread = threadOffset(run);
            return (
              <g key={`${link.from}-${link.to}`} className="path-link" data-from={link.from} data-to={link.to}>
                <polyline className="path-thread path-thread-ink" points={pointsAttr(run)} />
                <polyline className="path-thread path-thread-ember" points={pointsAttr(thread)} />
              </g>
            );
          })}
        </svg>
        {model.stations.map((station) => {
          const origin = stationOrigin(station);
          const opened = open?.id === station.id;
          return (
            <button
              key={station.id}
              id={`path-node-${station.id}`}
              type="button"
              className="path-node"
              data-mark={station.mark}
              data-pattern={markPattern(station.mark)}
              data-frames={station.mark === "current" ? frames : 1}
              aria-current={station.mark === "current" ? "step" : undefined}
              aria-expanded={opened}
              aria-controls={opened ? "path-sheet" : undefined}
              style={{ left: origin.x, top: origin.y, width: NODE_W, height: NODE_H }}
              onClick={() => (opened ? onCloseSheet() : onOpen(station.id))}
            >
              <span className="path-node-mark">{markLabel(station.mark)}</span>{" "}
              <span className="path-node-title">{station.title}</span>
            </button>
          );
        })}
      </div>
      {model.assignmentNote ? <p className="path-assignment">{model.assignmentNote}</p> : null}
      {open ? (
        <article
          ref={sheetRef}
          id="path-sheet"
          className="path-sheet"
          role="region"
          aria-labelledby="path-sheet-title"
          tabIndex={-1}
          data-station={open.id}
        >
          <CopyLink kind="node" id={open.id} />
          <p className="path-sheet-kicker">{markLabel(open.mark)}</p>
          <h3 id="path-sheet-title">{open.title}</h3>
          <p>{open.body}</p>
          <button type="button" className="text-link sheet-down" onClick={onCloseSheet}>
            Set the sheet down
          </button>
        </article>
      ) : null}
    </div>
  );
}
