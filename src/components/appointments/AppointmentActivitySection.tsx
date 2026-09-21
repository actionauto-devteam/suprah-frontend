"use client"

import * as React from "react"
import { MessageSquare, Phone, PhoneMissed } from "lucide-react"
import { useLeadCommunicationActivity } from "@/hooks/useLeadCommunicationActivity"
import { fmtShortDateTimeMDT } from "@/lib/timezone"
import { cn } from "@/lib/utils"

const COLLAPSED_COUNT = 5

interface AppointmentActivitySectionProps {
  leadId: string
  phone?: string
}

export function AppointmentActivitySection({ leadId, phone }: AppointmentActivitySectionProps) {
  const dialablePhone = (phone || "").replace(/[^\d+]/g, "") || undefined
  const { items, loading } = useLeadCommunicationActivity(leadId, dialablePhone)
  const [showAll, setShowAll] = React.useState(false)

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )
  const visible = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const hiddenCount = sorted.length - visible.length

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <MessageSquare className="size-3.5" /> Conversation
        </p>
        {sorted.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {loading && sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading texts and calls…</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No texts or calls with this customer yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => {
            const isCall = item.kind === "call"
            const isMissed = isCall && item.title === "Missed call"
            const Icon = isMissed ? PhoneMissed : isCall ? Phone : MessageSquare

            return (
              <li
                key={item.id}
                className="flex min-w-0 items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                    isMissed
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : isCall
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : "bg-teal-500/15 text-teal-700 dark:text-teal-300",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-xs font-semibold text-foreground">{item.title}</span>
                    {item.createdAt && (
                      <time className="text-[10px] text-muted-foreground">
                        {fmtShortDateTimeMDT(item.createdAt)}
                      </time>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-foreground/80 [overflow-wrap:anywhere]">
                      {item.description}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {sorted.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showAll ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  )
}
