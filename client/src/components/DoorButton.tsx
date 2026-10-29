import { useEffect, useMemo, useRef, useState } from "react";
import { Sprite } from "../design/Sprite";
import { archDoorClosed, archDoorOpen, closedLogoSlot, openLogoSlot } from "../design/sprites";
import type { Door } from "../fixtures/doors";
import { useReducedMotion } from "../hooks/useReducedMotion";

type DoorButtonProps = {
  door: Door;
  onOpen: (door: Door) => void;
};

export function DoorButton({ door, onOpen }: DoorButtonProps) {
  const reduce = useReducedMotion();
  const [openFrame, setOpenFrame] = useState(false);
  const timer = useRef<number | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function activate() {
    if (busy.current) return;
    busy.current = true;
    if (reduce) {
      onOpen(door);
      return;
    }
    setOpenFrame(true);
    timer.current = window.setTimeout(() => onOpen(door), 240);
  }

  const slot = openFrame ? openLogoSlot : closedLogoSlot;
  const layers = useMemo(
    () => [{ rows: door.logo, x: slot.x, y: slot.y }],
    [door.logo, slot.x, slot.y],
  );

  return (
    <button type="button" className="door" onClick={activate} aria-label={`Open ${door.name}`}>
      <Sprite
        rows={openFrame ? archDoorOpen : archDoorClosed}
        scale={4}
        title=""
        layers={layers}
      />
      <span className="door-name">{door.name}</span>
    </button>
  );
}
