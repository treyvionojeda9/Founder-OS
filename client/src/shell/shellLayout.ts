import type { FormFactor } from "../hooks/useFormFactor";
import { agentFocus } from "../nav/deepLink";

/**
 * A column dock needs a wide center or the overview sheets run under the drawer pull.
 * Portrait, and widths under 1360, slide the dock over the center instead.
 */
export function dockModeFor(layout: FormFactor, width = 1600): "overlay" | "column" {
  if (layout === "portrait" || width < 1360) return "overlay";
  return "column";
}

/** Reduced motion snaps. Anything else may take one short step. */
export function shellMotion(still: boolean): "snap" | "slide" {
  return still ? "snap" : "slide";
}

/**
 * Center context already understands `?desk=` on Overview and a team room.
 * Every other route keeps the choice on the shell.
 * Returns the next search string, or null when the route should not change.
 */
export function shellDeskSearch(pathname: string, search: string, agentId: string): string | null {
  const overview = /^\/work\/overview\/?$/.test(pathname);
  const teamMatch = /^\/team\/([^/]+)\/?$/.exec(pathname);
  if (!overview && !teamMatch) return null;
  if (teamMatch) {
    const teamId = decodeURIComponent(teamMatch[1] ?? "");
    if (!agentFocus(teamId, agentId)) return null;
  }
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("agent");
  params.set("desk", agentId);
  const next = params.toString();
  return next ? `?${next}` : null;
}
