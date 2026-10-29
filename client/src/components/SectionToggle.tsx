import { useRef, type KeyboardEvent } from "react";
import type { DoorSection } from "../fixtures/doors";

type SectionToggleProps = {
  section: DoorSection;
  onChange: (next: DoorSection, focus: boolean) => void;
};

export function SectionToggle({ section, onChange }: SectionToggleProps) {
  const workRef = useRef<HTMLButtonElement>(null);
  const schoolRef = useRef<HTMLButtonElement>(null);

  function move(next: DoorSection) {
    onChange(next, true);
    queueMicrotask(() => {
      (next === "work" ? workRef : schoolRef).current?.focus();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(section === "work" ? "school" : "work");
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(section === "work" ? "school" : "work");
    } else if (event.key === "Home") {
      event.preventDefault();
      move("work");
    } else if (event.key === "End") {
      event.preventDefault();
      move("school");
    }
  }

  return (
    <div
      className="toggle"
      role="tablist"
      aria-label="Work or School"
      onKeyDown={onKeyDown}
    >
      <button
        ref={workRef}
        id="tab-work"
        type="button"
        role="tab"
        aria-selected={section === "work"}
        aria-controls="hall-panel"
        tabIndex={section === "work" ? 0 : -1}
        onClick={() => onChange("work", false)}
      >
        Work
      </button>
      <button
        ref={schoolRef}
        id="tab-school"
        type="button"
        role="tab"
        aria-selected={section === "school"}
        aria-controls="hall-panel"
        tabIndex={section === "school" ? 0 : -1}
        onClick={() => onChange("school", false)}
      >
        School
      </button>
    </div>
  );
}
