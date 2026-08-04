"use client";

import * as React from "react";
import { Check, Inbox, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/leads/atomic/Avatar";
import { ChannelBadge } from "@/components/leads/atomic/ChannelBadge";
import { StatusPill } from "@/components/leads/atomic/StatusPill";
import { Pagination } from "@/components/leads/atomic/Pagination";
import {
  formatWorkspaceShortDate,
  workspaceContactSubtitle,
} from "./workspace-utils";
import type { WorkspaceContact } from "./workspace-types";

export interface ConversationListPanelProps {
  title?: string;
  subtitle?: string;
  contacts: WorkspaceContact[];
  selectedContactId?: string;
  isLoading?: boolean;
  isFetching?: boolean;
  total?: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onContactSelect: (contact: WorkspaceContact) => void;
  highlightedContactIds?: Set<string>;
  emptyLabel?: string;
  searchPlaceholder?: string;
  headerAction?: React.ReactNode;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (contact: WorkspaceContact) => void;
  renderTrailing?: (contact: WorkspaceContact) => React.ReactNode;
}

export function ConversationListPanel({
  title = "Inquiries & Leads",
  subtitle,
  contacts,
  selectedContactId,
  isLoading = false,
  isFetching = false,
  total = contacts.length,
  searchQuery,
  onSearchChange,
  onContactSelect,
  highlightedContactIds = new Set<string>(),
  emptyLabel = "No conversations found",
  searchPlaceholder = "Search name, email, vehicle…",
  headerAction,
  topContent,
  bottomContent,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 20,
  onPageChange,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  renderTrailing,
}: ConversationListPanelProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(
    Boolean(searchQuery),
  );

  React.useEffect(() => {
    if (searchQuery) setIsMobileSearchOpen(true);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!isMobileSearchOpen) return;
    const frame = window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMobileSearchOpen]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const clearSearch = () => {
    onSearchChange("");
    setIsMobileSearchOpen(false);
  };

  return (
    <div className="cw-list-shell ss4-sidebar flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
      <div
        className="cw-list-header shrink-0 border-b px-3 py-2 sm:px-4 sm:pb-3 sm:pt-4"
        style={{
          borderColor: "var(--border-1)",
          background: "var(--sidebar-bg)",
        }}
      >
        <div className="flex min-h-9 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="ss4-section-label truncate">{title}</span>
              {!isLoading && total > 0 ? (
                <span className="ss4-badge inline-flex shrink-0 items-center tabular-nums">
                  {total}
                </span>
              ) : null}
            </div>
            {subtitle ? (
              <p
                className="mt-1 hidden truncate text-[10px] sm:block"
                style={{ color: "var(--text-tertiary)" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border sm:hidden"
              style={{
                borderColor: isMobileSearchOpen ? "var(--accent)" : "var(--border-2)",
                background: isMobileSearchOpen ? "var(--accent-muted)" : "var(--bg-hover)",
                color: isMobileSearchOpen ? "var(--accent-text)" : "var(--text-secondary)",
              }}
              aria-label={isMobileSearchOpen ? "Close search" : "Search conversations"}
            >
              {isMobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isMobileSearchOpen ? (
          <div className="relative mt-2 sm:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="ss4-search-input h-9 w-full min-w-0 pl-9 pr-10 text-[12px]"
            />
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <div className="relative mt-3 hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="ss4-search-input h-8 w-full min-w-0 pl-9 pr-9 text-[13px]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {topContent}
      {isFetching && !isLoading ? (
        <div className="shrink-0 px-3 py-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          Updating…
        </div>
      ) : null}

      <div
        ref={listRef}
        className="ss4-scroll min-h-0 min-w-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-1.5 py-1.5 sm:px-2 sm:py-2"
      >
        {isLoading ? (
          <div className="flex flex-col space-y-2 p-2">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-20 w-full animate-pulse rounded-xl" style={{ background: "var(--bg-hover)" }} />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="ss4-empty-icon flex h-14 w-14 items-center justify-center">
              <Inbox className="h-6 w-6" style={{ color: "var(--accent)", opacity: 0.5 }} />
            </div>
            <p className="font-medium" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {emptyLabel}
            </p>
          </div>
        ) : (
          contacts.map((contact) => {
            const isSelected = selectedContactId === contact.id;
            const isHighlighted = highlightedContactIds.has(contact.id);
            const isChecked = selectMode && Boolean(selectedIds?.has(contact.id));

            const activate = () => {
              if (selectMode) {
                onToggleSelect?.(contact);
                return;
              }
              onContactSelect(contact);
            };

            return (
              <div
                key={contact.id}
                role="button"
                tabIndex={0}
                onClick={activate}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
                className={cn(
                  "ss4-conv group relative flex w-full min-w-0 cursor-pointer items-start gap-2 px-2 py-2 text-left sm:gap-3 sm:px-3 sm:py-2.5",
                  (isSelected || isHighlighted || isChecked) && "ss4-conv-active",
                  isHighlighted && "animate-pulse",
                )}
              >
                <div className="relative mt-0.5 shrink-0">
                  {selectMode ? (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: isChecked ? "var(--accent)" : "var(--border-1)",
                        background: isChecked ? "var(--accent)" : "transparent",
                      }}
                    >
                      {isChecked ? <Check className="h-4 w-4 text-white" /> : null}
                    </div>
                  ) : (
                    <Avatar first={contact.firstName} last={contact.lastName} size="md" />
                  )}
                  {!selectMode && contact.isRead === false ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--sidebar-bg)" }}
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center justify-between gap-1">
                    <p className="ss4-conv-name min-w-0 flex-1 truncate font-semibold leading-tight" style={{ fontSize: 13, opacity: contact.isRead ? 0.92 : 1 }}>
                      {contact.name}
                    </p>
                    <span className="ml-1 shrink-0 tabular-nums" style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}>
                      {formatWorkspaceShortDate(contact.timestamp)}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {workspaceContactSubtitle(contact)}
                  </p>
                  <p className="ss4-conv-preview mt-0.5 truncate leading-snug" style={{ fontSize: 12, opacity: contact.isRead ? 0.82 : 1 }}>
                    {contact.preview || contact.subtitle || "No conversation preview"}
                  </p>

                  <div className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden">
                    {contact.channel ? <ChannelBadge channel={contact.channel} /> : null}
                    {contact.status ? <StatusPill status={contact.status} /> : null}
                    {contact.count && contact.count > 1 ? (
                      <span className="ss4-badge inline-flex shrink-0 items-center">+{contact.count - 1}</span>
                    ) : null}
                    {renderTrailing ? <div className="ml-auto shrink-0">{renderTrailing(contact)}</div> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {bottomContent}
      {onPageChange && totalPages > 1 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}