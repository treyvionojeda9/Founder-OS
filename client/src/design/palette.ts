/** Founder Ember, approved 28 Oct 2026. Single source of UI colour. */
export const founderEmber = {
  night: "#1B1A24",
  slate: "#3D3D4A",
  paper: "#E9DFC7",
  wood: "#8F563B",
  darkwood: "#4F352E",
  ember: "#D28C40",
  flame: "#F2C14E",
  plum: "#854550",
} as const;

/** School accent set, used for curriculum marks. */
export const schoolAccent = {
  sky: "#3566BD",
  navy: "#09388E",
  schoolSlate: "#4F5178",
  ink: "#21223C",
} as const;

export const palette = { ...founderEmber, ...schoolAccent } as const;

/**
 * Sprite index. `.` is empty. Outlines use a darker local tone
 * (darkwood, plum, ink) rather than a separate black.
 */
export const paletteByChar: Record<string, string | null> = {
  ".": null,
  n: founderEmber.night,
  s: founderEmber.slate,
  p: founderEmber.paper,
  w: founderEmber.wood,
  d: founderEmber.darkwood,
  e: founderEmber.ember,
  f: founderEmber.flame,
  m: founderEmber.plum,
  b: schoolAccent.sky,
  v: schoolAccent.navy,
  k: schoolAccent.schoolSlate,
  i: schoolAccent.ink,
};

export const founderSwatches = [
  { name: "night", hex: founderEmber.night },
  { name: "slate", hex: founderEmber.slate },
  { name: "paper", hex: founderEmber.paper },
  { name: "wood", hex: founderEmber.wood },
  { name: "darkwood", hex: founderEmber.darkwood },
  { name: "ember", hex: founderEmber.ember },
  { name: "flame", hex: founderEmber.flame },
  { name: "plum", hex: founderEmber.plum },
] as const;

export const schoolSwatches = [
  { name: "sky", hex: schoolAccent.sky },
  { name: "navy", hex: schoolAccent.navy },
  { name: "school slate", hex: schoolAccent.schoolSlate },
  { name: "ink", hex: schoolAccent.ink },
] as const;

export function applyPalette(root: HTMLElement) {
  const vars: Record<string, string> = {
    "--night": founderEmber.night,
    "--slate": founderEmber.slate,
    "--paper": founderEmber.paper,
    "--wood": founderEmber.wood,
    "--darkwood": founderEmber.darkwood,
    "--ember": founderEmber.ember,
    "--flame": founderEmber.flame,
    "--plum": founderEmber.plum,
    "--sky": schoolAccent.sky,
    "--navy": schoolAccent.navy,
    "--school-slate": schoolAccent.schoolSlate,
    "--ink": schoolAccent.ink,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
