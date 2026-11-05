import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Sprite } from "../design/Sprite";
import {
  contactShadow,
  doorFrame,
  doorInterior,
  doorJamb,
  doorLeaf,
  doorLeafAjar,
  doorLeafCrack,
  doorLeafOpen,
  doorSide,
  doorGlowPad,
  doorSpec,
  doorSpill,
  doorWash,
  jambHeight,
  leafLogoSlot,
  footGlow,
  lightPoolA,
  lightPoolB,
  sideHeight,
} from "../design/sprites/doorFaces";
import type { Door } from "../fixtures/doors";
import { frameFromRig, glimpseDenominator, openingScale, type DoorFrame } from "../hall/doorFrame";
import { ENTER_MS, SWING_MS, doorOpenSchedule, doorPath, type DoorPhase } from "../hall/doorMotion";
import type { DoorPose } from "../hall/layout";
import { useStillFrame } from "../hooks/useStillFrame";
import { LearnStub } from "../routes/LearnStub";
import { TeamRoom } from "../routes/TeamRoom";

function holdInert(node: HTMLSpanElement | null) {
  if (node) node.inert = true;
}

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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const px = (cells: number) => `${cells * scale}px`;
  const depth = doorSpec.depth * scale;
  const viewW = typeof window === "undefined" ? 800 : window.innerWidth || 800;
  const viewH = typeof window === "undefined" ? 1280 : window.innerHeight || 1280;
  const glimpseN = glimpseDenominator(
    openingScale(doorSpec.openingW * scale, doorSpec.openingH * scale, viewW, viewH),
  );
  const lintelCells = doorSpec.leafY - doorSpec.openingY;

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
  const hot = !still && (hovered || focused);
  const showGlimpse = hot || (!still && opening);
  const cracked = hot && !opening;
  const poseStyle = {
    "--yaw": `${pose.yaw}deg`,
    "--z": `${pose.z}px`,
    "--drop": `${pose.drop}px`,
    "--swing-ms": `${SWING_MS}ms`,
    "--dolly-ms": `${ENTER_MS - SWING_MS}ms`,
    "--enter-ms": `${ENTER_MS}ms`,
    "--cell": `${scale}px`,
    "--pool-w": `${lightPoolA[0].length * scale}px`,
    "--pool-shift": `${-doorGlowPad.top * scale}px`,
    "--edge": `${depth}px`,
    "--glimpse-n": String(glimpseN),
    "--lintel-cells": String(lintelCells),
    "--spill-clip": `${((doorSpec.openingH - lintelCells) / doorSpec.openingH) * 100}%`,
  } as CSSProperties;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  }

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      className={["door", door.section === "work" ? "is-team" : "", opening ? "is-opening" : "", cracked ? "is-cracked" : ""]
        .filter(Boolean)
        .join(" ")}
      data-phase={phase}
      data-door-id={door.id}
      style={{ ...poseStyle, width: px(doorSpec.frameW) }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={activate}
      onKeyDown={onKeyDown}
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
                width: px(doorSpec.openingW),
                height: px(doorSpec.openingH),
                transform: `translateZ(${-depth + scale}px)`,
              }}
            >
              <span className="interior-dark">
                <Sprite rows={doorInterior} scale={scale} title="" />
              </span>
              {showGlimpse ? (
                <span
                  className="door-glimpse"
                  data-glimpse={door.id}
                  data-destination={doorPath(door)}
                  aria-hidden="true"
                  ref={holdInert}
                >
                  <span className="glimpse-room" style={{ width: viewW, height: viewH }}>
                    {door.section === "work" ? (
                      <TeamRoom teamId={door.id} preview />
                    ) : (
                      <LearnStub doorId={door.id} preview />
                    )}
                  </span>
                  <span className="glimpse-lintel" />
                </span>
              ) : null}
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
              <span className="leaf-pose is-0">
                <Sprite rows={doorLeaf} scale={scale} title="" layers={layers} />
              </span>
              <span className="leaf-crack">
                <Sprite rows={doorLeafCrack} scale={scale} title="" />
              </span>
              <span className="leaf-pose is-1">
                <Sprite rows={doorLeafAjar} scale={scale} title="" />
              </span>
              <span className="leaf-pose is-2">
                <Sprite rows={doorLeafOpen} scale={scale} title="" />
              </span>
            </span>
          </span>
        </span>
      </span>
      <span className="under-door" aria-hidden="true">
        <span className="foot-glow">
          <Sprite rows={footGlow} scale={scale} title="" />
        </span>
        <span className="contact-shadow">
          <Sprite rows={contactShadow} scale={scale} title="" />
        </span>
      </span>
      <span className="door-name type-meta">{door.name}</span>
    </div>
  );
}
