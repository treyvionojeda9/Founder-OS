import { describe, expect, it } from "vitest";
import { linesForAgent } from "../team/chatStore";
import source from "./deskStamp.ts?raw";
import { currentTask, deskStampFor, formatDeskTime } from "./deskStamp";

describe("desk stamp", () => {
  it("names the agent, the task or idle, and a local clock", () => {
    const ceo = deskStampFor(
      { id: "ceo", name: "CEO", status: "working", title: "Founder" },
      linesForAgent("hale-design-lab", "ceo"),
    );
    expect(ceo.agent).toBe("CEO");
    expect(ceo.task).toBe("Publish the forge note");
    expect(ceo.updatedAt).toBe("2026-10-29T08:14:00Z");
    expect(ceo.timeLabel).toBe(formatDeskTime("2026-10-29T08:14:00Z"));
    expect(ceo.timeLabel).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}$/);

    expect(currentTask("idle", linesForAgent("hale-design-lab", "atelier"))).toBe("idle");
    expect(
      deskStampFor(
        { id: "courier", name: "Courier", status: "failed" },
        linesForAgent("hale-design-lab", "courier"),
      ).task,
    ).toBe("The lamp is out");
    expect(deskStampFor({ id: "quire", name: "Quire", status: "done" }, []).task).toBe("Done");
    expect(deskStampFor({ id: "empty", name: "Empty", status: "idle" }, []).timeLabel).toBe("—");
    expect(formatDeskTime("not-a-time")).toBe("");
  });

  it("does not write a vault", () => {
    expect(source).not.toMatch(/humanNotes|machineNotes|saveHumanEdit|saveMachineOutput|fetch\(|vault:\s*"human"/);
  });
});
