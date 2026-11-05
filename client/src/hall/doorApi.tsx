import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import type { DoorFrame } from "./doorFrame";

export type HallLocationState = {
  focusDoorId?: string;
};

export type DoorApi = {
  open: (path: string) => void;
  arm: (path: string, frame: DoorFrame) => void;
  shut: (doorId: string) => void;
};

export const DoorApiContext = createContext<DoorApi | null>(null);

export function useDoorOpen(): (path: string) => void {
  const api = useContext(DoorApiContext);
  const navigate = useNavigate();
  return (path: string) => {
    if (api) api.open(path);
    else navigate(path);
  };
}

export function useDoorArm(): (path: string, frame: DoorFrame) => void {
  const api = useContext(DoorApiContext);
  return (path, frame) => api?.arm(path, frame);
}

export function useDoorShut(): (doorId: string) => void {
  const api = useContext(DoorApiContext);
  const navigate = useNavigate();
  return (doorId: string) => {
    if (api) api.shut(doorId);
    else navigate("/home", { state: { focusDoorId: doorId } satisfies HallLocationState });
  };
}
