import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useParams } from "react-router-dom";
import { Sprite } from "../design/Sprite";
import { agent, forgeNote } from "../design/sprites";
import { useDoorShut } from "../hall/doorApi";
import { useFormFactor } from "../hooks/useFormFactor";
import { useStillFrame } from "../hooks/useStillFrame";
import { LibraryShelf } from "../library/LibraryShelf";
import { DeskGrid } from "../study/DeskGrid";
import { PaperWash, StudyStage, type PaperPose } from "../study/StudyStage";
import {
  appendFounderLine,
  formatMachineTime,
  isMachineLine,
  linesForAgent,
  subscribeChat,
  teamById,
  type AgentStatus,
  type ChatLine,
  type MachineLine,
} from "../team/chatStore";

type TeamRoomProps = {
  teamId?: string;
  preview?: boolean;
};

type Drawer = "library" | "team" | null;
type TabKey = string;

const STAMP = "generated · not verified";

export function TeamRoom({ teamId: teamIdProp, preview = false }: TeamRoomProps) {
  const params = useParams();
  const teamId = teamIdProp ?? params.id ?? "";
  const team = teamById(teamId);
  const shut = useDoorShut();
  const layout = useFormFactor();
  const still = useStillFrame();
  const agentScale = layout === "portrait" ? 3 : 2;
  const lampScale = layout === "portrait" ? 4 : 3;
  const [tab, setTab] = useState<TabKey>("ceo");
  const [fromDesks, setFromDesks] = useState(false);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<MachineLine["action"] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pose, setPose] = useState<PaperPose>("desk");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expandTimer = useRef<number | null>(null);
  const knownAgent =
    !!team && tab !== "overview" && team.agents.some((item) => item.id === tab) ? tab : "ceo";
  const lines = useSyncExternalStore(
    subscribeChat,
    () => linesForAgent(teamId, knownAgent),
    () => linesForAgent(teamId, knownAgent),
  );

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !pending) return;
    try {
      if (!node.open) node.showModal();
    } catch {
      node.setAttribute("open", "");
    }
    return () => {
      if (node.open && typeof node.close === "function") node.close();
      node.removeAttribute("open");
    };
  }, [pending]);

  useEffect(() => {
    return () => {
      if (expandTimer.current !== null) window.clearTimeout(expandTimer.current);
    };
  }, []);

  useEffect(() => {
    if (pose !== "lifted") return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || pending) return;
      setPose("desk");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pose, pending]);

  if (!team) {
    return (
      <main className="study">
        <header className="study-bar">
          <button type="button" className="text-link" onClick={() => shut(teamId)}>
            Back
          </button>
        </header>
        <h1>This team is not on the desk.</h1>
      </main>
    );
  }

  const selected = tab === "overview" || team.agents.some((item) => item.id === tab) ? tab : "ceo";
  const lampStatus: AgentStatus =
    selected === "overview" || drawer
      ? "idle"
      : (team.agents.find((agent) => agent.id === selected)?.status ?? "idle");
  const agentRecord = team.agents.find((item) => item.id === selected);
  const agentName = agentRecord?.name ?? "Agent";
  const onChat = !drawer && selected !== "overview";
  const showGrid = selected === "overview" && !drawer;
  const figureName = selected === "ceo" || selected === "overview" ? "CEO" : agentName;
  const panelTitle = drawer
    ? drawer === "library"
      ? "Library"
      : "Team"
    : selected === "overview"
      ? "Overview"
      : `${agentName} chat`;
  const composerLabel = selected === "ceo" ? "Message the CEO" : `Message ${agentName}`;
  const composerId = preview || !onChat ? undefined : selected === "ceo" ? "ceo-composer" : `composer-${selected}`;

  const settle = (choice: "approve" | "decline") => {
    setPending(null);
    setNotice(choice === "approve" ? "Approved. Nothing ran." : "Declined. Nothing ran.");
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || selected === "overview") return;
    appendFounderLine(team.id, body, selected);
    setDraft("");
  };

  const openDesk = (agentId: string) => {
    const land = () => {
      if (expandTimer.current !== null) {
        window.clearTimeout(expandTimer.current);
        expandTimer.current = null;
      }
      setExpanding(null);
      setFromDesks(true);
      setTab(agentId);
      setDrawer(null);
      setPose("desk");
      setNotice(null);
    };
    if (still) {
      land();
      return;
    }
    setExpanding(agentId);
    if (expandTimer.current !== null) window.clearTimeout(expandTimer.current);
    expandTimer.current = window.setTimeout(land, 280);
  };

  const leave = () => {
    if (drawer === "library") {
      setDrawer(null);
      setPose("desk");
      return;
    }
    if (fromDesks && selected !== "overview") {
      if (expandTimer.current !== null) {
        window.clearTimeout(expandTimer.current);
        expandTimer.current = null;
      }
      setExpanding(null);
      setFromDesks(false);
      setTab("overview");
      setDrawer(null);
      setPose("desk");
      setPending(null);
      return;
    }
    shut(team.id);
  };

  const lift = () => setPose("lifted");

  const onPaperClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, textarea, input, select, label")) return;
    lift();
  };

  const onPaperKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, textarea, input, select, a")) return;
    if (target !== event.currentTarget && !target.classList.contains("paper-log")) return;
    event.preventDefault();
    lift();
  };

  const tabs: { id: string; label: string }[] = [
    ...team.agents.map((agent) => ({ id: agent.id, label: agent.name })),
    { id: "overview", label: "Overview" },
  ];

  return (
    <main
      className="study"
      data-room={drawer === "library" ? "library" : "team"}
      data-lamp={lampStatus}
      data-paper={pose}
      data-preview={preview ? "true" : "false"}
    >
      <header className="study-bar">
        <button type="button" className="text-link" onClick={leave}>
          Back
        </button>
        <p className="study-team">{team.name}</p>
        <nav className="study-side" aria-label="Inside the team">
          <button type="button" aria-pressed={drawer === "library"} onClick={() => setDrawer("library")}>
            Library
          </button>
          <button type="button" aria-pressed={drawer === "team"} onClick={() => setDrawer("team")}>
            Team
          </button>
        </nav>
      </header>
      <div
        className="study-tabs"
        role="tablist"
        aria-label="Team sections"
        onKeyDown={(event) => {
          if (preview) return;
          const index = tabs.findIndex((item) => item.id === selected);
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
            return;
          }
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          setTab(tabs[next].id);
          setDrawer(null);
          setFromDesks(false);
          setPose("desk");
          setExpanding(null);
          const control = preview ? null : document.getElementById(`team-tab-${tabs[next].id}`);
          control?.focus();
        }}
      >
        {tabs.map((item) => {
          const active = item.id === selected && !drawer;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={preview ? undefined : `team-tab-${item.id}`}
              aria-selected={active}
              aria-controls={preview ? undefined : "study-panel"}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                setTab(item.id);
                setDrawer(null);
                setFromDesks(false);
                setPose("desk");
                setExpanding(null);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="study-scene">
        {drawer === "library" ? (
          <LibraryShelf teamId={team.id} preview={preview} />
        ) : showGrid ? (
          <DeskGrid
            agents={team.agents}
            still={still}
            expandingId={expanding}
            panelId={preview ? undefined : "study-panel"}
            labelledBy={preview ? undefined : "team-tab-overview"}
            onOpen={openDesk}
          />
        ) : (
        <StudyStage
          lampStatus={lampStatus}
          lampScale={lampScale}
          pose={pose}
          still={still}
          behind={
            <figure className="figure ceo-stand">
              <Sprite rows={agent} scale={agentScale} title={figureName} />
              <figcaption>{figureName}</figcaption>
            </figure>
          }
          onDesk={
            selected === "ceo" ? (
              <figure className="figure note-spot">
                <Sprite rows={forgeNote} scale={layout === "portrait" ? 4 : 3} title="Forge note" />
              </figure>
            ) : null
          }
          paper={
            <div
              className={lampStatus === "working" ? "paper is-lit" : "paper"}
              onClick={onPaperClick}
              onKeyDown={onPaperKeyDown}
            >
              <PaperWash status={lampStatus} />
              {pose === "lifted" ? (
                <button
                  type="button"
                  className="set-down"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPose("desk");
                  }}
                >
                  Set it down
                </button>
              ) : null}
              <div
                className="paper-log"
                id={preview ? undefined : "study-panel"}
                role="tabpanel"
                aria-labelledby={!preview && !drawer ? `team-tab-${selected}` : undefined}
                tabIndex={0}
                aria-label="Paper chat"
              >
                <h1>{panelTitle}</h1>
                {drawer ? (
                  <p className="placeholder-copy">{drawerCopy(drawer)}</p>
                ) : (
                  <ChatSheet
                    lines={lines}
                    notice={notice}
                    onReview={(action) => {
                      setNotice(null);
                      setPending(action);
                    }}
                  />
                )}
                {drawer ? (
                  <button type="button" className="text-link sheet-close" onClick={() => setDrawer(null)}>
                    Close
                  </button>
                ) : null}
              </div>
              {onChat ? (
                <form className="paper-form" onSubmit={send} onClick={(event) => event.stopPropagation()}>
                  <label className="composer-label" htmlFor={composerId}>
                    {composerLabel}
                    <textarea
                      id={composerId}
                      ref={composerRef}
                      rows={layout === "portrait" ? 3 : 2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onFocus={lift}
                    />
                  </label>
                  <button type="submit">Send</button>
                </form>
              ) : null}
            </div>
          }
        />
        )}
      </div>
      {!preview && pending ? (
        <dialog ref={dialogRef} className="approval" aria-labelledby="approval-title" aria-modal="true">
          <h2 id="approval-title">Approve this action?</h2>
          <p>{pending.label}</p>
          <p>This would {pending.kind}. Approve and Decline stay on this sheet. Nothing is sent.</p>
          <div className="approval-actions">
            <button type="button" onClick={() => settle("decline")}>
              Decline
            </button>
            <button type="button" className="approve" onClick={() => settle("approve")}>
              Approve
            </button>
          </div>
        </dialog>
      ) : null}
    </main>
  );
}

function drawerCopy(drawer: Exclude<Drawer, null>): string {
  if (drawer === "library") return "Human notes for this team.";
  return "Team is a stub. The roster beyond this chat comes later.";
}

function ChatSheet({
  lines,
  notice,
  onReview,
}: {
  lines: ChatLine[];
  notice: string | null;
  onReview: (action: NonNullable<MachineLine["action"]>) => void;
}) {
  return (
    <div className="transcript" role="log" aria-live="polite">
      {lines.map((line) =>
        isMachineLine(line) ? (
          <article key={line.id} className="machine-line">
            <p>{line.body}</p>
            <p className="stamp">
              <span className="source">{line.source}</span>
              <time dateTime={line.timestamp}>{formatMachineTime(line.timestamp)}</time>
              <span className="unverified">{STAMP}</span>
            </p>
            {line.action ? (
              <button
                type="button"
                className="action-chip"
                onClick={(event) => {
                  event.stopPropagation();
                  onReview(line.action!);
                }}
              >
                {line.action.label}
              </button>
            ) : null}
          </article>
        ) : (
          <article key={line.id} className="founder-line">
            <p className="who">You</p>
            <p>{line.body}</p>
          </article>
        ),
      )}
      {notice ? (
        <p className="ran-nothing" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
