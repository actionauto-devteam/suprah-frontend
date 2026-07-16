import * as React from "react";
import { Check, Inbox, Search, X } from "lucide-react";
import { ChannelBadge } from "./atomic/ChannelBadge";
import { StatusPill } from "./atomic/StatusPill";
import { Pagination } from "./atomic/Pagination";
import { Avatar } from "./atomic/Avatar";
import { fmtShort } from "@/lib/lead-utils";
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
  }: LeadsListProps) => {
    const listRef = React.useRef<HTMLDivElement>(null);
    const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(
      Boolean(searchQuery),
    );

    React.useEffect(() => {
      if (searchQuery) {
        setIsMobileSearchOpen(true);
      }
    }, [searchQuery]);

    React.useEffect(() => {
      if (!isMobileSearchOpen) return;

      const frame = window.requestAnimationFrame(() => {
        mobileSearchInputRef.current?.focus();
      });

      return () => window.cancelAnimationFrame(frame);
    }, [isMobileSearchOpen]);

    React.useEffect(() => {
      listRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, [currentPage]);

    const closeMobileSearch = () => {
      if (searchQuery) {
        onSearchChange("");
      }

      setIsMobileSearchOpen(false);
    };

    return (
      <div className="ss4-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden">
        {/* Compact list header */}
        <div
          className="shrink-0 border-b px-3 py-2 sm:px-4 sm:pb-3 sm:pt-4"
          style={{
            borderColor: "var(--border-1)",
            background: "var(--sidebar-bg)",
          }}
        >
          <div className="flex min-h-9 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="ss4-section-label truncate">
                Inquiries &amp; Leads
              </span>

              {!isLoading && total > 0 && (
                <span
                  className="ss4-badge inline-flex shrink-0 items-center tabular-nums"
                  style={{
                    borderRadius: 10,
                  }}
                >
                  {total}
                </span>
              )}
            </div>

            {/* Mobile search trigger */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((open) => !open)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors sm:hidden"
              style={{
                borderColor: isMobileSearchOpen
                  ? "var(--accent)"
                  : "var(--border-2)",
                background: isMobileSearchOpen
                  ? "var(--accent-muted)"
                  : "var(--bg-hover)",
                color: isMobileSearchOpen
                  ? "var(--accent-text)"
                  : "var(--text-secondary)",
              }}
              aria-label={
                isMobileSearchOpen ? "Close lead search" : "Search leads"
              }
              aria-expanded={isMobileSearchOpen}
            >
              {isMobileSearchOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Mobile search: shown only when requested */}
          {isMobileSearchOpen && (
            <div className="relative mt-2 sm:hidden">
              <Search className="ss4-search-icon pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />

              <input
                ref={mobileSearchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name, email, vehicle…"
                className="ss4-search-input h-9 w-full pl-9 pr-10 text-[12px]"
                aria-label="Search leads"
              />

              {(searchQuery || isMobileSearchOpen) && (
                <button
                  type="button"
                  onClick={closeMobileSearch}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    color: "var(--text-tertiary)",
                  }}
                  aria-label="Clear and close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Desktop/tablet search remains permanently visible */}
          <div className="relative mt-3 hidden sm:block">
            <Search className="ss4-search-icon pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, email, vehicle…"
              className="ss4-search-input h-8 w-full pl-9 pr-9 text-[13px]"
              aria-label="Search leads"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  color: "var(--text-tertiary)",
                }}
                aria-label="Clear lead search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable lead list */}
        <div
          ref={listRef}
          className="ss4-scroll min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-1.5 py-1.5 sm:px-2 sm:py-2"
        >
          {isLoading ? (
            <div className="flex flex-col space-y-1.5 p-1.5 sm:space-y-2 sm:p-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-[82px] w-full animate-pulse rounded-xl sm:h-20"
                  style={{
                    background: "var(--bg-hover)",
                  }}
                />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 px-6 py-10 text-center sm:gap-3 sm:py-20">
              <div className="ss4-empty-icon flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
                <Inbox
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  style={{
                    color: "var(--accent)",
                    opacity: 0.5,
                  }}
                />
              </div>

              <p
                className="font-medium"
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                No leads found
              </p>

              <p
                className="ss4-mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-disabled)",
                }}
              >
                {sourceEmail}
              </p>
            </div>
          ) : (
            leads.map((lead: any) => {
              const isSelected = selectedLeadId === lead._id;
              const isHighlighted = highlightedLeadIds.has(lead._id);
              const isChecked =
                selectMode && Boolean(selectedIds?.has(lead._id));

              const handleLeadSelect = () => {
                if (selectMode) {
                  onToggleSelect?.(lead);
                  return;
                }

                onLeadSelect(lead);
              };

              return (
                <div
                  key={lead._id}
                  id={`lead-${lead._id}`}
                  role="button"
                  tabIndex={0}
                  onClick={handleLeadSelect}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleLeadSelect();
                    }
                  }}
                  className={`ss4-conv group relative flex w-full cursor-pointer items-start gap-2 px-2 py-2 text-left sm:gap-3 sm:px-3 sm:py-2.5 ${
                    isSelected
                      ? "ss4-conv-active"
                      : isHighlighted
                        ? "ss4-conv-active animate-pulse"
                        : ""
                  } ${isChecked ? "ss4-conv-active" : ""}`}
                >
                  {/* Avatar or selection checkbox */}
                  <div className="relative mt-0.5 shrink-0">
                    {selectMode ? (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors"
                        style={{
                          borderColor: isChecked
                            ? "var(--accent)"
                            : "var(--border-1)",
                          background: isChecked
                            ? "var(--accent)"
                            : "transparent",
                        }}
                      >
                        {isChecked && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    ) : (
                      <Avatar
                        first={lead.firstName}
                        last={lead.lastName}
                        size="md"
                      />
                    )}

                    {!selectMode && !lead.isRead && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                        style={{
                          background: "var(--accent)",
                          boxShadow: "0 0 0 2px var(--sidebar-bg)",
                        }}
                      />
                    )}
                  </div>

                  {/* Lead content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className="ss4-conv-name truncate font-semibold leading-tight"
                        style={{
                          fontSize: 13,
                          opacity: lead.isRead ? 0.65 : 1,
                        }}
                      >
                        {[lead.firstName, lead.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                          lead.senderName ||
                          "Unknown Lead"}
                      </p>

                      <span
                        className="ml-1 shrink-0 tabular-nums"
                        style={{
                          fontSize: 9.5,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {lead.createdAt
                          ? fmtShort(new Date(lead.createdAt))
                          : ""}
                      </span>
                    </div>

                    <p
                      className="mt-0.5 truncate"
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {lead.email || lead.phone || "No contact information"}
                    </p>

                    <p
                      className="ss4-conv-preview mt-0.5 truncate leading-snug"
                      style={{
                        fontSize: 12,
                        opacity: lead.isRead ? 0.55 : 0.85,
                      }}
                    >
                      {lead.subject || "(No subject)"}
                    </p>

                    <div className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden">
                      <ChannelBadge channel={lead.channel} />

                      <StatusPill status={lead.status} />

                      {lead._n > 1 && (
                        <span
                          className="ss4-badge inline-flex shrink-0 items-center"
                          style={{
                            borderRadius: 10,
                          }}
                        >
                          +{lead._n - 1}
                        </span>
                      )}

                      <div className="ml-auto shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <SupraLeoReadButton lead={lead} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={pages}
          totalItems={total}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      </div>
    );
  },
);

LeadsList.displayName = "LeadsList";