import { useEffect, useRef, useState } from "react";
import { SpaceCanvas } from "./SpaceCanvas";
import { SPACE_FADE_MS, spaceSwapFrames, type SpaceId } from "./spaceSkin";

type SpaceBackdropProps = {
  space: SpaceId;
  still: boolean;
};

/** Crossfades the hall skin. Reduced motion and slow updates swap in one frame. */
export function SpaceBackdrop({ space, still }: SpaceBackdropProps) {
  const shown = useRef(space);
  const [current, setCurrent] = useState(space);
  const [previous, setPrevious] = useState<SpaceId | null>(null);
  const frames = spaceSwapFrames(still);

  useEffect(() => {
    if (shown.current !== space) {
      const from = shown.current;
      shown.current = space;
      setCurrent(space);
      setPrevious(still ? null : from);
    } else if (still) {
      setPrevious(null);
    }
    if (still) return;
    const id = window.setTimeout(() => setPrevious(null), SPACE_FADE_MS);
    return () => window.clearTimeout(id);
  }, [space, still]);

  return (
    <div
      className="space-backdrop"
      data-space={current}
      data-motion={still ? "cut" : "crossfade"}
      data-frames={frames}
      aria-hidden="true"
    >
      {previous ? <SpaceCanvas key={`out-${previous}`} space={previous} live="out" /> : null}
      <SpaceCanvas key={`in-${current}`} space={current} live={previous ? "in" : "hold"} />
    </div>
  );
}
