import * as React from "react";
import { Search, Inbox, Check } from "lucide-react";
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

    return (
      <div
        className={`ss4-sidebar flex h-full min-h-0 w-full shrink-0 flex-col z-10 lg:w-75 xl:w-80 ${
          selectedLeadId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div
          className="shrink-0 space-y-3 px-4 pb-3 pt-4"
          style={{
            borderBottom: "1px solid var(--border-1)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="ss4-section-label">Inquiries &amp; Leads</span>

            {!isLoading && total > 0 && (
              <span
                className="ss4-badge inline-flex items-center tabular-nums"
                style={{
                  borderRadius: 10,
                }}
              >
                {total}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mx-4 mb-3 mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <Search className="ss4-search-icon pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, email, vehicle…"
              className="ss4-search-input h-10 w-full pl-9 pr-3 text-[13px] sm:h-8"
            />
          </div>
        </div>

        {/* Scrollable lead list */}
        <div
          ref={listRef}
          className="ss4-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2"
        >
          {isLoading ? (
            <div className="flex flex-col space-y-2 p-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-16 w-full animate-pulse rounded-xl"
                  style={{
                    background: "var(--bg-hover)",
                  }}
                />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <div className="ss4-empty-icon flex h-14 w-14 items-center justify-center">
                <Inbox
                  className="h-6 w-6"
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
                selectMode &&
                Boolean(selectedIds?.has(lead._id));

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
                  className={`ss4-conv group relative flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left ${
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
                    <div className="mb-0.5 flex items-center justify-between gap-1">
                      <p
                        className="ss4-conv-name truncate font-semibold leading-tight"
                        style={{
                          fontSize: 14,
                          opacity: lead.isRead ? 0.65 : 1,
                        }}
                      >
                        {[lead.firstName, lead.lastName]
                          .filter(Boolean)
                          .join(" ") || lead.senderName || "Unknown Lead"}
                      </p>

                      <span
                        className="ml-1 shrink-0 tabular-nums"
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {lead.createdAt
                          ? fmtShort(new Date(lead.createdAt))
                          : ""}
                      </span>
                    </div>

                    <p
                      className="mb-1 truncate"
                      style={{
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {lead.email || lead.phone || "No contact information"}
                    </p>

                    <p
                      className="ss4-conv-preview truncate leading-snug"
                      style={{
                        fontSize: 13,
                        opacity: lead.isRead ? 0.55 : 0.85,
                      }}
                    >
                      {lead.subject || "(No subject)"}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <ChannelBadge channel={lead.channel} />

                      <StatusPill status={lead.status} />

                      {lead._n > 1 && (
                        <span
                          className="ss4-badge inline-flex items-center"
                          style={{
                            borderRadius: 10,
                          }}
                        >
                          +{lead._n - 1}
                        </span>
                      )}

                      <div className="ml-auto opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
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
