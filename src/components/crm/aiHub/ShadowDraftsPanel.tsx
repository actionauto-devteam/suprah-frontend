"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useShadowDraftList, type ShadowDraftFilters } from "@/hooks/useAiShadowDrafts"
import {
  SHADOW_CHANNEL_LABELS,
  SHADOW_DRAFT_STATUSES,
  SHADOW_DRAFT_STATUS_LABELS,
  formatLatency,
  type ShadowDraftSummary,
} from "@/lib/aiShadowDrafts"
import { AI_CHANNELS } from "@/lib/aiOperatingModes"
import { HubCard, HubState, ShadowStatusBadge, formatHubDate } from "./ShadowStatusBadge"

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"

export function ShadowDraftRow({ draft, onOpen }: { draft: ShadowDraftSummary; onOpen: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(draft.id)}
        className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ShadowStatusBadge status={draft.status} />
          <span className="text-[10px] font-semibold text-muted-foreground">{SHADOW_CHANNEL_LABELS[draft.channel]}</span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{draft.lead?.name || "Unknown customer"}</span>
          <span className="text-[10px] text-muted-foreground">{formatHubDate(draft.createdAt)}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 break-words text-xs text-muted-foreground">
          {draft.preview || draft.handoffReason || draft.statusReason || "No draft text"}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80">
          {draft.aiModel && <span>{draft.aiModel}</span>}
          {typeof draft.latencyMs === "number" && <span>{formatLatency(draft.latencyMs)}</span>}
          {typeof draft.totalTokens === "number" && <span>{draft.totalTokens.toLocaleString()} tokens</span>}
        </div>
      </button>
    </li>
  )
}

export function ShadowDraftsPanel({ getToken, filters, onFiltersChange, onOpen }: {
  getToken: () => Promise<string | null>
  filters: ShadowDraftFilters
  onFiltersChange: (filters: ShadowDraftFilters) => void
  onOpen: (id: string) => void
}) {
  const { data, loading, error, reload } = useShadowDraftList(getToken, filters)
  const page = filters.page || 1
  const update = (patch: Partial<ShadowDraftFilters>) => onFiltersChange({ ...filters, page: 1, ...patch })

  return (
    <HubCard
      title="Shadow drafts"
      description="Private practice replies the AI Agent wrote while in Training. Read-only. Kept for 90 days."
      icon={<FileText className="h-4 w-4 text-primary" />}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <label className="sr-only" htmlFor="shadow-filter-status">Status</label>
        <select id="shadow-filter-status" className={SELECT_CLASS} value={filters.status || ""} onChange={(event) => update({ status: event.target.value || undefined })}>
          <option value="">All statuses</option>
          {SHADOW_DRAFT_STATUSES.map((status) => <option key={status} value={status}>{SHADOW_DRAFT_STATUS_LABELS[status]}</option>)}
        </select>
        <label className="sr-only" htmlFor="shadow-filter-channel">Channel</label>
        <select id="shadow-filter-channel" className={SELECT_CLASS} value={filters.channel || ""} onChange={(event) => update({ channel: event.target.value || undefined })}>
          <option value="">All channels</option>
          {AI_CHANNELS.map((channel) => <option key={channel} value={channel}>{SHADOW_CHANNEL_LABELS[channel]}</option>)}
        </select>
        <label className="sr-only" htmlFor="shadow-filter-sort">Sort</label>
        <select id="shadow-filter-sort" className={SELECT_CLASS} value={filters.sort || "newest"} onChange={(event) => update({ sort: event.target.value === "oldest" ? "oldest" : "newest" })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <HubState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data && !data.drafts.length ? (filters.status || filters.channel ? "No drafts match these filters." : "No shadow drafts yet. They appear here when Shadow Training is on and a customer writes in on a Training channel.") : false}
      >
        {data && (
          <>
            <ul aria-label="Shadow drafts" className="space-y-2">
              {data.drafts.map((draft) => <ShadowDraftRow key={draft.id} draft={draft} onOpen={onOpen} />)}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{data.total.toLocaleString()} draft{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => onFiltersChange({ ...filters, page: page - 1 })} aria-label="Previous page">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={page >= data.totalPages} onClick={() => onFiltersChange({ ...filters, page: page + 1 })} aria-label="Next page">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </HubState>
    </HubCard>
  )
}
