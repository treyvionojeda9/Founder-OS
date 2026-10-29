import type { SpriteGrid } from "./types";
import { flame } from "./flame";
import { archDoorClosed, archDoorOpen } from "./archDoor";
import { deskLampFailed, deskLampOff, deskLampOn } from "./deskLamp";
import { agent } from "./agent";
import { logoBook, logoCloud, logoHale, logoLocal, logoQuill } from "./logos";
import { offlineCloud } from "./offlineCloud";
import { paperSheet } from "./paper";
import { groundContact } from "./groundContact";

export type { SpriteGrid } from "./types";
export { flame } from "./flame";
export { archDoorClosed, archDoorOpen, closedLogoSlot, openLogoSlot } from "./archDoor";
export { deskLampOff, deskLampOn, deskLampFailed } from "./deskLamp";
export { agent } from "./agent";
export { logoHale, logoCloud, logoLocal, logoBook, logoQuill } from "./logos";
export { offlineCloud } from "./offlineCloud";
export { paperSheet } from "./paper";
export { groundContact } from "./groundContact";

export const spriteCatalog: { name: string; rows: SpriteGrid }[] = [
  { name: "flame", rows: flame },
  { name: "arch door closed", rows: archDoorClosed },
  { name: "arch door open", rows: archDoorOpen },
  { name: "desk lamp off", rows: deskLampOff },
  { name: "desk lamp on", rows: deskLampOn },
  { name: "desk lamp failed", rows: deskLampFailed },
  { name: "agent", rows: agent },
  { name: "logo hale", rows: logoHale },
  { name: "logo cloud", rows: logoCloud },
  { name: "logo local", rows: logoLocal },
  { name: "logo book", rows: logoBook },
  { name: "logo quill", rows: logoQuill },
  { name: "offline cloud", rows: offlineCloud },
  { name: "paper", rows: paperSheet },
  { name: "ground contact", rows: groundContact },
];
