import { useEffect, useMemo, useRef, useState } from "react";
import { Sprite } from "../design/Sprite";
import {
  archDoorClosed,
  archDoorOpen,
  closedLogoSlot,
  groundContact,
  openLogoSlot,
} from "../design/sprites";
import type { Door } from "../fixtures/doors";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Phase = "closed" | "ajar" | "through";

type DoorButtonProps = {
  door: Door;
  onOpen: (door: Door) => void;
};

const AJAR_MS = 560;
const ENTER_MS = 1560;

export function DoorButton({ door, onOpen }: DoorButtonProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("closed");
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function activate() {
    if (busy.current) return;
    busy.current = true;
    if (reduce) {
      onOpen(door);
      return;
    }
    setPhase("ajar");
    timers.current.push(window.setTimeout(() => setPhase("through"), AJAR_MS));
    timers.current.push(window.setTimeout(() => onOpen(door), ENTER_MS));
  }

  const open = phase !== "closed";
  const slot = open ? openLogoSlot : closedLogoSlot;
  const layers = useMemo(
    () => [{ rows: door.logo, x: slot.x, y: slot.y }],
    [door.logo, slot.x, slot.y],
  );

  return (
    <button
      type="button"
      className="door"
      data-phase={phase}
      onClick={activate}
      aria-label={`Open ${door.name}`}
    >
      <span className="door-stage">
        <span className="door-figure">
          <Sprite
            rows={open ? archDoorOpen : archDoorClosed}
            scale={4}
            title=""
            layers={layers}
          />
        </span>
        <span className="ground-contact">
          <Sprite rows={groundContact} scale={4} title="" />
        </span>
        <span className="door-name">{door.name}</span>
      </span>
    </button>
  );
}
