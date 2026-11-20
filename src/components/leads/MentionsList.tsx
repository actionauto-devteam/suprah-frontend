"use client";

import * as React from "react";
import { CheckCheck, ChevronDown, Loader2 } from "lucide-react";
import { ConversationListPanel } from "@/components/conversation-workspace/ConversationListPanel";
import { LeadsListHeader } from "@/components/leads/LeadsList";
import { cn } from "@/lib/utils";
import type { WorkspaceContact } from "@/components/conversation-workspace/workspace-types";
import { useLeadMentions, type LeadMentionItem, type LeadMentionStatus } from "@/hooks/useLeads";

export function mentionPreview(item: Pick<LeadMentionItem, "authorName" | "via" | "teamName" | "text">): string {
  const author = item.authorName?.trim() || "Someone";
  const to = item.via === "team" && item.teamName ? ` (to ${item.teamName})` : "";
  return `${author}${to}: ${item.text}`;
}

interface MentionsListProps {
  enabled: boolean;
  newCount: number;
  tabs: React.ReactNode;
  selectedMentionId?: string | null;
  status: LeadMentionStatus;
  onStatusChange: (status: LeadMentionStatus) => void;
  page: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onOpen: (mention: LeadMentionItem) => void;
  onCompleteAll: (asOf: string | null) => Promise<void>;
}

export function MentionsList({
  enabled,
  newCount,
  tabs,
  selectedMentionId,
  status,
  onStatusChange,
  page,
  onPageChange,
  search,
  onSearchChange,
  onOpen,
  onCompleteAll,
}: MentionsListProps) {
  const [busy, setBusy] = React.useState(false);
  const [completeFailed, setCompleteFailed] = React.useState(false);
  const [debouncedSearch, setDebouncedSearch] = React.useState(search.trim());

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { items, total, pages, asOf, isLoading, isFetching, isError, refetch } = useLeadMentions({
    enabled,
    status,
    page,
    search: debouncedSearch,
  });

  React.useEffect(() => {
    if (!isFetching && !isError && page > pages) onPageChange(pages);
  }, [isFetching, isError, page, pages, onPageChange]);

  const seenCount = React.useRef(newCount);
  React.useEffect(() => {
    if (seenCount.current === newCount) return;
    seenCount.current = newCount;
    void refetch();
  }, [newCount, refetch]);

  const byId = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const contacts = React.useMemo<WorkspaceContact[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        name: item.customerName,
        phone: item.phone,
        email: item.email,
        preview: mentionPreview(item),
        timestamp: item.mentionedAt,
        isRead: Boolean(item.completedAt),
      })),
    [items],
  );

  const completeAll = async () => {
    setBusy(true);
    setCompleteFailed(false);
    try {
      await onCompleteAll(asOf);
    } catch {
      setCompleteFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const canCompleteAll = status === "new" && newCount > 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white dark:bg-[#0a1410]">
      <LeadsListHeader
        title="Mentioned"
        total={total}
        subtitle="Notes where you or your team were mentioned"
        searchQuery={search}
        onSearchChange={(value) => {
          onSearchChange(value);
          onPageChange(1);
        }}
        searchPlaceholder="Search name or note…"
        searchLabel="Search mentions"
      >
        <div className="flex min-w-0 flex-col gap-2 pt-2.5 md:pt-3">
          {tabs}
          <div className={cn("grid min-w-0 gap-1.5 md:gap-2", canCompleteAll ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1")}>
            <label className="relative min-w-0">
              <select
                value={status}
                onChange={(event) => {
                  onStatusChange(event.target.value as LeadMentionStatus);
                  onPageChange(1);
                }}
                className="h-10 w-full appearance-none truncate rounded-lg pl-3 pr-8 text-[12px] font-semibold outline-none sm:text-[13px]"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  color: "var(--text-primary)",
                }}
                aria-label="Show mentions"
                data-testid="mentions-status"
              >
                <option value="new">New ({newCount > 99 ? "99+" : newCount})</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
            </label>
            {canCompleteAll ? (
              <button
                type="button"
                onClick={() => void completeAll()}
                disabled={busy}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold disabled:opacity-60 sm:text-[13px] md:gap-1 md:px-2 md:text-[12px]"
                style={{ color: "var(--accent-text)", background: "var(--accent-muted)", border: "1px solid var(--input-border)" }}
                data-testid="mentions-complete-all"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">Mark all as completed</span>
              </button>
            ) : null}
          </div>
          {isError || completeFailed ? (
            <div
              role="alert"
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[12px] font-medium text-red-700 dark:text-red-300"
            >
              <span className="min-w-0">
                {completeFailed ? "Couldn't mark them as completed. Please try again." : "Couldn't load your mentions."}
              </span>
              {isError ? (
                <button type="button" onClick={() => void refetch()} className="shrink-0 underline underline-offset-2">
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </LeadsListHeader>

      <div className="flex min-h-0 flex-1 flex-col">
        <ConversationListPanel
          hideHeader
          contacts={contacts}
          selectedContactId={selectedMentionId || undefined}
          isLoading={isLoading}
          isFetching={isFetching}
          total={total}
          searchQuery={search}
          onSearchChange={onSearchChange}
          onContactSelect={(contact) => {
            const item = byId.get(contact.id);
            if (item) onOpen(item);
          }}
          emptyLabel={
            isError
              ? "Couldn't load your mentions"
              : debouncedSearch
                ? "No mentions match your search"
                : status === "new"
                  ? "You're all caught up. No new mentions."
                  : "No mentions yet"
          }
          currentPage={page}
          totalPages={pages}
          itemsPerPage={20}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
