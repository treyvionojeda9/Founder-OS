import type { SpriteGrid } from "./types";

/** Presentation marks only. The row order already comes from the team record. */
export const seatMarks = ["hair", "hood", "collar"] as const;
export type SeatMark = (typeof seatMarks)[number];

export function seatMark(index: number): SeatMark {
  return seatMarks[index % seatMarks.length] ?? "hair";
}

/**
 * Front-facing busts. The body is one scale.
 * Hair, hood, and collar are the only differences, and each bust
 * keeps a slate cheek where the lamp is dark.
 */
export const seatedHair: SpriteGrid = [
  "................",
  "....dddddd......",
  "...dddddddd.....",
  "..dddpppppdd....",
  "..ddsdppdpdd....",
  "..dddpppppdd....",
  "...ddppmmpd.....",
  "....ddddddd.....",
  "...ddddddddd....",
  "..dddwdddwddd...",
  ".ddddddddddddd..",
  ".ddddd..dddddd..",
  "..ddd....ddd....",
  "................",
  "................",
  "................",
];

export const seatedHood: SpriteGrid = [
  "................",
  "...mmmmmmmmm....",
  "..mmddddddmm....",
  "..mmdpppppmm....",
  "..mmsdppdpmm....",
  "..mmdpppppmm....",
  "...mmppmmpmm....",
  "....mdddddd.....",
  "...ddddddddd....",
  "..dddwdddwddd...",
  ".ddddddddddddd..",
  ".ddddd..dddddd..",
  "..ddd....ddd....",
  "................",
  "................",
  "................",
];

export const seatedCollar: SpriteGrid = [
  "................",
  ".....ssss.......",
  "....ssspss......",
  "...sssdppdss....",
  "...ssppppss.....",
  "....ssmmss......",
  "...ppddddpp.....",
  "..ppddddddpp....",
  "..pddddddddp....",
  "..dddwdddwdd....",
  ".dddddddddddd...",
  ".ddddd..ddddd...",
  "..ddd....ddd....",
  "................",
  "................",
  "................",
];

export const seatedByMark: Record<SeatMark, SpriteGrid> = {
  hair: seatedHair,
  hood: seatedHood,
  collar: seatedCollar,
};

/** Stepped warm light. It covers the dark cheek and catches the lamp-side edge. */
export const faceWashHair: SpriteGrid = [
  "................",
  "....ee..........",
  "...ff...........",
  "....ff..........",
  "....f...........",
  ".....ff.........",
  ".....e..........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

export const faceWashHood: SpriteGrid = [
  "................",
  "...ff...........",
  "..ee............",
  "....ff..........",
  "....f...........",
  ".....ff.........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

export const faceWashCollar: SpriteGrid = [
  "................",
  ".....ee.........",
  "....ff..........",
  ".....f..........",
  ".....f..........",
  "................",
  "...ee...........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

export const faceWashByMark: Record<SeatMark, SpriteGrid> = {
  hair: faceWashHair,
  hood: faceWashHood,
  collar: faceWashCollar,
};

/** Wide puddle on the desk top. Bright at the lamp, wood at the rim. */
export const deskLightPool: SpriteGrid = [
  "....................................",
  "........ffffffffee..................",
  "......ffffffffffffffee..............",
  "....ffffffffffffffffffffee..........",
  "..eeeeeeeeeeeeeeeeeeeeeeeeee........",
  "....eeeeeeeeeeeeeeewwwwwwwww........",
  "......wwwwwwwwwwwwwwwwww............",
  "........wwwwwwwwww..................",
];

/** Light that lands on the sheet. A step, not a second copy of the desk puddle. */
export const paperLightPool: SpriteGrid = [
  "fffe....",
  "ffffe...",
  "eeeee...",
  "eeeww...",
  "..www...",
];
