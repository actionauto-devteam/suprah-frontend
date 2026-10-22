"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { HubState } from "@/components/crm/aiHub/ShadowStatusBadge"
import { useKnowledgeAudit } from "@/hooks/useAiKnowledgeBase"
import { KB_AUDIT_LABELS, KB_STATUS_LABELS, locationNameList, type KbAuditRow, type KbLocation, type KbStatusValue } from "@/lib/aiKnowledgeBase"
import { formatKbDate } from "./KnowledgeShared"

const NOTE_LABELS: Record<string, string> = {
  location_archived: "The location was archived.",
  location_restored: "The location was restored.",
}

function describeRow(row: KbAuditRow, locations: KbLocation[]): string[] {
  const parts: string[] = []
  if (row.version) parts.push(row.detailId ? `Revision ${row.version}` : `Version ${row.version}`)
  if (row.fromStatus && row.toStatus && row.fromStatus !== row.toStatus) {
    const from = KB_STATUS_LABELS[row.fromStatus as KbStatusValue] || row.fromStatus
    const to = KB_STATUS_LABELS[row.toStatus as KbStatusValue] || row.toStatus
    parts.push(`${from} → ${to}`)
  }
  if (row.locationId) parts.push(locationNameList([row.locationId], locations)[0])
  return parts
}

export function KnowledgeAuditSection({ getToken, locations, onOpenEntry }: {
  getToken: () => Promise<string | null>
  locations: KbLocation[]
  onOpenEntry: (id: string) => void
}) {
  const [page, setPage] = React.useState(1)
  const [refresh, setRefresh] = React.useState(0)
  const audit = useKnowledgeAudit(getToken, page, true, refresh)
  const total = audit.data?.total || 0
  const limit = audit.data?.limit || 25
  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Every change to entries, verified details and the Knowledge Base setting. History can&apos;t be edited or deleted.</p>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setRefresh((value) => value + 1)}>Refresh</Button>
      </div>
      <HubState loading={audit.loading && !audit.data} error={audit.error} onRetry={audit.reload} empty={audit.data && !audit.data.items.length ? "No history yet." : false}>
        <ol aria-label="Knowledge Base history" className="divide-y divide-border/40 rounded-xl border border-border/40">
          {(audit.data?.items || []).map((row) => {
            const details = describeRow(row, locations)
            return (
              <li key={row.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-0.5 text-[11px]">
                  <p className="text-xs font-semibold">{KB_AUDIT_LABELS[row.action] || row.action}</p>
                  <p className="text-muted-foreground">
                    {row.actor?.name || "System"}{row.actor?.role ? ` (${row.actor.role})` : ""} · {formatKbDate(row.createdAt)}
                    {details.length ? ` · ${details.join(" · ")}` : ""}
                  </p>
                  {row.note && <p className="break-words">{NOTE_LABELS[row.note] || row.note}</p>}
                </div>
                {row.entryId && (
                  <Button size="sm" variant="ghost" className="h-7 self-start px-2 text-[11px]" onClick={() => onOpenEntry(row.entryId as string)}>
                    Open entry
                  </Button>
                )}
              </li>
            )
          })}
        </ol>
        {pages > 1 && (
          <nav aria-label="History pages" className="flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="outline" disabled={page <= 1 || audit.loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <span className="text-[11px] text-muted-foreground">Page {page} of {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages || audit.loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </nav>
        )}
      </HubState>
    </div>
  )
}
