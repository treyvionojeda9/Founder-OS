import type { SpriteGrid } from "../design/sprites/types";

/**
 * Temporary rail symbols. Each shape is different, and each uses Founder Ember
 * only, so the marks still separate after the colour is removed.
 * These are not seated figures.
 */

export const glyphCeo: SpriteGrid = [
  "...nn...",
  "..nppn..",
  ".npppnn.",
  "nppppppn",
  "nppppppn",
  ".npppnn.",
  "..nppn..",
  "...nn...",
];

export const glyphAtelier: SpriteGrid = [
  "wwww....",
  "wwww....",
  "wwww....",
  "........",
  "....eeee",
  "....eeee",
  "....eeee",
  "........",
];

export const glyphCourier: SpriteGrid = [
  "dddddddd",
  "d......d",
  "dp....pd",
  "dpp..ppd",
  "dppppppd",
  "d..pp..d",
  "d......d",
  "dddddddd",
];

export const glyphRelay: SpriteGrid = [
  "ff......",
  "ff......",
  "........",
  "........",
  "........",
  "........",
  "......ss",
  "......ss",
];

export const glyphBench: SpriteGrid = [
  "........",
  "..w..w..",
  "..w..w..",
  "..w..w..",
  "..w..w..",
  "wwwwwwww",
  "dddddddd",
  "........",
];

export const glyphSettings: SpriteGrid = [
  "..nnnn..",
  ".n....n.",
  "n..pp..n",
  "n.pppp.n",
  "n.pppp.n",
  "n..pp..n",
  ".n....n.",
  "..nnnn..",
];

export const glyphSpaces: SpriteGrid = [
  "pp......",
  "pp......",
  "pp......",
  "pp......",
  "......ee",
  "......ee",
  "......ee",
  "......ee",
];

export const agentGlyphs: Record<string, SpriteGrid> = {
  ceo: glyphCeo,
  atelier: glyphAtelier,
  courier: glyphCourier,
  relay: glyphRelay,
  bench: glyphBench,
};

const EMBER = ["n", "s", "p", "w", "d", "e", "f", "m"] as const;

/** A stand-in mark when a fixture agent has no drawn symbol yet. */
export function fallbackGlyph(name: string): SpriteGrid {
  const rows = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => "."));
  let seed = 0;
  for (const ch of name) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
  for (let y = 0; y < 8; y += 1) {
    const x = (seed >> (y * 2)) & 7;
    rows[y][x] = EMBER[seed % EMBER.length] ?? "n";
    rows[7 - y][(x + 4) & 7] = EMBER[(seed + y) % EMBER.length] ?? "p";
  }
  return rows.map((row) => row.join(""));
}

export function glyphForAgent(id: string, name: string): SpriteGrid {
  return agentGlyphs[id] ?? fallbackGlyph(name);
}
