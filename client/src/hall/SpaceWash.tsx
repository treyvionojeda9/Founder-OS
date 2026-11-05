import type { SpaceId } from "./spaceSkin";
import { SpaceCanvas } from "./SpaceCanvas";

type SpaceWashProps = {
  space: SpaceId;
  part: "wall" | "desk";
};

/** Ambient wash on a wing's wall or desk. The tile fill underneath stays Founder Ember. */
export function SpaceWash({ space, part }: SpaceWashProps) {
  return <SpaceCanvas space={space} live="hold" kind={part} />;
}
