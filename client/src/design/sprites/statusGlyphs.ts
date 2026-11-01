import type { SpriteGrid } from "./types";

/**
 * Status glyphs. Each one is a different shape, and each uses Founder Ember
 * only, so the five states still separate after the colour is removed.
 * The waiting glyph is the same raised hand as the agent pose.
 */

export const glyphRest: SpriteGrid = [
  "........",
  "........",
  "........",
  "pppppppp",
  "pppppppp",
  "........",
  "........",
  "........",
];

export const glyphFlame: SpriteGrid = [
  "...nn...",
  "..nnnn..",
  "..nppn..",
  ".nnppnn.",
  ".nnnnnn.",
  "..nnnn..",
  "...dd...",
  "...dd...",
];

/** Second working frame. Reduced motion keeps glyphFlame and drops this one. */
export const glyphFlameLift: SpriteGrid = [
  "..nnnn..",
  "..nppn..",
  ".nnppnn.",
  ".nnnnnn.",
  "..nnnn..",
  "...dd...",
  "...dd...",
  "........",
];

export const glyphHand: SpriteGrid = [
  ".nnn....",
  "neeeen..",
  ".nnn....",
  "..ww....",
  "..ww....",
  "..ww....",
  "..dd....",
  "........",
];

export const glyphCheck: SpriteGrid = [
  "........",
  "......f.",
  ".....ff.",
  "f...f...",
  "ff.f....",
  ".ff.....",
  "..f.....",
  "........",
];

export const glyphCrack: SpriteGrid = [
  "p......p",
  ".p....p.",
  "..p..p..",
  "...pp...",
  "...pp...",
  "..p..p..",
  ".p....p.",
  "p......p",
];
