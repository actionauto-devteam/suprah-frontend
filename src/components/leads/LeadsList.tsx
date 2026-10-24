"use client";

/**
 * LeadsList — modern, self-contained inbox list (Suprah emerald language).
 * Drops the ConversationListPanel dependency; same props as before, so
 * LeadsTab needs no changes. Light + dark via Tailwind variants.
 */

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Inbox, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./atomic/Avatar";
import { STATUS_CONFIG } from "./atomic/StatusPill";
import { SupraLeoReadButton } from "@/components/supra-leo-ai/SupraLeoReadButton";
import { useTeamMembers } from "@/hooks/useTeamPulse";
import { formatSmsRecipient } from "@/lib/api/leadComposer";

interface LeadsListProps {
  leads: any[];
  isLoading: boolean;
  total: number;
  pages: number;
  currentPage: number;
  selectedLeadId?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onLeadSelect: (lead: any) => void;
  highlightedLeadIds: Set<string>;
  itemsPerPage: number;
  sourceEmail: string;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (lead: any) => void;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  topContent?: React.ReactNode;
  focusLeadId?: string | null;
}

const listTime = (value: any) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

type ActivityTime = string | number | Date | null | undefined;

type LeadActivitySource = {
  createdAt?: ActivityTime;
  followUp?: { lastCustomerActivityAt?: ActivityTime; lastRepResponseAt?: ActivityTime } | null;
} | null | undefined;

const relativeActivity = (value: ActivityTime) => {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return "";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const latestActivity = (lead: LeadActivitySource) => {
  const created = new Date(lead?.createdAt || 0).getTime();
  const candidates = [lead?.followUp?.lastCustomerActivityAt, lead?.followUp?.lastRepResponseAt]
    .map((value) => new Date(value || 0).getTime())
    .filter((time) => Number.isFinite(time) && time > 0);
  const latest = candidates.length ? Math.max(...candidates) : 0;
  return latest > created + 60000 ? latest : 0;
};

const leadName = (lead: any) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.senderName ||
  lead?.email ||
  "Unknown";

type LeadListIdentity = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  senderName?: string;
  email?: string;
  vehicle?: {
    year?: string;
    make?: string;
    model?: string;
  };
};

const leadNameKey = (lead: LeadListIdentity) =>
  leadName(lead).trim().toLocaleLowerCase();

const leadVehicle = (lead: LeadListIdentity) =>
  [lead?.vehicle?.year, lead?.vehicle?.make, lead?.vehicle?.model]
    .filter(Boolean)
    .join(" ");

const inquiryIdentifier = (lead: LeadListIdentity) => {
  const details = [lead?.email, leadVehicle(lead)].filter(Boolean);
  const id = typeof lead?._id === "string" ? lead._id.slice(-6) : "";

  if (id) details.push(`Inquiry #${id}`);
  return details.join(" · ");
};

function AssigneeChip({
  assignedTo,
  members,
}: {
  assignedTo?: string | null;
  members: Array<{ _id: string; name: string }>;
}) {
  if (!assignedTo) return null;
  const member = members.find((candidate) => candidate._id === assignedTo);
  if (!member) return null;

  const initials =
    member.name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const firstName = member.name.split(" ")[0] || member.name;

  return (
    <span
      className="inline-flex min-w-0 max-w-[8rem] shrink items-center gap-1 rounded-full bg-emerald-500/10 py-px pl-px pr-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      title={`Assigned to ${member.name}`}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[8px] font-bold dark:bg-emerald-400/20">
        {initials}
      </span>
      <span className="truncate">
        <span className="sr-only">Assigned to </span>
        {firstName}
      </span>
    </span>
  );
}

function StatusDot({ status }: { status?: string }) {
  const config = status ? (STATUS_CONFIG as any)[status] : null;
  if (!config) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-px text-[11px] font-medium text-slate-500 dark:border-emerald-400/15 dark:bg-[#143122] dark:text-slate-400">
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export const LeadsList = React.memo(
  ({
    leads,
    isLoading,
    total,
    pages,
    currentPage,
    selectedLeadId,
    searchQuery,
    onSearchChange,
    onPageChange,
    onLeadSelect,
    highlightedLeadIds,
    itemsPerPage,
    sourceEmail,
    selectMode = false,
    selectedIds,
    onToggleSelect,
    title = "Inquiries & Leads",
    subtitle = sourceEmail,
    headerAction,
    topContent,
    focusLeadId = null,
  }: LeadsListProps) => {
    const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, total);
    const { data: teamMembers = [] } = useTeamMembers();
    const repeatedNames = React.useMemo(() => {
      const counts = new Map<string, number>();

      for (const lead of leads) {
        const key = leadNameKey(lead);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      return new Set(
        Array.from(counts.entries())
          .filter(([, count]) => count > 1)
          .map(([key]) => key),
      );
    }, [leads]);

    const rowsRef = React.useRef<HTMLDivElement | null>(null);
    const focusedRef = React.useRef<string | null>(null);

    React.useEffect(() => {
      if (!focusLeadId || focusedRef.current === focusLeadId || isLoading) return;
      const container = rowsRef.current;
      const row = container?.querySelector<HTMLElement>(`[data-lead-id="${focusLeadId}"]`);
      if (!row) return;
      focusedRef.current = focusLeadId;
      row.scrollIntoView({ block: "nearest" });
    }, [focusLeadId, leads, isLoading]);

    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0a1410]">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-3 pb-2.5 pt-2.5 dark:border-emerald-400/15 md:px-3.5 md:pb-3 md:pt-3.5">
          <div className="hidden items-center gap-2 md:flex">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[14px] font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
                  {title}
                </h2>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-px text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {total}
                </span>
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate text-[12px] text-slate-400 dark:text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 md:mt-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name, email, vehicle…"
                aria-label="Search leads"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[16px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-emerald-400/15 dark:bg-[#0f1f19] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 md:text-[14px]"
              />
            </div>
            <div className="shrink-0 md:hidden">{headerAction}</div>
          </div>

          {topContent}
        </div>

        {/* Rows */}
        <div ref={rowsRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2 max-md:pb-6">
          {isLoading ? (
            <div className="space-y-2 px-1 pt-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[74px] animate-pulse rounded-xl bg-slate-100 dark:bg-[#0f1f19]"
                />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No leads found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Try a different search or clear your filters.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {leads.map((lead) => {
                const selected = lead._id === selectedLeadId;
                const highlighted = highlightedLeadIds?.has(lead._id);
                const checked = selectedIds?.has(lead._id);
                const unread = lead?.isRead === false;
                const identifier = inquiryIdentifier(lead);
                const hasRepeatedName = repeatedNames.has(leadNameKey(lead));
                const recent = !selected && focusLeadId === lead._id;
                const vehicle = leadVehicle(lead);
                const contactLine = lead?.phone ? formatSmsRecipient(lead.phone) : lead?.email || "";
                const activityAt = latestActivity(lead);

                return (
                  <li key={lead._id} className="group relative" data-lead-id={lead._id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectMode ? onToggleSelect?.(lead) : onLeadSelect(lead)
                      }
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition md:py-2.5",
                        selected
                          ? "border-emerald-500/40 bg-emerald-500/[0.06] dark:border-emerald-400/30 dark:bg-emerald-400/[0.07]"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-emerald-400/[0.06]",
                        highlighted &&
                          !selected &&
                          "border-emerald-500/30 bg-emerald-500/[0.04]",
                        recent && "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      {/* Selected accent bar */}
                      {selected && (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-emerald-500 to-cyan-500" />
                      )}

                      {selectMode && (
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                            checked
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300 dark:border-slate-600",
                          )}
                        >
                          {checked && <CheckSquare className="h-3 w-3" />}
                        </span>
                      )}

                      <div className="relative shrink-0">
                        <Avatar
                          first={lead?.firstName}
                          last={lead?.lastName}
                          size="sm"
                        />
                        {unread && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0a1410]">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-[14px] text-slate-800 dark:text-slate-100",
                              unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {leadName(lead)}
                          </p>
                          <time className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                            {listTime(lead?.createdAt)}
                          </time>
                        </div>

                        {(contactLine || vehicle) && (
                          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                            {contactLine}
                            {contactLine && vehicle ? " · " : ""}
                            {vehicle && <span className="text-slate-600 dark:text-slate-300">{vehicle}</span>}
                          </p>
                        )}

                        {hasRepeatedName && identifier && (
                          <p
                            className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500"
                            title={identifier}
                          >
                            {identifier}
                          </p>
                        )}

                        {lead?.subject && (
                          <p className="mt-0.5 truncate text-[12px] text-slate-400 dark:text-slate-500">
                            {lead.subject}
                          </p>
                        )}

                        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 pr-7 md:pr-0">
                          {lead?.channel && (
                            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                              {lead.channel}
                            </span>
                          )}
                          {lead?.intakeIdentity === "unverified" && (
                            <span
                              className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                              title="Contact details were typed in by the visitor and not verified"
                            >
                              Unverified
                            </span>
                          )}
                          {(lead?.inquiryCount || 0) > 1 && (
                            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                              {lead.inquiryCount} inquiries
                            </span>
                          )}
                          <StatusDot status={lead?.status} />
                          <AssigneeChip assignedTo={lead?.assignedTo} members={teamMembers} />
                          {activityAt > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500" title={new Date(activityAt).toLocaleString()}>
                              Active {relativeActivity(activityAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <span className="absolute bottom-2 right-2 hidden [@media(hover:hover)]:block">
                      <span className="invisible group-hover:visible group-focus-within:visible">
                        <SupraLeoReadButton lead={lead} size="sm" />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination footer */}
        {pages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-3 py-2 dark:border-emerald-400/15">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:bg-emerald-400/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>

            <div className="text-center">
              <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                {currentPage} / {pages}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {rangeStart}–{rangeEnd} of {total}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(pages, currentPage + 1))}
              disabled={currentPage >= pages}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:bg-emerald-400/10"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  },
);

LeadsList.displayName = "LeadsList";
