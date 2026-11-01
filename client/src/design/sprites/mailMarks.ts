import type { SpriteGrid } from "./types";

/**
 * Mail marks. The hand and the seal are different shapes, and both stay in
 * Founder Ember, so a needs-you slip still reads after the colour is removed.
 * The hand is the waiting desk. The seal is a pending approval. The tray never stamps it.
 */

/** Raised hand. Fingers are separate from the palm. */
export const mailHand: SpriteGrid = [
  ".n.n.n..",
  "nnnnnnn.",
  "npppppn.",
  ".npppn..",
  ".npppn..",
  "..nnn...",
  "..nnn...",
  "...n....",
];

/** Square seal with a hollow and a cut corner. Not a hand. */
export const mailSeal: SpriteGrid = [
  "nnnnnnn.",
  "nppppppn",
  "npdddppn",
  "npdppdpn",
  "npdppdpn",
  "npdddppn",
  "nppppppn",
  ".nnnnnn.",
];
