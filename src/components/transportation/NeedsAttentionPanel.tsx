"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FileCheck,
  FileWarning,
  MapPinOff,
} from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { initializeSocket } from "@/lib/socket.client"
import {
  getLoadAttention,
  type LoadAttentionItem,
  type LoadAttentionKind,
} from "@/lib/api/loads"
import { cn } from "@/lib/utils"

// ─── Needs attention ──────────────────────────────────────────────────────────
// One place for what Dispatch should look at now: delivery photos waiting for
// confirmation, missed pickup/delivery days, drivers whose GPS has gone quiet
// and driver documents that have expired or expire soon. Hidden when there is
// nothing to show (or the server doesn't offer the list).

const QUERY_KEY = ["transportation-load-attention"]
const COLLAPSED_STORAGE_KEY = "transportation:needs-attention:collapsed"

const KIND_META: Record<
  LoadAttentionKind,
  { label: (count: number) => string; icon: React.ElementType; tone: string }
> = {
  proof_waiting: {
    label: (n) => `${n} delivery photo${n === 1 ? "" : "s"} to confirm`,
    icon: FileCheck,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  late_delivery: {
    label: (n) => `${n} late deliver${n === 1 ? "y" : "ies"}`,
    icon: CalendarClock,
    tone: "text-red-600 dark:text-red-400",
  },
  late_pickup: {
    label: (n) => `${n} late pickup${n === 1 ? "" : "s"}`,
    icon: CalendarClock,
    tone: "text-amber-600 dark:text-amber-400",
  },
  gps_quiet: {
    label: (n) => `${n} driver${n === 1 ? "" : "s"} not sharing location`,
    icon: MapPinOff,
    tone: "text-red-600 dark:text-red-400",
  },
  document_expired: {
    label: (n) => `${n} expired document${n === 1 ? "" : "s"}`,
    icon: FileWarning,
    tone: "text-red-600 dark:text-red-400",
  },
  document_expiring: {
    label: (n) => `${n} document${n === 1 ? "" : "s"} expiring soon`,
    icon: FileWarning,
    tone: "text-amber-600 dark:text-amber-400",
  },
}

const KIND_ORDER: LoadAttentionKind[] = [
  "proof_waiting",
  "late_delivery",
  "late_pickup",
  "gps_quiet",
  "document_expired",
  "document_expiring",
]

/** "Oct 12" for a YYYY-MM-DD calendar day. */
function formatDay(day?: string): string {
  if (!day) return "an earlier day"
  const date = new Date(`${day}T12:00:00Z`)
  if (!Number.isFinite(date.getTime())) return day
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })
}

/** "25 min ago", "3 h ago", "2 days ago". */
function formatAgo(iso?: string): string {
  if (!iso) return ""
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (!Number.isFinite(minutes)) return ""
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

function describe(item: LoadAttentionItem): string {
  const driver = item.driverName || "The driver"
  switch (item.kind) {
    case "proof_waiting":
      return `Delivery photo waiting for your confirmation${item.since ? ` · sent ${formatAgo(item.since)}` : ""}`
    case "late_delivery":
      return `Delivery was due ${formatDay(item.date)} · ${item.status}`
    case "late_pickup":
      return `Pickup was due ${formatDay(item.date)} · ${item.status}`
    case "gps_quiet":
      return item.since
        ? `${driver} hasn't shared location since ${formatAgo(item.since)}`
        : `${driver} isn't sharing location`
    case "document_expired":
      return `${driver}'s ${item.credential ?? "document"} expired on ${formatDay(item.date)}`
    case "document_expiring":
      return `${driver}'s ${item.credential ?? "document"} expires ${
        (item.daysLeft ?? 0) <= 1 ? "tomorrow" : `in ${item.daysLeft} days`
      }`
  }
}

/** Where a row goes: the delivery review for proofs, otherwise the load. */
function hrefFor(item: LoadAttentionItem): string {
  return item.kind === "proof_waiting"
    ? `/billing/driver-payouts/${item.loadId}`
    : `/transportation/load/${item.loadId}`
}

export function NeedsAttentionPanel({ className }: { className?: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getLoadAttention(),
    // GPS silence doesn't send a load update, so also check every minute.
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // Load updates (new proof, status change, edits) refresh the list.
  React.useEffect(() => {
    let active = true
    let timer: number | undefined
    let socket: ReturnType<typeof initializeSocket> | null = null
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (active) void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      }, 1000)
    }
    void (async () => {
      const token = await getToken()
      if (!token || !active) return
      socket = initializeSocket(token)
      socket.on("load:change", refresh)
    })()
    return () => {
      active = false
      window.clearTimeout(timer)
      socket?.off("load:change", refresh)
    }
  }, [getToken, queryClient])

  const [collapsed, setCollapsed] = React.useState(false)
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1")
    } catch {
      // Storage unavailable: start expanded.
    }
  }, [])
  const toggle = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "0" : "1")
      } catch {
        // Not remembered; fine.
      }
      return !value
    })
  }

  const total = data ? KIND_ORDER.reduce((sum, kind) => sum + (data.counts?.[kind] ?? 0), 0) : 0
  if (!data || total === 0) return null

  const summary = KIND_ORDER.filter((kind) => (data.counts?.[kind] ?? 0) > 0)

  return (
    <section
      aria-labelledby="needs-attention-title"
      className={cn("rounded-2xl border border-amber-500/30 bg-card shadow-sm", className)}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="needs-attention-list"
        className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left sm:px-4"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="needs-attention-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
            Needs attention
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
              {total}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {summary.map((kind) => KIND_META[kind].label(data.counts[kind])).join(" · ")}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", collapsed && "-rotate-90")}
        />
      </button>

      {!collapsed && (
        <ul id="needs-attention-list" className="max-h-80 overflow-y-auto border-t border-border/60 px-1.5 py-1.5 sm:px-2">
          {data.items.map((item) => {
            const meta = KIND_META[item.kind]
            const Icon = meta.icon
            return (
              <li key={`${item.kind}:${item.loadId}:${item.credential ?? ""}`}>
                <Link
                  href={hrefFor(item)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon className={cn("size-4 shrink-0", meta.tone)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-bold text-foreground">{item.loadNumber}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{describe(item)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            )
          })}
          {data.items.length < total && (
            <li className="px-2 py-2 text-[11px] text-muted-foreground">
              Showing the most urgent {data.items.length} of {total}.
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
