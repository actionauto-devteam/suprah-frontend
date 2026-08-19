"use client";

import * as React from "react";
import {
  AlertCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Plus,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReservedChannel = "sms" | "call";

const FILTERS: Record<ReservedChannel, string[]> = {
  sms: ["All", "Unread", "Sent"],
  call: ["All", "Missed", "Incoming", "Outgoing"],
};

function ReservedComposerModal({
  channel,
  onClose,
}: {
  channel: ReservedChannel;
  onClose: () => void;
}) {
  const isSms = channel === "sms";
  const Icon = isSms ? Smartphone : PhoneCall;
  const [recipient, setRecipient] = React.useState("");
  const [body, setBody] = React.useState("");

  return (
    <div
      className="sm5-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sm5-modal sm5-sheet flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
        onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <div
          className="sm5-modal-header flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-1)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
            <div className="min-w-0">
              <h2 className="sm5-title-lg truncate" style={{ fontSize: 16, color: "var(--text-primary)" }}>
                {isSms ? "New SMS" : "New Call"}
              </h2>
              <p className="sm5-supporting mt-1 truncate" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                Composer layout ready for the approved integration
              </p>
            </div>
          </div>
          <button onClick={onClose} className="sm5-icon-btn h-7 w-7 shrink-0" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4 sm5-scroll">
          <div>
            <label className="sm5-field-label">
              Recipient
            </label>
            <input
              autoFocus
              value={recipient}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRecipient(event.target.value)}
              placeholder="Phone number"
              className="sm5-input h-10 w-full px-3 text-sm"
            />
          </div>

          <div>
            <label className="sm5-field-label">
              {isSms ? "Message" : "Call note"}
            </label>
            <textarea
              value={body}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)}
              placeholder={isSms ? "Write your message…" : "Optional context for the call…"}
              rows={isSms ? 6 : 4}
              className="sm5-input min-h-28 w-full resize-y px-3 py-2.5 text-sm"
            />
          </div>

          <div
            className="sm5-helper-card flex items-start gap-2 px-3 py-2.5"
            style={{
              background: "var(--accent-muted)",
              borderColor: "rgba(52,201,125,0.2)",
            }}
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              This composer is intentionally presentation-only until the approved {isSms ? "SMS" : "calling"} provider and API contract are connected. Nothing is sent or started from this modal yet.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="sm5-btn flex h-10 w-full items-center justify-center gap-2"
            style={{ fontSize: 13 }}
            title="Available after the approved integration is connected"
          >
            <Icon className="h-4 w-4" />
            {isSms ? "Send SMS" : "Start Call"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReservedCommunicationTab({
  channel,
}: {
  channel: ReservedChannel;
}) {
  const isSms = channel === "sms";
  const Icon = isSms ? Smartphone : PhoneCall;
  const [query, setQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("All");
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [railCollapsed, setRailCollapsed] = React.useState(false);

  React.useEffect(() => {
    setRailCollapsed(
      localStorage.getItem(`sm5_${channel}_rail_collapsed`) === "1",
    );
  }, [channel]);

  const toggleRail = () => {
    setRailCollapsed((current) => {
      const next = !current;
      localStorage.setItem(
        `sm5_${channel}_rail_collapsed`,
        next ? "1" : "0",
      );
      return next;
    });
  };

  const filters = FILTERS[channel];

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <aside
        className={cn(
          "sm5-rail flex w-full flex-col transition-[width] duration-200 lg:shrink-0",
          railCollapsed ? "lg:w-16" : "lg:w-80",
        )}
      >
        <div className={cn(
          "sm5-toolbar gap-2",
          railCollapsed ? "lg:justify-center lg:px-2" : "px-3",
        )}>
          <div className={cn(
            "relative min-w-0 flex-1",
            railCollapsed && "lg:hidden",
          )}>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder={isSms ? "Search SMS conversations…" : "Search call history…"}
              className="sm5-input h-9 w-full pl-9 pr-3 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className={cn(
              "sm5-btn flex h-9 shrink-0 items-center justify-center gap-1.5",
              railCollapsed ? "lg:w-9 lg:px-0" : "px-3",
            )}
            style={{ fontSize: 12 }}
            title={isSms ? "New SMS" : "New Call"}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className={cn(railCollapsed && "lg:hidden")}>New</span>
          </button>
        </div>

        <div
          className={cn(
            "shrink-0 border-b border-[var(--border-1)] px-3 py-2",
            railCollapsed && "lg:hidden",
          )}
        >
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm5-scroll">
            {filters.map((filter: string) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "sm5-pill shrink-0 px-2.5 py-1.5 text-[10px] font-bold",
                  activeFilter === filter &&
                    "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm5-scroll">
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className={cn(
              "sm5-conv-row group flex w-full items-center gap-2.5 px-3 py-3 text-left",
              railCollapsed && "lg:justify-center lg:px-2",
            )}
            title={railCollapsed ? (isSms ? "SMS" : "Call") : undefined}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-[1.04]"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className={cn("min-w-0 flex-1", railCollapsed && "lg:hidden")}>
              <p className="sm5-title-sm">
                {query.trim()
                  ? `No ${isSms ? "SMS" : "call"} result for “${query.trim()}”`
                  : `No ${isSms ? "SMS conversations" : "call history"} yet`}
              </p>
              <p className="sm5-supporting mt-1 truncate">
                {isSms
                  ? "Open the composer layout or connect the approved SMS integration."
                  : "Open the call composer layout or connect the approved calling integration."}
              </p>
            </div>

            <div
              className={cn(
                "ml-1 flex shrink-0 flex-col items-end gap-1.5 self-stretch py-0.5",
                railCollapsed && "lg:hidden",
              )}
            >
              <span
                className="sm5-mono min-h-4 whitespace-nowrap font-semibold"
                style={{ fontSize: 11.5, color: "var(--text-disabled)" }}
                title="No live activity date until the communications integration is connected"
              >
                —
              </span>
              <span
                className="shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  color: "var(--text-tertiary)",
                  borderColor: "var(--border-2)",
                  background: "var(--surface-2)",
                }}
                title="No live unread data until the communications integration is connected"
              >
                0 unread
              </span>
            </div>
          </button>
        </div>

        <div
          className="hidden shrink-0 py-2.5 lg:block"
          style={{ borderTop: "1px solid var(--border-1)" }}
        >
          <button
            type="button"
            onClick={toggleRail}
            className={cn(
              "sm5-icon-btn h-9",
              railCollapsed
                ? "mx-auto w-9"
                : "mx-2.5 flex w-[calc(100%-1.25rem)] items-center justify-start gap-3 px-3.5",
            )}
            title={railCollapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            {railCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span style={{ fontSize: 12.5, letterSpacing: "0.045em" }}>
                  Minimize
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="hidden min-w-0 flex-1 flex-col lg:flex">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-150 hover:scale-[1.03]"
            style={{ background: "var(--accent-muted)", border: "1px solid rgba(52,201,125,0.22)" }}
          >
            <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <p className="sm5-display font-bold" style={{ fontSize: 15, color: "var(--text-primary)" }}>
            {isSms ? "SMS workspace" : "Call workspace"}
          </p>
          <p className="max-w-sm text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            The list, search, filters, hover behavior and composer presentation now follow the same Suprah One Desk pattern. Live records and send/call actions remain disconnected until an approved integration is supplied.
          </p>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="sm5-pill flex h-9 items-center gap-1.5 px-3"
            style={{ fontSize: 12 }}
          >
            <Plus className="h-3.5 w-3.5" />
            Open {isSms ? "SMS" : "Call"} composer
          </button>
        </div>
      </main>

      {composerOpen && (
        <ReservedComposerModal
          channel={channel}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
}