import { useEffect, useState } from "react";

export const PAPER_SETTLE_MS = 240;

type Pose = "desk" | "lifted";

/**
 * One short settle when a sheet lifts or is set down.
 * The first pose does not play, so opening a room does not bounce the paper.
 * Reduced motion and e-ink return null: the sheet cuts to the new pose.
 */
export function usePaperSettle(pose: Pose, still: boolean): "lift" | "set" | null {
  const [seen, setSeen] = useState(pose);
  const [settle, setSettle] = useState<"lift" | "set" | null>(null);

  if (pose !== seen) {
    setSeen(pose);
    setSettle(still ? null : pose === "lifted" ? "lift" : "set");
  } else if (still && settle) {
    setSettle(null);
  }

  useEffect(() => {
    if (!settle || still) return;
    const id = window.setTimeout(() => setSettle(null), PAPER_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [settle, still]);

  if (still) return null;
  return settle;
}
