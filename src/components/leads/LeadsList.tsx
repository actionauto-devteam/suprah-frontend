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

const leadName = (lead: any) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.senderName ||
  lead?.email ||
  "Unknown";

function StatusDot({ status }: { status?: string }) {
  const config = status ? (STATUS_CONFIG as any)[status] : null;
  if (!config) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-px text-[10px] font-medium text-slate-500 dark:border-emerald-400/15 dark:bg-[#143122] dark:text-slate-400">
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
  }: LeadsListProps) => {
    const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const rangeEnd = Math.min(currentPage * itemsPerPage, total);

    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0a1410]">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-3.5 pb-3 pt-3.5 dark:border-emerald-400/15">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-800 dark:text-slate-100">
                  {title}
                </h2>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-px text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {total}
                </span>
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction}
          </div>

          {/* Search */}
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, email, vehicle…"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-emerald-400/15 dark:bg-[#0f1f19] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>

          {topContent}
        </div>

        {/* Rows */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
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

                return (
                  <li key={lead._id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectMode ? onToggleSelect?.(lead) : onLeadSelect(lead)
                      }
                      className={cn(
                        "group relative flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition",
                        selected
                          ? "border-emerald-500/40 bg-emerald-500/[0.06] dark:border-emerald-400/30 dark:bg-emerald-400/[0.07]"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-emerald-400/[0.06]",
                        highlighted &&
                          !selected &&
                          "border-emerald-500/30 bg-emerald-500/[0.04]",
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
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0a1410]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-[13px] text-slate-800 dark:text-slate-100",
                              unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {leadName(lead)}
                          </p>
                          <time className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                            {listTime(lead?.createdAt)}
                          </time>
                        </div>

                        {lead?.phone && (
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {lead.phone}
                          </p>
                        )}

                        {lead?.subject && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {lead.subject}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center gap-1.5">
                          {lead?.channel && (
                            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                              {lead.channel}
                            </span>
                          )}
                          <StatusDot status={lead?.status} />
                          <span
                            className="ml-auto opacity-0 transition group-hover:opacity-100"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <SupraLeoReadButton lead={lead} size="sm" />
                          </span>
                        </div>
                      </div>
                    </button>
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
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:bg-emerald-400/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {currentPage} / {pages}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {rangeStart}–{rangeEnd} of {total}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(pages, currentPage + 1))}
              disabled={currentPage >= pages}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:bg-emerald-400/10"
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