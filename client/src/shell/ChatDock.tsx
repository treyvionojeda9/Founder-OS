import { useEffect, useRef, useSyncExternalStore, type FormEvent } from "react";
import { StatusFrame } from "../design/StatusFrame";
import {
  appendFounderLine,
  formatMachineTime,
  isMachineLine,
  linesForAgent,
  subscribeChat,
  type ChatLine,
} from "../team/chatStore";
import type { RailAgent } from "./railAgents";

const STAMP = "generated · not verified";
const EMPTY: ChatLine[] = [];

type ChatDockProps = {
  agent: RailAgent | null;
  still: boolean;
};

/**
 * In-place chat for the selected rail agent.
 * Founder lines stay on the chat record. Nothing here writes a vault or approves.
 */
export function ChatDock({ agent, still }: ChatDockProps) {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef("");
  const lines = useSyncExternalStore(
    subscribeChat,
    () => (agent ? linesForAgent(agent.teamId, agent.id) : EMPTY),
    () => (agent ? linesForAgent(agent.teamId, agent.id) : EMPTY),
  );

  useEffect(() => {
    if (!agent) return;
    composerRef.current?.focus();
  }, [agent]);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agent) return;
    const body = draftRef.current.trim();
    if (!body) return;
    appendFounderLine(agent.teamId, body, agent.id);
    draftRef.current = "";
    const field = composerRef.current;
    if (field) field.value = "";
  };

  const title = agent ? `${agent.name} chat` : "Agent chat";

  return (
    <aside className="chat-dock" aria-label={title} data-shell-chrome="" data-agent={agent?.id ?? ""}>
      <header className="dock-head">
        <h2 className="dock-title">{agent ? agent.name : "Chat"}</h2>
        {agent ? <StatusFrame status={agent.status} still={still} density="chip" /> : null}
      </header>
      <div className="dock-log" role="log" aria-live="polite" tabIndex={0}>
        {agent ? (
          lines.map((line) =>
            isMachineLine(line) ? (
              <article key={line.id} className="dock-line" data-record="machine">
                <p>{line.body}</p>
                <p className="dock-stamp">
                  <span className="dock-source">{line.source}</span>
                  <time dateTime={line.timestamp}>{formatMachineTime(line.timestamp)}</time>
                  <span className="dock-unverified">{STAMP}</span>
                </p>
                {line.action ? (
                  <p className="dock-wait">Waiting for you. {line.action.label}. Nothing is sent.</p>
                ) : null}
              </article>
            ) : (
              <article key={line.id} className="dock-line" data-record="chat">
                <p className="dock-who">You</p>
                <p>{line.body}</p>
              </article>
            ),
          )
        ) : (
          <p className="dock-empty">Pick an agent to read the chat here.</p>
        )}
      </div>
      {agent ? (
        <form className="dock-form" onSubmit={send}>
          <label className="composer-label" htmlFor="shell-composer">
            {`Write to ${agent.name}`}
            <textarea
              id="shell-composer"
              ref={composerRef}
              rows={2}
              placeholder={`Write to ${agent.name}`}
              onChange={(event) => {
                draftRef.current = event.target.value;
              }}
            />
          </label>
          <button type="submit">Send</button>
        </form>
      ) : null}
    </aside>
  );
}
