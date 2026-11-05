import type { SpriteGrid } from "./types";

/** Folded forge note. A sheet with a dog-ear, not a checker. */
export const forgeNote: SpriteGrid = [
  "..dddddddddddddd..",
  ".dppppppppppppppd.",
  ".dpeeepeeeeeeeepd.",
  ".dppppppppppppppd.",
  ".dpeeeeeeeeeeeepd.",
  ".dppppppppppppppd.",
  ".dpeeepeeeeeeeepd.",
  ".dppppppppppppwdd.",
  ".dppppppppppwwdd..",
  ".dppppppppwwdd....",
  ".dddddddddd.......",
  "..................",
];

/** Three spines standing together. */
export const bookStack: SpriteGrid = [
  "......................",
  ".....ddd..ddd..ddd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....wmd..wed..wpd....",
  ".....ddd..ddd..ddd....",
  ".....wdw..wdw..wdw....",
  "......................",
];

/**
 * Closed path book beside the writing sheet.
 * Navy cover and sky ribbon are school accents. Spine, board, and page edges stay in Founder Ember.
 * No blue outside that set. The reading desk uses `readingBook` instead.
 */
export const closedBook: SpriteGrid = [
  "......................",
  "..dddddddddddddddddd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvbbbbvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvbbbbvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddvvvvvvvvvvvvvpd..",
  "..dddddddddddddddddd..",
  "..pppppppppppppppppp..",
  "..dddddddddddddddddd..",
  "......................",
  "......................",
];

/**
 * Path book on the reading desk. Plum cover, ember ribbon, paper edge.
 * Founder Ember only — the school-accent `closedBook` stays in the catalog.
 */
export const readingBook: SpriteGrid = [
  "......................",
  "..dddddddddddddddddd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmeeeemmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmeeeemmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddmmmmmmmmmmmmmpd..",
  "..dddddddddddddddddd..",
  "..pppppppppppppppppp..",
  "..dddddddddddddddddd..",
  "......................",
  "......................",
];

/** Quill resting on the ponder sheet. Paper, wood, and ember. No school accent. */
export const readingQuill: SpriteGrid = [
  ".........p..",
  "........pd..",
  ".......pdp..",
  "......pdp...",
  ".....pde....",
  "....pde.....",
  "...pde......",
  "..ddd.......",
  ".dwd........",
  "md..........",
  "d...........",
  "............",
];

/** Key left on the desk when a fixture assignment is waiting. */
export const assignmentKey: SpriteGrid = [
  "..............",
  "...nnnnnn.....",
  "...n....n.....",
  "...n.pp.n.....",
  "...n....n.....",
  "...nnnnnn.....",
  ".....nn.......",
  ".....nn.n.....",
  ".....nnnn.....",
  ".....nn.......",
  ".....nnnn.....",
  "..............",
];

/** Empty open notebook. The crease is the only mark on the pages. */
export const openNotebook: SpriteGrid = [
  "dddddddddddddddddddddddddddd",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dpppppppppppddppppppppppppd.",
  "dddddddddddddddddddddddddddd",
];
