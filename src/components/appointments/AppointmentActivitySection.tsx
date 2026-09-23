"use client"

import * as React from "react"
import { CalendarClock, CheckCircle2, CircleAlert, FileText, Loader2, Mail, MessageCircle, MessageSquare, Phone, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fmtShortDateTimeMDT } from "@/lib/timezone"
import { cn } from "@/lib/utils"
import { TimelineChannel, useCustomerTimeline } from "@/hooks/useCustomerTimeline"

interface AppointmentActivitySectionProps {
  leadId: string
  phone?: string
}

const FILTERS: Array<{ value: "all" | TimelineChannel; label: string }> = [
  { value: "all", label: "All" },
  { value: "sms", label: "Texts" },
  { value: "call", label: "Calls" },
  { value: "email", label: "Email" },
  { value: "webchat", label: "Chat" },
  { value: "appointment", label: "Appointments" },
  { value: "note", label: "Notes" },
]

const CHANNELS = {
  sms: { icon: MessageSquare, tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  call: { icon: Phone, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  email: { icon: Mail, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  webchat: { icon: MessageCircle, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  appointment: { icon: CalendarClock, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  note: { icon: FileText, tone: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300" },
}

function statusTone(status?: string) {
  if (!status) return "border-border text-muted-foreground"
  if (["failed", "missed", "cancelled", "no-show"].includes(status)) return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
  if (["delivered", "completed", "confirmed", "sent", "received"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  return "border-border bg-muted/50 text-muted-foreground"
}

export function AppointmentActivitySection({ leadId }: AppointmentActivitySectionProps) {
  const [filter, setFilter] = React.useState<"all" | TimelineChannel>("all")
  const { items, loading, loadingMore, error, hasMore, unavailableSources, loadMore, refetch } = useCustomerTimeline(leadId)
  const visible = filter === "all" ? items : items.filter((item) => item.channel === filter)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
            <MessageSquare className="size-3.5" /> Customer timeline
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{items.length} activities</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={refetch} disabled={loading} aria-label="Refresh customer timeline">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Timeline channels">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              "h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors",
              filter === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {unavailableSources.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{unavailableSources.join(", ")} activity is temporarily unavailable. Other activity is still shown.</span>
        </div>
      )}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <span>{error}</span>
          <Button type="button" size="sm" variant="outline" onClick={refetch}>Retry</Button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No activity in this channel yet.</p>
      ) : (
        <ol className="relative space-y-1 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-border">
          {visible.map((item) => {
            const config = CHANNELS[item.channel]
            const Icon = config.icon
            const detailError = typeof item.metadata?.error === "string" ? item.metadata.error : ""
            return (
              <li key={item.id} className="relative flex min-w-0 gap-2.5 py-1.5">
                <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md border border-background", config.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      {item.actor && <p className="truncate text-[10px] text-muted-foreground">{item.actor}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.status && <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase", statusTone(item.status))}>{item.status}</span>}
                      <time className="text-[10px] text-muted-foreground">{fmtShortDateTimeMDT(item.occurredAt)}</time>
                    </div>
                  </div>
                  {item.body && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground/80 [overflow-wrap:anywhere]">{item.body}</p>}
                  {detailError && <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400"><CircleAlert className="size-3" />{detailError}</p>}
                  {item.status === "delivered" && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" />Delivered</span>}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {hasMore && filter === "all" && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={loadMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          Load older activity
        </Button>
      )}
    </section>
  )
}
