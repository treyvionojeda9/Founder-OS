import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { WarmCover } from "../components/HallLight";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { REVEAL_MS } from "./doorMotion";

type Cover = "idle" | "on" | "out";

const DoorOpenContext = createContext<((path: string) => void) | null>(null);

export function useDoorOpen(): (path: string) => void {
  const fromHall = useContext(DoorOpenContext);
  const navigate = useNavigate();
  return (path: string) => {
    if (fromHall) fromHall(path);
    else navigate(path);
  };
}

export function DoorTransition({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [cover, setCover] = useState<Cover>("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  const open = useCallback(
    (path: string) => {
      if (reduce) {
        navigate(path);
        return;
      }
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      setCover("on");
      navigate(path);
      timers.current.push(
        window.setTimeout(() => setCover("out"), 32),
        window.setTimeout(() => setCover("idle"), 32 + REVEAL_MS),
      );
    },
    [navigate, reduce],
  );

  return (
    <DoorOpenContext.Provider value={open}>
      <div
        className="route-shell"
        data-cover={cover}
        style={{ "--reveal-ms": `${REVEAL_MS}ms` } as CSSProperties}
      >
        {children}
        {cover !== "idle" ? <WarmCover className="route-cover" phase={cover} /> : null}
      </div>
    </DoorOpenContext.Provider>
  );
}
