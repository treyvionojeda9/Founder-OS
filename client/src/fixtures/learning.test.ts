import { describe, expect, it } from "vitest";
import source from "./learning.ts?raw";
import { learningPathFor, learningPaths } from "./learning";

describe("learning fixtures", () => {
  it("gives each school door a task and a key only when an assignment is waiting", () => {
    expect(learningPathFor("reading-room")?.task.title).toBe("Sit with one page");
    expect(learningPathFor("reading-room")?.assignment?.title).toBe("Margin key");
    expect(learningPathFor("field-notes")?.task.title).toBe("Name one thing you noticed");
    expect(learningPathFor("field-notes")?.assignment).toBeUndefined();
    expect(learningPathFor("hale-design-lab")).toBeNull();
    expect(learningPaths).toHaveLength(2);
  });

  it("stays fixture copy with no course structure", () => {
    expect(source.toLowerCase()).not.toMatch(/curriculum|nas\b|graph/);
    const raw = JSON.stringify(learningPaths).toLowerCase();
    expect(raw).not.toMatch(/curriculum|nas\b|graph/);
  });
});
