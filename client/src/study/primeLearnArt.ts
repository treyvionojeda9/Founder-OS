import { assignmentKey, readingBook, readingQuill } from "../design/sprites";
import { primeSprites } from "../design/spritePaint";
import { readFormFactor } from "../hooks/useFormFactor";

/** Raster the reading-room props for this screen before the school door opens. */
export function primeLearnArt() {
  const portrait = readFormFactor() === "portrait";
  primeSprites([
    { rows: readingBook, scale: portrait ? 5 : 4 },
    { rows: assignmentKey, scale: portrait ? 5 : 6 },
    { rows: readingQuill, scale: portrait ? 4 : 3 },
  ]);
}
