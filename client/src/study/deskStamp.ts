import { isMachineLine, type AgentStatus, type ChatLine, type TeamAgent } from "../team/chatStore";

/**
 * Footer clock for a desk. The stored instant stays ISO.
 * The face is the same day-month shape as a machine stamp, in the local zone.
 */
export function formatDeskTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")} ${pick("month")} ${pick("year")}, ${pick("hour")}:${pick("minute")}`;
}

function latestMachine(lines: readonly ChatLine[]) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line && isMachineLine(line)) return line;
  }
  return undefined;
}

/** What the desk is on. Idle, and a desk with nothing on the sheet, read "idle". */
export function currentTask(status: AgentStatus, lines: readonly ChatLine[]): string {
  if (status === "idle") return "idle";
  const latest = latestMachine(lines);
  if (latest?.action?.label) return latest.action.label;
  const sentence = latest?.body.split(/[.!?]/)[0]?.trim() ?? "";
  if (sentence) return sentence;
  if (status === "working") return "On the sheet";
  if (status === "waiting") return "Waiting for you";
  if (status === "done") return "Done";
  if (status === "failed") return "Stopped";
  return "idle";
}

export type DeskStamp = {
  agent: string;
  task: string;
  updatedAt: string | null;
  timeLabel: string;
};

/** Newest line on the sheet, for the overview paper. Display only. */
export function latestSheetLine(lines: readonly ChatLine[]): string {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const body = lines[index]?.body.replace(/\s+/g, " ").trim();
    if (body) return body;
  }
  return "The sheet is clear.";
}

/** Agent, task, and local update time. Display only. It does not write a vault. */
export function deskStampFor(agent: TeamAgent, lines: readonly ChatLine[]): DeskStamp {
  const latest = latestMachine(lines);
  const updatedAt = latest?.timestamp || null;
  return {
    agent: agent.name,
    task: currentTask(agent.status, lines),
    updatedAt,
    timeLabel: updatedAt ? formatDeskTime(updatedAt) : "—",
  };
}
