import type { CSSProperties } from "react";
import { Sprite } from "../design/Sprite";
import { doorFrame, doorLeaf, doorLeafBack, doorLeafEdge, doorSpec } from "../design/sprites/doorFaces";
import type { DoorFrame } from "./doorFrame";
import { SHUT_MS } from "./doorMotion";

export function DoorGhost({ frame }: { frame: DoorFrame }) {
  const scale = frame.pixelScale;
  const px = (cells: number) => Math.round(cells * scale);
  const openingCenterX = (doorSpec.openingX + doorSpec.openingW / 2) * scale;
  const openingCenterY = (doorSpec.openingY + doorSpec.openingH / 2) * scale;
  const style = {
    left: Math.round(frame.ox - openingCenterX),
    top: Math.round(frame.oy - openingCenterY),
    width: px(doorSpec.frameW),
    height: px(doorSpec.frameH),
    "--edge": `${px(doorSpec.depth)}px`,
    "--shut-ms": `${SHUT_MS}ms`,
  } as CSSProperties;

  return (
    <div className="door-ghost is-shut" style={style}>
      <div className="door-rig" style={{ width: style.width, height: style.height }}>
        <span className="face frame">
          <Sprite rows={doorFrame} scale={scale} title="" />
        </span>
        <span
          className="leaf"
          style={{
            left: px(doorSpec.leafX),
            top: px(doorSpec.leafY),
            width: px(doorSpec.leafW),
            height: px(doorSpec.leafH),
          }}
        >
          <span className="leaf-front">
            <Sprite rows={doorLeaf} scale={scale} title="" />
          </span>
          <span className="leaf-back">
            <Sprite rows={doorLeafBack} scale={scale} title="" />
          </span>
          <span className="leaf-edge">
            <Sprite rows={doorLeafEdge} scale={scale} title="" />
          </span>
        </span>
      </div>
    </div>
  );
}
