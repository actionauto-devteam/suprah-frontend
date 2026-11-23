"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtShortDateTimeMDT } from "@/lib/timezone";
import {
  fetchLeadHandlers,
  type LeadHandlerCounts,
  type LeadHandlerPerson,
  type LeadHandlerRole,
} from "@/lib/api/leadHandlers";

const ROLE_LABEL: Record<LeadHandlerRole, string> = {
  first_reply: "First reply",
  took_over: "Took over",
  follow_up: "Follow-up",
  assigned: "Assigned",
  was_assigned: "Was assigned",
};

const ROLE_TONE: Record<LeadHandlerRole, string> = {
  first_reply: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  took_over: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  follow_up: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  assigned: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  was_assigned: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const OPENERS_SHOWN = 5;

const COUNT_WORDS: Array<[keyof LeadHandlerCounts, string, string]> = [
  ["texts", "text", "texts"],
  ["chats", "chat message", "chat messages"],
  ["emails", "email", "emails"],
  ["callsMade", "call made", "calls made"],
  ["callsAnswered", "call answered", "calls answered"],
  ["notes", "note", "notes"],
  ["statusChanges", "status change", "status changes"],
];

function countsText(person: LeadHandlerPerson): string {
  const parts = COUNT_WORDS.filter(([key]) => person.counts[key] > 0).map(
    ([key, one, many]) => `${person.counts[key]} ${person.counts[key] === 1 ? one : many}`,
  );
  if (parts.length) return parts.join(" · ");
  if (person.roles.includes("took_over")) return "Paused the AI to handle it";
  if (person.roles.includes("assigned") || person.roles.includes("was_assigned")) return "No messages yet";
  return "";
}

function timeText(person: LeadHandlerPerson): string {
  if (!person.firstAt) return "";
  const first = fmtShortDateTimeMDT(person.firstAt);
  if (!person.lastAt || person.lastAt === person.firstAt) return first;
  return `${first} to ${fmtShortDateTimeMDT(person.lastAt)}`;
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part.match(/[a-z0-9]/i)?.[0] || "")
    .filter(Boolean);
  return ((letters[0] || "") + (letters.length > 1 ? letters[letters.length - 1] : "")).toUpperCase() || "?";
}

export function LeadHandlersCard({ leadId, refreshKey }: { leadId: string; refreshKey?: string }) {
  const query = useQuery({
    queryKey: ["lead-handlers", leadId, refreshKey || ""],
    queryFn: () => fetchLeadHandlers(leadId),
    enabled: Boolean(leadId),
    staleTime: 15_000,
    retry: 1,
    placeholderData: (previous) => previous,
  });
  const data = query.data;
  const titleId = `lead-handled-by-${leadId}`;

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={query.isLoading || undefined}
      data-testid="lead-handled-by"
      className="min-w-0 rounded-xl border p-3"
      style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}
    >
      <h3 id={titleId} className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
        Handled by
      </h3>
      <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-tertiary)" }}>
        Everyone on the team who worked with this customer, in order.
      </p>

      {query.isLoading ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-2.5">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full" style={{ background: "var(--surface-2)" }} />
              <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: "var(--surface-2)" }} />
                <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: "var(--surface-2)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : query.isError || !data ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span>Couldn&apos;t load who handled this customer.</span>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex min-h-8 items-center gap-1 rounded-md border px-2 font-semibold"
            style={{ borderColor: "var(--border-1)" }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      ) : data.people.length === 0 ? (
        <p className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          No one from the team has contacted this customer yet.
        </p>
      ) : (
        <ol className="mt-2.5 space-y-2.5" data-testid="lead-handled-by-list">
          {data.people.map((person) => {
            const summary = countsText(person);
            const when = timeText(person);
            return (
              <li key={person.key} className="flex min-w-0 gap-2.5" data-testid="lead-handled-by-person">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    person.isAi
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {person.isAi ? <Bot className="h-3.5 w-3.5" /> : initials(person.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <span className="min-w-0 break-words text-xs font-semibold [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>
                      {person.name}
                    </span>
                    {person.isAi && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        AI
                      </span>
                    )}
                    {person.roles.map((role) => (
                      <span key={role} className={cn("rounded-full border px-1.5 py-px text-[10px] font-semibold", ROLE_TONE[role])}>
                        {ROLE_LABEL[role]}
                      </span>
                    ))}
                  </div>
                  {summary && (
                    <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                      {summary}
                    </p>
                  )}
                  {when && (
                    <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {when}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {data?.opened && data.opened.people.length > 0 && (
        <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--border-1)" }} data-testid="lead-opened-by">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>
            Opened by
          </h4>
          <ol className="mt-1.5 space-y-1.5">
            {data.opened.people.slice(0, OPENERS_SHOWN).map((opener, index) => (
              <li key={`${opener.at}-${index}`} className="flex min-w-0 items-center justify-between gap-2" data-testid="lead-opened-by-person">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {opener.name}
                  </span>
                  {index === 0 && (
                    <span className={cn("shrink-0 rounded-full border px-1.5 py-px text-[10px] font-semibold", ROLE_TONE.first_reply)}>
                      First
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                  {fmtShortDateTimeMDT(opener.at)}
                </span>
              </li>
            ))}
          </ol>
          {data.opened.total > OPENERS_SHOWN && (
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              +{data.opened.total - OPENERS_SHOWN} more
            </p>
          )}
        </div>
      )}

      {data && data.assignments.length > 0 && (
        <details className="group mt-3 border-t pt-2" style={{ borderColor: "var(--border-1)" }} data-testid="lead-assignment-history">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>
            Assignment history ({data.assignments.length})
            <span className="text-[10px] transition group-open:rotate-180" aria-hidden="true">▾</span>
          </summary>
          <ul className="mt-1 space-y-1.5">
            {data.assignments.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                {entry.toName ? `Assigned to ${entry.toName}` : "Unassigned"}
                {entry.byName ? ` by ${entry.byName}` : ""}
                <span className="block text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {fmtShortDateTimeMDT(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
