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

// Deterministic gradient per name (mirrors SS4's ava-colors)
const GRADIENTS = [
  "from-[#3a5ce0] to-[#5b7cf6]",
  "from-[#7038c0] to-[#9b6fd6]",
  "from-[#0e7c6a] to-[#22b060]",
  "from-[#b85c00] to-[#f0a855]",
  "from-[#c0385c] to-[#f06090]",
];
function getGradient(str: string) {
  const idx = (str || "?").charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}
function ini(first?: string, last?: string) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
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
        className={`flex flex-col w-full lg:w-[320px] xl:w-90 shrink-0 border-r border-border/60 z-10 bg-card/80 ${
          selectedLeadId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* ── Header bar ── */}
        <div className="px-4 py-3 border-b border-border/60 shrink-0 space-y-2.5">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60"
            >
              Inquiries &amp; Leads
            </span>
            {!isLoading && total > 0 && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                {total}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, vehicle…"
              className="w-full pl-9 pr-3 h-8 rounded-lg bg-background border border-border/60 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </div>

        {/* ── Scrollable list ── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto min-h-0 py-1.5 px-2 space-y-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {isLoading ? (
            <div className="flex flex-col p-3 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-18 w-full rounded-xl bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
                <Inbox className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No leads found</p>
              <p className="text-[10px] text-muted-foreground/40 font-mono">{sourceEmail}</p>
            </div>
          ) : (
            leads.map((lead: any) => {
              const sel = selectedLeadId === lead._id;
              const isHighlighted = highlightedLeadIds.has(lead._id);
              const grad = getGradient(lead.firstName || "");

              return (
                <button
                  key={lead._id}
                  id={`lead-${lead._id}`}
                  onClick={() => {
                    onLeadSelect(lead);
                    if (!lead.isRead) markAsRead(lead._id);
                  }}
                  className={`relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                    sel
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : isHighlighted
                        ? "bg-primary/15 border border-primary/30 shadow-md animate-pulse"
                        : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  {/* Left accent bar (SS4-style) */}
                  {sel && (
                    <span className="absolute left-0 top-[20%] bottom-[20%] w-0.75 bg-primary rounded-r-full" />
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`h-9 w-9 rounded-full bg-linear-to-br ${grad} flex items-center justify-center text-white font-bold text-[12px] shadow-sm`}
                    >
                      {ini(lead.firstName, lead.lastName)}
                    </div>
                    {!lead.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-[13px] font-semibold truncate leading-tight ${
                          lead.isRead ? "text-muted-foreground/70" : "text-foreground"
                        }`}
                      >
                        {lead.firstName} {lead.lastName}
                      </p>
                      <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums ml-1">
                        {fmtShort(new Date(lead.createdAt))}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground/50 truncate mb-1">
                      {lead.email}
                    </p>

                    <p
                      className={`text-[11.5px] truncate leading-snug ${
                        lead.isRead ? "text-muted-foreground/40" : "text-muted-foreground/70"
                      }`}
                    >
                      {lead.subject || "(No subject)"}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <ChannelBadge channel={lead.channel} />
                      <StatusPill status={lead.status} />
                      {lead._n > 1 && (
                        <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                          +{lead._n - 1}
                        </span>
                      )}
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
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
