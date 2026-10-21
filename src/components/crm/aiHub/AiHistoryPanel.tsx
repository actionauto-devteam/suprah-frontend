"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAiModeHistory } from "@/hooks/useAiShadowDrafts"
import { AI_CHANNEL_LABELS, AI_MODE_LABELS, type AiMode } from "@/lib/aiOperatingModes"
import type { AiChangeHistoryRow } from "@/lib/aiShadowDrafts"
import { HubCard, HubState, formatHubDate } from "./ShadowStatusBadge"

const CHANNEL_OPTIONS = [
  { value: "", label: "All changes" },
  { value: "sms", label: AI_CHANNEL_LABELS.sms },
  { value: "email", label: AI_CHANNEL_LABELS.email },
  { value: "webchat", label: AI_CHANNEL_LABELS.webchat },
  { value: "shadow_drafts", label: "Shadow Training" },
]

function describeChange(change: AiChangeHistoryRow): string {
  if (change.channel === "shadow_drafts") return `Shadow Training turned ${change.toMode === "on" ? "on" : "off"}`
  const from = change.fromSource === "legacy" ? "Old on/off switch" : AI_MODE_LABELS[change.fromMode as AiMode] || change.fromMode
  const to = AI_MODE_LABELS[change.toMode as AiMode] || change.toMode
  return `${AI_CHANNEL_LABELS[change.channel]}: ${from} → ${to}`
}

export function AiHistoryPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const [page, setPage] = React.useState(1)
  const [channel, setChannel] = React.useState("")
  const { data, loading, error, reload } = useAiModeHistory(getToken, page, channel)

  return (
    <HubCard
      title="Change history"
      description="Every operating mode and Shadow Training change, newest first."
      icon={<History className="h-4 w-4 text-primary" />}
      action={
        <select
          aria-label="Filter changes"
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
          value={channel}
          onChange={(event) => { setChannel(event.target.value); setPage(1) }}
        >
          {CHANNEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      }
    >
      <HubState loading={loading} error={error} onRetry={reload} empty={data && !data.changes.length ? "No changes recorded yet." : false}>
        {data && (
          <>
            <ol className="divide-y divide-border/40 rounded-xl border border-border/40">
              {data.changes.map((change) => (
                <li key={change.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{describeChange(change)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatHubDate(change.createdAt)}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    By {change.changedByName || "an admin"}{change.reason ? ` — ${change.reason}` : ""}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{data.total} change{data.total === 1 ? "" : "s"} · page {data.page} of {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
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
