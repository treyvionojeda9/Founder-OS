import {
  contactShadow,
  doorFrame,
  doorInterior,
  doorJamb,
  doorLeaf,
  doorLeafAjar,
  doorLeafCrack,
  doorLeafOpen,
  doorSide,
  doorSpill,
  doorWash,
  footGlow,
  leafLogoSlot,
  lightPoolA,
  lightPoolB,
} from "../design/sprites/doorFaces";
import { primeSprites, type SpriteLayer } from "../design/spritePaint";
import type { SpriteGrid } from "../design/sprites/types";
import { doors } from "../fixtures/doors";

const FACES: readonly SpriteGrid[] = [
  doorFrame,
  doorInterior,
  doorJamb,
  doorSide,
  doorWash,
  doorSpill,
  doorLeaf,
  doorLeafCrack,
  doorLeafAjar,
  doorLeafOpen,
  lightPoolA,
  lightPoolB,
  footGlow,
  contactShadow,
];

/** Portrait work doors are ×7. Two doors, and every non-portrait hall, are ×8. */
const SCALES = [7, 8];

/** Raster the hall doors once, during the splash wait, so the hall and a wing change only blit. */
export function primeDoorArt() {
  const items: { rows: SpriteGrid; scale: number; layers?: readonly SpriteLayer[] }[] = [];
  for (const scale of SCALES) {
    for (const rows of FACES) items.push({ rows, scale });
    for (const door of doors) {
      items.push({
        rows: doorLeaf,
        scale,
        layers: [{ rows: door.logo, x: leafLogoSlot.x, y: leafLogoSlot.y }],
      });
    }
  }
  primeSprites(items);
}
