import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Sprite } from "../design/Sprite";
import { mailHand, mailSeal } from "../design/sprites/mailMarks";
import { subscribeChat, type TeamAgent } from "../team/chatStore";
import {
  filterMailItems,
  mailItemsFor,
  mailMark,
  mailSlotName,
  mailSlotVisibleLabel,
  stepMailIndex,
  type MailItem,
} from "./mailSlot";

type MailTrayProps = {
  teamId: string;
  agents: readonly TeamAgent[];
  still: boolean;
  onOpen: (item: MailItem) => void;
};

function useMailItems(teamId: string): readonly MailItem[] {
  return useSyncExternalStore(
    subscribeChat,
    () => mailItemsFor(teamId),
    () => mailItemsFor(teamId),
  );
}

function slipDomId(item: MailItem): string {
  return `mail-slip-${item.id.replace(/[^a-z0-9_-]+/gi, "-")}`;
}

/**
 * A wall mail slot and the wooden in-tray behind it.
 * J/K move the slip. Enter opens the desk or the existing approval stamp.
 * Escape returns focus to the slot. This fixture never approves and never writes a vault.
 * The mouth stays on the wall when the top bar recedes.
 */
export function MailTray({ teamId, agents, still, onOpen }: MailTrayProps) {
  const items = useMailItems(teamId);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [index, setIndex] = useState(0);
  const mouthRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = filterMailItems(items, filter);
  const selected = filtered[Math.min(index, Math.max(filtered.length - 1, 0))] ?? null;
  const frames = still ? "1" : "4";

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open, filter]);

  const close = () => {
    setOpen(false);
    mouthRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The ledger, an approval stamp, and a native dialog sit above the tray.
      if (document.querySelector(".command-ledger, .approval-overlay, .board-overlay, dialog[open]")) return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    setFilter("all");
    setIndex(0);
    setOpen(true);
  };

  const openItem = (item: MailItem) => {
    setOpen(false);
    onOpen(item);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "j" || event.key === "J") {
      event.preventDefault();
      setIndex((current) => stepMailIndex(current, filtered.length, 1));
      return;
    }
    if (event.key === "k" || event.key === "K") {
      event.preventDefault();
      setIndex((current) => stepMailIndex(current, filtered.length, -1));
      return;
    }
    if (event.key !== "Enter") return;
    if (target.closest(".mail-mouth, .mail-filter")) return;
    if (!selected) return;
    event.preventDefault();
    event.stopPropagation();
    openItem(selected);
  };

  return (
    <div
      className="mail-slot"
      data-scene="mail-slot"
      data-open={open ? "true" : "false"}
      data-still={still ? "true" : "false"}
      data-frames={frames}
      data-count={items.length}
      onKeyDown={onKeyDown}
    >
      <button
        ref={mouthRef}
        type="button"
        className="mail-mouth"
        data-discoverable="mouth"
        aria-label={mailSlotName(items.length)}
        aria-expanded={open}
        aria-controls={open ? "mail-tray" : undefined}
        onClick={toggle}
      >
        <span className="mail-board" aria-hidden="true">
          <span className="mail-screw" data-corner="nw" />
          <span className="mail-screw" data-corner="ne" />
          <span className="mail-peek" data-show={items.length > 0 ? "true" : "false"}>
            <span className="peek-sheet" />
            {items.length > 1 ? <span className="peek-sheet peek-sheet-b" /> : null}
          </span>
          <span className="mail-gap" />
          <span className="mail-lip" />
          <span className="mail-screw" data-corner="sw" />
          <span className="mail-screw" data-corner="se" />
        </span>
        <span className="mail-plaque">
          <span className="mail-plaque-glyph" aria-hidden="true">
            <Sprite rows={items.some((item) => item.kind === "waiting") ? mailHand : mailSeal} scale={2} title="" />
          </span>
          <span className="mail-caption">{mailSlotVisibleLabel(items.length)}</span>
        </span>
      </button>
      {open ? (
        <div
          id="mail-tray"
          className="mail-tray"
          data-material="desk"
          data-empty={filtered.length === 0 ? "true" : "false"}
          data-frames={frames}
        >
          <div className="mail-filters" role="toolbar" aria-label="Filter by agent">
            <button
              type="button"
              className="mail-filter"
              data-pin={filter === "all" ? "true" : "false"}
              aria-pressed={filter === "all"}
              onClick={() => {
                setFilter("all");
                setIndex(0);
              }}
            >
              All
            </button>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className="mail-filter"
                data-agent={agent.id}
                data-pin={filter === agent.id ? "true" : "false"}
                aria-pressed={filter === agent.id}
                onClick={() => {
                  setFilter(agent.id);
                  setIndex(0);
                }}
              >
                {agent.name}
              </button>
            ))}
          </div>
          <div
            ref={listRef}
            className="mail-list"
            role="listbox"
            aria-label="Needs you"
            tabIndex={0}
            aria-activedescendant={selected ? slipDomId(selected) : undefined}
            data-empty={filtered.length === 0 ? "true" : "false"}
          >
            {filtered.length === 0 ? (
              <p className="tray-empty">The tray is empty.</p>
            ) : (
              filtered.map((item) => {
                const mark = mailMark(item.kind);
                const isSelected = selected?.id === item.id;
                return (
                  <div
                    key={item.id}
                    id={slipDomId(item)}
                    role="option"
                    className="mail-slip"
                    aria-selected={isSelected}
                    data-kind={item.kind}
                    data-agent={item.agentId}
                    data-glyph={mark.glyph}
                    data-pattern={mark.pattern}
                    onClick={() => openItem(item)}
                  >
                    <span className="slip-glyph" aria-hidden="true">
                      <Sprite rows={mark.glyph === "hand" ? mailHand : mailSeal} scale={3} title="" />
                    </span>
                    <span className="slip-copy">
                      <span className="slip-agent">{item.agentName}</span>
                      <span className="slip-label">{item.label}</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
