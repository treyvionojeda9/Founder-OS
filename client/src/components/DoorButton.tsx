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
import { doorOpenSchedule, type DoorPhase } from "../hall/doorMotion";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Phase = DoorPhase;

type DoorButtonProps = {
  door: Door;
  onOpen: (door: Door) => void;
};

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
    for (const step of doorOpenSchedule(reduce)) {
      const run = () => {
        if (step.phase === "enter") onOpen(door);
        else setPhase(step.phase);
      };
      if (step.at === 0) run();
      else timers.current.push(window.setTimeout(run, step.at));
    }
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
