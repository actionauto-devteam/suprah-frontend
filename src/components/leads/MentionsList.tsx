"use client";

import * as React from "react";
import { CheckCheck, ChevronDown, Loader2 } from "lucide-react";
import { ConversationListPanel } from "@/components/conversation-workspace/ConversationListPanel";
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

  return (
    <ConversationListPanel
      title="Mentioned"
      subtitle="Notes where you or your team were mentioned"
      contacts={contacts}
      selectedContactId={selectedMentionId || undefined}
      isLoading={isLoading}
      isFetching={isFetching}
      total={total}
      searchQuery={search}
      onSearchChange={(value) => {
        onSearchChange(value);
        onPageChange(1);
      }}
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
      searchPlaceholder="Search name or note…"
      currentPage={page}
      totalPages={pages}
      itemsPerPage={20}
      onPageChange={onPageChange}
      topContent={
        <div
          className="flex shrink-0 flex-col gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-3 sm:py-3"
          style={{ borderColor: "var(--border-1)", background: "var(--bg-elevated)" }}
        >
          {tabs}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <label className="relative min-w-0">
              <select
                value={status}
                onChange={(event) => {
                  onStatusChange(event.target.value as LeadMentionStatus);
                  onPageChange(1);
                }}
                className="h-9 appearance-none rounded-lg pl-3 pr-8 text-[12px] font-medium outline-none sm:text-[13px]"
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
            {status === "new" && newCount > 0 ? (
              <button
                type="button"
                onClick={() => void completeAll()}
                disabled={busy}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold disabled:opacity-60"
                style={{ color: "var(--accent-text)", background: "var(--accent-muted)" }}
                data-testid="mentions-complete-all"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Mark all as completed
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
      }
    />
  );
}
