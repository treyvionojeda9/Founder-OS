export type LearningTask = {
  id: string;
  title: string;
  detail: string;
};

export type LearningAssignment = {
  id: string;
  title: string;
  prompt: string;
};

/** Fixture path for one school door. There is no course structure behind this. */
export type LearningPath = {
  doorId: string;
  title: string;
  task: LearningTask;
  assignment?: LearningAssignment;
};

export const learningPaths: readonly LearningPath[] = [
  {
    doorId: "reading-room",
    title: "Reading Room path",
    task: {
      id: "task-one-page",
      title: "Sit with one page",
      detail: "Mark a sentence you want to remember. This task is a fixture.",
    },
    assignment: {
      id: "assign-margin",
      title: "Margin key",
      prompt: "Write that sentence in your own words.",
    },
  },
  {
    doorId: "field-notes",
    title: "Field Notes path",
    task: {
      id: "task-notice",
      title: "Name one thing you noticed",
      detail: "A fixture task. Nothing else is loaded on this desk.",
    },
  },
];

export function learningPathFor(doorId: string): LearningPath | null {
  return learningPaths.find((path) => path.doorId === doorId) ?? null;
}
