import teamsJson from "../fixtures/teams.json";

export type AgentStatus = "working" | "idle" | "failed";

export type AgentAction = {
  id: string;
  kind: "spend" | "publish" | "contact" | "delete" | "write";
  label: string;
};

/** Machine Vault material. It lives in the chat transcript, not in a Human Vault note. */
export type MachineLine = {
  id: string;
  teamId: string;
  author: "machine";
  record: "machine";
  agentId: string;
  body: string;
  source: string;
  timestamp: string;
  action?: AgentAction;
};

/** Founder chat history. This is not a Human Vault note and has no vault write. */
export type FounderLine = {
  id: string;
  teamId: string;
  author: "founder";
  record: "chat";
  /** Which desk this line was written on. Unset lines stay on the CEO sheet. */
  agentId?: string;
  body: string;
};

export type ChatLine = MachineLine | FounderLine;

export type TeamAgent = {
  id: string;
  name: string;
  status: AgentStatus;
  /** Plaque line. Omitted when the fixture has no role. */
  title?: string;
};

export type TeamRecord = {
  id: string;
  name: string;
  agents: TeamAgent[];
  /** Local stapler labels. They never leave the board. */
  tools: readonly string[];
  transcript: ChatLine[];
};

const CHICAGO = "America/Chicago";

/** Display clock for machine stamps. The stored value stays an ISO instant. */
export function formatMachineTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHICAGO,
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

const STATUSES: readonly AgentStatus[] = ["working", "idle", "failed"];
const KINDS: readonly AgentAction["kind"][] = ["spend", "publish", "contact", "delete", "write"];

function asStatus(value: string): AgentStatus {
  if ((STATUSES as readonly string[]).includes(value)) return value as AgentStatus;
  throw new Error(`Unknown agent status: ${value}`);
}

function asKind(value: string): AgentAction["kind"] {
  if ((KINDS as readonly string[]).includes(value)) return value as AgentAction["kind"];
  throw new Error(`Unknown action kind: ${value}`);
}

type RawLine = {
  id: string;
  author: string;
  body: string;
  agentId?: string;
  source?: string;
  timestamp?: string;
  action?: { id: string; kind: string; label: string };
};

function asTitle(value: string | undefined): string | undefined {
  const title = value?.trim() ?? "";
  return title.length > 0 ? title : undefined;
}

function asTools(values: readonly string[] | undefined): string[] {
  if (!values) return [];
  return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

function asTeam(raw: (typeof teamsJson.teams)[number]): TeamRecord {
  return {
    id: raw.id,
    name: raw.name,
    agents: raw.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: asStatus(agent.status),
      title: asTitle(agent.title),
    })),
    tools: asTools(raw.tools),
    transcript: raw.transcript.map((line) => asLine(raw.id, line as RawLine)),
  };
}

function asLine(teamId: string, line: RawLine): ChatLine {
  if (line.author === "founder") {
    return {
      id: line.id,
      teamId,
      author: "founder",
      record: "chat",
      agentId: line.agentId,
      body: line.body,
    };
  }
  return {
    id: line.id,
    teamId,
    author: "machine",
    record: "machine",
    agentId: line.agentId ?? "ceo",
    body: line.body,
    source: line.source ?? "",
    timestamp: line.timestamp ?? "",
    action: line.action
      ? { id: line.action.id, kind: asKind(line.action.kind), label: line.action.label }
      : undefined,
  };
}

const teams: TeamRecord[] = teamsJson.teams.map(asTeam);

const extras: FounderLine[] = [];
const cache = new Map<string, ChatLine[]>();
const agentCache = new Map<string, ChatLine[]>();
const listeners = new Set<() => void>();
let sequence = 0;

function emit() {
  cache.clear();
  agentCache.clear();
  for (const listener of listeners) listener();
}

export function listTeams(): readonly TeamRecord[] {
  return teams;
}

export function teamById(id: string | undefined): TeamRecord | undefined {
  return teams.find((team) => team.id === id);
}

export function transcriptFor(teamId: string): ChatLine[] {
  const hit = cache.get(teamId);
  if (hit) return hit;
  const team = teamById(teamId);
  const next = [...(team?.transcript ?? []), ...extras.filter((line) => line.teamId === teamId)];
  cache.set(teamId, next);
  return next;
}

function belongsToAgent(line: ChatLine, agentId: string): boolean {
  if (isMachineLine(line)) return line.agentId === agentId;
  return (line.agentId ?? "ceo") === agentId;
}

/** Paper for one desk. Founder lines stay `record: "chat"` and never enter a vault. */
export function linesForAgent(teamId: string, agentId: string): ChatLine[] {
  const key = `${teamId}:${agentId}`;
  const hit = agentCache.get(key);
  if (hit) return hit;
  const next = transcriptFor(teamId).filter((line) => belongsToAgent(line, agentId));
  agentCache.set(key, next);
  return next;
}

export function subscribeChat(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function appendFounderLine(teamId: string, body: string, agentId = "ceo"): FounderLine {
  const line: FounderLine = {
    id: `chat-${++sequence}`,
    teamId,
    author: "founder",
    record: "chat",
    agentId,
    body,
  };
  extras.push(line);
  emit();
  return line;
}

export function resetChatForTests() {
  extras.length = 0;
  cache.clear();
  agentCache.clear();
  sequence = 0;
  emit();
}

export function isMachineLine(line: ChatLine): line is MachineLine {
  return line.author === "machine";
}
