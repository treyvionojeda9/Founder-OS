import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Sprite } from "../design/Sprite";
import {
  contactShadow,
  doorFrame,
  doorInterior,
  doorJamb,
  doorLeaf,
  doorLeafBack,
  doorLeafEdge,
  doorSide,
  doorSpec,
  doorSpill,
  doorWash,
  jambHeight,
  leafLogoSlot,
  lightPoolA,
  lightPoolB,
  sideHeight,
} from "../design/sprites/doorFaces";
import type { Door } from "../fixtures/doors";
import { frameFromRig, type DoorFrame } from "../hall/doorFrame";
import { DOLLY_MS, ENTER_MS, doorOpenSchedule, type DoorPhase } from "../hall/doorMotion";
import type { DoorPose } from "../hall/layout";
import { useStillFrame } from "../hooks/useStillFrame";

type DoorButtonProps = {
  door: Door;
  scale: number;
  pose: DoorPose;
  onOpen: (door: Door) => void;
  onArm?: (door: Door, frame: DoorFrame) => void;
};

export function DoorButton({ door, scale, pose, onOpen, onArm }: DoorButtonProps) {
  const still = useStillFrame();
  const [phase, setPhase] = useState<DoorPhase>("closed");
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const rootRef = useRef<HTMLButtonElement>(null);
  const px = (cells: number) => `${cells * scale}px`;
  const depth = doorSpec.depth * scale;

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function activate() {
    if (busy.current) return;
    busy.current = true;
    const rig = rootRef.current?.querySelector(".door-rig");
    if (!still && onArm && rig instanceof HTMLElement) onArm(door, frameFromRig(rig, scale));
    for (const step of doorOpenSchedule(still)) {
      const run = () => {
        if (step.phase === "enter") onOpen(door);
        else setPhase(step.phase);
      };
      if (step.at === 0) run();
      else timers.current.push(window.setTimeout(run, step.at));
    }
  }

  const layers = useMemo(
    () => [{ rows: door.logo, x: leafLogoSlot.x, y: leafLogoSlot.y }],
    [door.logo],
  );
  const opening = phase === "swing" || phase === "dolly";
  const poseStyle = {
    "--yaw": `${pose.yaw}deg`,
    "--z": `${pose.z}px`,
    "--drop": `${pose.drop}px`,
    "--swing-ms": `${DOLLY_MS}ms`,
    "--dolly-ms": `${ENTER_MS - DOLLY_MS}ms`,
    "--pool-w": `${lightPoolA[0].length * scale}px`,
    "--edge": `${depth}px`,
  } as CSSProperties;

  return (
    <button
      ref={rootRef}
      type="button"
      className={["door", door.section === "work" ? "is-team" : "", opening ? "is-opening" : ""].filter(Boolean).join(" ")}
      data-phase={phase}
      data-door-id={door.id}
      style={{ ...poseStyle, width: px(doorSpec.frameW) }}
      onClick={activate}
      aria-label={`Open ${door.name}`}
    >
      <span className="pose">
        <span className="light-pool" aria-hidden="true">
          <span className="pool-a">
            <Sprite rows={lightPoolA} scale={scale} title="" />
          </span>
          <span className="pool-b">
            <Sprite rows={lightPoolB} scale={scale} title="" />
          </span>
        </span>
        <span className="dolly-target">
          <span className="door-rig" style={{ width: px(doorSpec.frameW), height: px(doorSpec.frameH) }}>
            <span className="wash">
              <Sprite rows={doorWash} scale={scale} title="" />
            </span>
            <span
              className="face interior"
              style={{
                left: px(doorSpec.openingX),
                top: px(doorSpec.openingY),
                transform: `translateZ(${-depth + scale}px)`,
              }}
            >
              <span className="interior-dark">
                <Sprite rows={doorInterior} scale={scale} title="" />
              </span>
              <span className="spill">
                <Sprite rows={doorSpill} scale={scale} title="" />
              </span>
            </span>
            <span className="face frame-back" style={{ transform: `translateZ(${-depth}px)` }}>
              <Sprite rows={doorFrame} scale={scale} title="" />
            </span>
            <span
              className="face jamb jamb-left"
              style={{
                left: px(doorSpec.openingX),
                top: px(doorSpec.spring),
                width: px(doorSpec.depth),
                height: px(jambHeight),
                transformOrigin: "left center",
                transform: "rotateY(-90deg)",
              }}
            >
              <Sprite rows={doorJamb} scale={scale} title="" />
            </span>
            <span
              className="face jamb jamb-right"
              style={{
                left: px(doorSpec.openingX + doorSpec.openingW - doorSpec.depth),
                top: px(doorSpec.spring),
                width: px(doorSpec.depth),
                height: px(jambHeight),
                transformOrigin: "right center",
                transform: "rotateY(90deg)",
              }}
            >
              <Sprite rows={doorJamb} scale={scale} title="" />
            </span>
            <span
              className="face side side-left"
              style={{
                left: 0,
                top: px(doorSpec.spring),
                width: px(doorSpec.depth),
                height: px(sideHeight),
                transformOrigin: "left center",
                transform: "rotateY(-90deg)",
              }}
            >
              <Sprite rows={doorSide} scale={scale} title="" />
            </span>
            <span
              className="face side side-right"
              style={{
                left: px(doorSpec.frameW - doorSpec.depth),
                top: px(doorSpec.spring),
                width: px(doorSpec.depth),
                height: px(sideHeight),
                transformOrigin: "right center",
                transform: "rotateY(90deg)",
              }}
            >
              <Sprite rows={doorSide} scale={scale} title="" />
            </span>
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
                <Sprite rows={doorLeaf} scale={scale} title="" layers={layers} />
              </span>
              <span className="leaf-back">
                <Sprite rows={doorLeafBack} scale={scale} title="" />
              </span>
              <span className="leaf-edge">
                <Sprite rows={doorLeafEdge} scale={scale} title="" />
              </span>
            </span>
          </span>
        </span>
      </span>
      <span className="contact-shadow">
        <Sprite rows={contactShadow} scale={scale} title="" />
      </span>
      <span className="door-name">{door.name}</span>
    </button>
  );
}
