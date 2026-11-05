import { useSyncExternalStore } from "react";
import { audibleSpaceSound, readSpaceSound, subscribeSpaceSound, writeSpaceSound, type SpaceSound } from "./spaceSound";

function choose(next: SpaceSound) {
  writeSpaceSound(next);
  audibleSpaceSound(next);
}

/** Scene fixture. Quiet is the mute. Sound only records the pref when no samples exist. */
export function SpaceSoundToggle() {
  const mode = useSyncExternalStore(subscribeSpaceSound, readSpaceSound, () => "quiet" as SpaceSound);
  return (
    <div className="space-sound-fixture" role="group" aria-label="Quiet / Sound" data-fixture="space-sound" data-sound={mode}>
      <button type="button" className="type-meta" aria-pressed={mode === "quiet"} onClick={() => choose("quiet")}>
        Quiet
      </button>
      <button type="button" className="type-meta" aria-pressed={mode === "sound"} onClick={() => choose("sound")}>
        Sound
      </button>
    </div>
  );
}
