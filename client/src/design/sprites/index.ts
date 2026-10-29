import type { SpriteGrid } from "./types";
import { flame } from "./flame";
import { archDoorClosed, archDoorOpen } from "./archDoor";
import { deskLampFailed, deskLampOff, deskLampOn } from "./deskLamp";
import { agent } from "./agent";
import { logoBook, logoCloud, logoHale, logoLocal, logoQuill } from "./logos";
import { offlineCloud } from "./offlineCloud";
import { paperSheet } from "./paper";
import { bookStack, forgeNote, openNotebook } from "./studyProps";
import { contactShadow, doorFrame, doorInterior, doorLeaf, doorSpill, lightPoolA } from "./doorFaces";

export type { SpriteGrid } from "./types";
export { flame } from "./flame";
export { archDoorClosed, archDoorOpen, closedLogoSlot, openLogoSlot } from "./archDoor";
export { deskLampOff, deskLampOn, deskLampFailed } from "./deskLamp";
export { agent } from "./agent";
export { logoHale, logoCloud, logoLocal, logoBook, logoQuill } from "./logos";
export { offlineCloud } from "./offlineCloud";
export { paperSheet } from "./paper";
export { forgeNote, bookStack, openNotebook } from "./studyProps";
export {
  contactShadow,
  doorFrame,
  doorInterior,
  doorJamb,
  doorLeaf,
  doorLeafBack,
  doorLeafEdge,
  doorSpill,
  lightPoolA,
  lightPoolB,
} from "./doorFaces";

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
  { name: "forge note", rows: forgeNote },
  { name: "book stack", rows: bookStack },
  { name: "open notebook", rows: openNotebook },
  { name: "contact shadow", rows: contactShadow },
  { name: "door frame", rows: doorFrame },
  { name: "door leaf", rows: doorLeaf },
  { name: "door interior", rows: doorInterior },
  { name: "door spill", rows: doorSpill },
  { name: "light pool", rows: lightPoolA },
];
