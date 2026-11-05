import { founderEmber } from "./palette";

/**
 * Press Start 2P is a bitmap face. Its cell is 8px, so every step is an
 * integer scale of that cell: 1× meta, 2× body, 3× title, 4× display.
 * Whole CSS pixels only. No fractional sizes.
 */
export const TYPE_CELL = 8;

export const typeScale = {
  meta: 8,
  body: 16,
  title: 24,
  display: 32,
} as const;

/** Line boxes on the same 8px grid, tall enough that the bitmap does not clip. */
export const typeLine = {
  meta: 16,
  body: 24,
  title: 40,
  display: 56,
} as const;

export const pixelFont = '"Press Start 2P", monospace';

export type StatusName = "working" | "idle" | "failed";

/** Working / Idle / Failed stay inside Founder Ember. Failed is plum, not black on white. */
export const statusChip: Record<StatusName, { background: string; color: string; border: string }> = {
  working: { background: founderEmber.ember, color: founderEmber.night, border: founderEmber.darkwood },
  idle: { background: founderEmber.slate, color: founderEmber.paper, border: founderEmber.darkwood },
  failed: { background: founderEmber.plum, color: founderEmber.paper, border: founderEmber.darkwood },
};

export function applyType(root: HTMLElement) {
  const vars: Record<string, string> = {
    "--font-pixel": pixelFont,
    "--type-meta": `${typeScale.meta}px`,
    "--type-body": `${typeScale.body}px`,
    "--type-title": `${typeScale.title}px`,
    "--type-display": `${typeScale.display}px`,
    "--leading-meta": `${typeLine.meta}px`,
    "--leading-body": `${typeLine.body}px`,
    "--leading-title": `${typeLine.title}px`,
    "--leading-display": `${typeLine.display}px`,
    "--chip-working-bg": statusChip.working.background,
    "--chip-working-fg": statusChip.working.color,
    "--chip-working-border": statusChip.working.border,
    "--chip-idle-bg": statusChip.idle.background,
    "--chip-idle-fg": statusChip.idle.color,
    "--chip-idle-border": statusChip.idle.border,
    "--chip-failed-bg": statusChip.failed.background,
    "--chip-failed-fg": statusChip.failed.color,
    "--chip-failed-border": statusChip.failed.border,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
