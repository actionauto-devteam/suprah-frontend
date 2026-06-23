import * as React from "react";
import { Search, Inbox } from "lucide-react";
import { ChannelBadge } from "./atomic/ChannelBadge";
import { StatusPill } from "./atomic/StatusPill";
import { Pagination } from "./atomic/Pagination";
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
  markAsRead: (id: string) => void;
}

const AVA_COLORS = ['ss4-ava-accent', 'ss4-ava-purple', 'ss4-ava-teal', 'ss4-ava-amber', 'ss4-ava-rose'];
function getAvaColor(str: string) {
  return AVA_COLORS[(str || '?').charCodeAt(0) % AVA_COLORS.length];
}
function ini(first?: string, last?: string) {
  return `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase();
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
    markAsRead,
  }: LeadsListProps) => {
    const listRef = React.useRef<HTMLDivElement>(null);

    return (
      <div
        className={`ss4-sidebar flex flex-col w-full lg:w-75 xl:w-80 shrink-0 z-10 ${
          selectedLeadId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 shrink-0 space-y-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center justify-between">
            <span className="ss4-section-label">Inquiries &amp; Leads</span>
            {!isLoading && total > 0 && (
              <span className="ss4-badge inline-flex items-center tabular-nums" style={{ borderRadius: 10 }}>
                {total}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="ss4-search-icon absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, vehicle…"
              className="ss4-search-input w-full pl-9 pr-3 h-10 sm:h-8 text-[13px]"
            />
          </div>
        </div>

        {/* ── Scrollable list ── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto min-h-0 py-2 px-2 space-y-0.5 ss4-scroll"
        >
          {isLoading ? (
            <div className="flex flex-col p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full rounded-xl animate-pulse"
                  style={{ background: 'var(--bg-hover)' }}
                />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20 px-6 text-center">
              <div className="ss4-empty-icon h-14 w-14 flex items-center justify-center">
                <Inbox className="h-6 w-6" style={{ color: 'var(--accent)', opacity: 0.5 }} />
              </div>
              <p className="font-medium" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No leads found</p>
              <p className="ss4-mono" style={{ fontSize: 10, color: 'var(--text-disabled)' }}>{sourceEmail}</p>
            </div>
          ) : (
            leads.map((lead: any) => {
              const sel = selectedLeadId === lead._id;
              const isHighlighted = highlightedLeadIds.has(lead._id);
              const avaColor = getAvaColor(lead.firstName || '');

              return (
                <button
                  key={lead._id}
                  id={`lead-${lead._id}`}
                  onClick={() => {
                    onLeadSelect(lead);
                    if (!lead.isRead) markAsRead(lead._id);
                  }}
                  className={`ss4-conv relative w-full flex items-start gap-3 px-3 py-2.5 text-left group ${
                    sel ? 'ss4-conv-active' : isHighlighted ? 'ss4-conv-active animate-pulse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className={`h-9 w-9 rounded-full ${avaColor} flex items-center justify-center text-white font-bold`} style={{ fontSize: 12 }}>
                      {ini(lead.firstName, lead.lastName)}
                    </div>
                    {!lead.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar-bg)' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="ss4-conv-name font-semibold truncate leading-tight" style={{ fontSize: 14, opacity: lead.isRead ? 0.65 : 1 }}>
                        {lead.firstName} {lead.lastName}
                      </p>
                      <span className="shrink-0 tabular-nums ml-1" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {fmtShort(new Date(lead.createdAt))}
                      </span>
                    </div>

                    <p className="truncate mb-1" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {lead.email}
                    </p>

                    <p className="ss4-conv-preview truncate leading-snug" style={{ fontSize: 13, opacity: lead.isRead ? 0.55 : 0.85 }}>
                      {lead.subject || '(No subject)'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <ChannelBadge channel={lead.channel} />
                      <StatusPill status={lead.status} />
                      {lead._n > 1 && (
                        <span className="ss4-badge inline-flex items-center" style={{ borderRadius: 10 }}>
                          +{lead._n - 1}
                        </span>
                      )}
                      <div className="ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <SupraLeoReadButton lead={lead} size="sm" />
                      </div>
                    </div>
                  </div>
                </button>
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
