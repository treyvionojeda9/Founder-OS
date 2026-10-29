import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { WarmCover } from "../components/HallLight";
import { doors } from "../fixtures/doors";
import { useStillFrame } from "../hooks/useStillFrame";
import { LearnStub } from "../routes/LearnStub";
import { TeamRoom } from "../routes/TeamRoom";
import { DoorApiContext, type HallLocationState } from "./doorApi";
import { DoorGhost } from "./DoorGhost";
import { fallbackFrame, type DoorFrame } from "./doorFrame";
import { ENTER_MS, REVEAL_MS, roomFromPath, SHUT_MS, type PortalKind } from "./doorMotion";

type Cover = "idle" | "on" | "out";

type Reveal = {
  path: string;
  frame: DoorFrame;
  mode: "open" | "shut";
  doorId: string;
  kind: PortalKind;
};

function kindForDoor(doorId: string): PortalKind {
  return doors.find((door) => door.id === doorId)?.section === "school" ? "learn" : "team";
}

export type { HallLocationState } from "./doorApi";
export { useDoorArm, useDoorOpen, useDoorShut } from "./doorApi";

export function DoorTransition({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const still = useStillFrame();
  const [cover, setCover] = useState<Cover>("idle");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const timers = useRef<number[]>([]);
  const revealRef = useRef<Reveal | null>(null);
  const frameRef = useRef<DoorFrame | null>(null);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const arm = useCallback((path: string, frame: DoorFrame) => {
    const room = roomFromPath(path);
    if (!room) return;
    const next: Reveal = { path, frame, mode: "open", doorId: room.id, kind: room.kind };
    frameRef.current = frame;
    revealRef.current = next;
    setReveal(next);
  }, []);

  const open = useCallback(
    (path: string) => {
      const armed = revealRef.current?.mode === "open" && revealRef.current.path === path;
      clearTimers();
      if (armed) {
        navigate(path);
        timers.current.push(
          window.setTimeout(() => {
            if (revealRef.current?.mode === "open") {
              revealRef.current = null;
              setReveal(null);
            }
          }, 48),
        );
        return;
      }
      if (still) {
        navigate(path);
        return;
      }
      setCover("on");
      navigate(path);
      timers.current.push(
        window.setTimeout(() => setCover("out"), 32),
        window.setTimeout(() => setCover("idle"), 32 + REVEAL_MS),
      );
    },
    [clearTimers, navigate, still],
  );

  const shut = useCallback(
    (doorId: string) => {
      clearTimers();
      const state: HallLocationState = { focusDoorId: doorId };
      if (still) {
        revealRef.current = null;
        setReveal(null);
        navigate("/home", { state });
        return;
      }
      const frame = frameRef.current ?? fallbackFrame();
      const kind = kindForDoor(doorId);
      const next: Reveal = {
        path: kind === "learn" ? `/learn/${doorId}` : `/team/${doorId}`,
        frame,
        mode: "shut",
        doorId,
        kind,
      };
      revealRef.current = next;
      setReveal(next);
      navigate("/home", { state });
      timers.current.push(
        window.setTimeout(() => {
          revealRef.current = null;
          setReveal(null);
        }, SHUT_MS),
      );
    },
    [clearTimers, navigate, still],
  );

  return (
    <DoorApiContext.Provider value={{ open, arm, shut }}>
      <div className="route-shell" data-cover={cover} style={{ "--reveal-ms": `${REVEAL_MS}ms` } as CSSProperties}>
        {children}
        {cover !== "idle" ? <WarmCover className="route-cover" phase={cover} /> : null}
        {reveal ? <RoomPortal reveal={reveal} /> : null}
      </div>
    </DoorApiContext.Provider>
  );
}

function RoomPortal({ reveal }: { reveal: Reveal }) {
  const style = {
    "--ox": `${reveal.frame.ox}px`,
    "--oy": `${reveal.frame.oy}px`,
    "--door-scale": String(reveal.frame.scale),
    "--enter-ms": `${ENTER_MS}ms`,
    "--shut-ms": `${SHUT_MS}ms`,
  } as CSSProperties;
  return (
    <div className={reveal.mode === "shut" ? "room-portal-layer is-shut" : "room-portal-layer"} aria-hidden="true">
      <div className={reveal.mode === "shut" ? "room-portal is-shut" : "room-portal"} style={style} data-mode={reveal.mode}>
        {reveal.kind === "learn" ? (
          <LearnStub doorId={reveal.doorId} preview />
        ) : (
          <TeamRoom teamId={reveal.doorId} preview />
        )}
      </div>
      {reveal.mode === "shut" ? <DoorGhost frame={reveal.frame} /> : null}
    </div>
  );
}
