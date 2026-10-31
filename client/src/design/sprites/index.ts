import type { SpriteGrid } from "./types";
import { flame } from "./flame";
import { splashFlameCore, splashFlameLift, splashFlameSettle } from "./splashFlame";
import { archDoorClosed, archDoorOpen } from "./archDoor";
import { deskLampFailed, deskLampFlickerDip, deskLampFlickerLift, deskLampOff, deskLampOn } from "./deskLamp";
import { founderSeal } from "./founderSeal";
import { agent } from "./agent";
import { logoBook, logoCloud, logoHale, logoLocal, logoQuill } from "./logos";
import { offlineCloud } from "./offlineCloud";
import { paperSheet } from "./paper";
import { stapler } from "./stapler";
import { assignmentKey, bookStack, closedBook, forgeNote, openNotebook } from "./studyProps";
import { contactShadow, doorFrame, doorInterior, doorLeaf, doorSpill, footGlow, lightPoolA } from "./doorFaces";

export type { SpriteGrid } from "./types";
export { flame } from "./flame";
export { splashFlameCore, splashFlameLift, splashFlameSettle } from "./splashFlame";
export { archDoorClosed, archDoorOpen, closedLogoSlot, openLogoSlot } from "./archDoor";
export { deskLampOff, deskLampOn, deskLampFlickerLift, deskLampFlickerDip, deskLampFailed } from "./deskLamp";
export { founderSeal } from "./founderSeal";
export { agent } from "./agent";
export { logoHale, logoCloud, logoLocal, logoBook, logoQuill } from "./logos";
export { offlineCloud } from "./offlineCloud";
export { paperSheet } from "./paper";
export { stapler } from "./stapler";
export { assignmentKey, forgeNote, bookStack, closedBook, openNotebook } from "./studyProps";
export {
  contactShadow,
  footGlow,
  doorFrame,
  doorInterior,
  doorJamb,
  doorLeaf,
  doorLeafAjar,
  doorLeafOpen,
  doorLeafBack,
  doorLeafEdge,
  doorSpill,
  lightPoolA,
  lightPoolB,
} from "./doorFaces";

export const spriteCatalog: { name: string; rows: SpriteGrid }[] = [
  { name: "flame", rows: flame },
  { name: "splash flame core", rows: splashFlameCore },
  { name: "splash flame lift", rows: splashFlameLift },
  { name: "splash flame settle", rows: splashFlameSettle },
  { name: "arch door closed", rows: archDoorClosed },
  { name: "arch door open", rows: archDoorOpen },
  { name: "desk lamp off", rows: deskLampOff },
  { name: "desk lamp on", rows: deskLampOn },
  { name: "desk lamp flicker lift", rows: deskLampFlickerLift },
  { name: "desk lamp flicker dip", rows: deskLampFlickerDip },
  { name: "desk lamp failed", rows: deskLampFailed },
  { name: "founder seal", rows: founderSeal },
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
  { name: "closed book", rows: closedBook },
  { name: "assignment key", rows: assignmentKey },
  { name: "stapler", rows: stapler },
  { name: "open notebook", rows: openNotebook },
  { name: "contact shadow", rows: contactShadow },
  { name: "foot glow", rows: footGlow },
  { name: "door frame", rows: doorFrame },
  { name: "door leaf", rows: doorLeaf },
  { name: "door interior", rows: doorInterior },
  { name: "door spill", rows: doorSpill },
  { name: "light pool", rows: lightPoolA },
];
