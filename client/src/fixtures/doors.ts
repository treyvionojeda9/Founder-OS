import type { SpriteGrid } from "../design/sprites/types";
import { logoBook, logoCloud, logoHale, logoLocal, logoQuill } from "../design/sprites/logos";

export type DoorSection = "work" | "school";

export type Door = {
  id: string;
  name: string;
  section: DoorSection;
  logo: SpriteGrid;
};

export const doors: Door[] = [
  { id: "hale-design-lab", name: "Hale Design Lab", section: "work", logo: logoHale },
  { id: "cloud-agent-team", name: "Cloud Agent Team", section: "work", logo: logoCloud },
  { id: "local-agent-team", name: "Local Agent Team", section: "work", logo: logoLocal },
  { id: "reading-room", name: "Reading Room", section: "school", logo: logoBook },
  { id: "field-notes", name: "Field Notes", section: "school", logo: logoQuill },
];
