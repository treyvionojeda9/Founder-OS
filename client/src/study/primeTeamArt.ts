import {
  deskLampFailed,
  deskLampFlickerDip,
  deskLampFlickerLift,
  deskLampOff,
  deskLampOn,
  founderSeal,
  agent,
  forgeNote,
  stapler,
} from "../design/sprites";
import { glyphCheck, glyphCrack, glyphFlame, glyphFlameLift, glyphHand, glyphRest } from "../design/sprites/statusGlyphs";
import { mailHand, mailSeal } from "../design/sprites/mailMarks";
import {
  deskLightPool,
  faceWashByMark,
  paperLightPool,
  raisedHand,
  seatedByMark,
} from "../design/sprites/seatedAgent";
import { tokenBodyByMark } from "./pipelineRooms";
import { primeSprites } from "../design/spritePaint";
import { readFormFactor } from "../hooks/useFormFactor";
import type { SpriteGrid } from "../design/sprites/types";

/** Paint the study sprites for this tablet before a door opens, so the swing only blits. */
export function primeTeamArt() {
  const layout = readFormFactor();
  const portrait = layout === "portrait";
  const agentScale = portrait ? 3 : 2;
  const chatLamp = portrait ? 4 : 3;
  const deskLamp = portrait ? 3 : 4;
  const seal = portrait ? 6 : 4;
  const note = portrait ? 4 : 3;
  const sheet = portrait ? 3 : 2;
  const glyphs: SpriteGrid[] = [glyphFlame, glyphFlameLift, glyphHand, glyphRest, glyphCheck, glyphCrack];
  const lamps: SpriteGrid[] = [deskLampOn, deskLampOff, deskLampFailed, deskLampFlickerLift, deskLampFlickerDip];
  primeSprites([
    { rows: agent, scale: agentScale },
    { rows: raisedHand, scale: agentScale },
    { rows: raisedHand, scale: 4 },
    { rows: forgeNote, scale: note },
    { rows: forgeNote, scale: sheet },
    { rows: founderSeal, scale: seal },
    { rows: stapler, scale: 3 },
    { rows: deskLightPool, scale: 3 },
    { rows: paperLightPool, scale: 2 },
    { rows: mailHand, scale: 2 },
    { rows: mailSeal, scale: 2 },
    { rows: mailHand, scale: 3 },
    { rows: mailSeal, scale: 3 },
    ...lamps.flatMap((rows) => [
      { rows, scale: chatLamp },
      { rows, scale: deskLamp },
    ]),
    ...Object.values(seatedByMark).map((rows) => ({ rows, scale: 4 })),
    ...Object.values(faceWashByMark).map((rows) => ({ rows, scale: 4 })),
    ...Object.values(tokenBodyByMark).map((rows) => ({ rows, scale: 2 })),
    ...glyphs.map((rows) => ({ rows, scale: 3 })),
    ...glyphs.map((rows) => ({ rows, scale: 2 })),
  ]);
}
