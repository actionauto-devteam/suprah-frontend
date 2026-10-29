"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  FileWarning,
  Hand,
  Inbox,
  LogOut,
  MapPinOff,
  PackageX,
  UserX,
} from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { useIsNativeApp } from "@/components/mobile/useIsNativeApp"
import { initializeSocket } from "@/lib/socket.client"
import { getLoadAttention, type LoadAttentionKind } from "@/lib/api/loads"
import {
  ATTENTION_KIND_ORDER,
  attentionHref,
  attentionKey,
  attentionKindLabel,
  attentionTitle,
  describeAttention,
  mountainTodayKey,
} from "@/lib/load-attention"
import { cn } from "@/lib/utils"

// ─── Needs attention ──────────────────────────────────────────────────────────
// One place for what Dispatch should look at now: delivery photos waiting for
// confirmation, missed pickup/delivery days, loads with no driver on pickup
// day, assignments not accepted, driver release and load requests, customer
// shipping requests, vehicles removed from inventory before pickup, drivers
// whose GPS has gone quiet and driver documents
// that have expired or expire soon. Hidden when there is nothing to show (or
// the server doesn't offer the list). The wording lives in lib/load-attention.

const QUERY_KEY = ["transportation-load-attention"]
const COLLAPSED_STORAGE_KEY = "transportation:needs-attention:collapsed"

const KIND_STYLE: Record<LoadAttentionKind, { icon: React.ElementType; tone: string }> = {
  proof_waiting: { icon: FileCheck, tone: "text-emerald-600 dark:text-emerald-400" },
  late_delivery: { icon: CalendarClock, tone: "text-red-600 dark:text-red-400" },
  late_pickup: { icon: CalendarClock, tone: "text-amber-600 dark:text-amber-400" },
  unassigned_pickup: { icon: UserX, tone: "text-red-600 dark:text-red-400" },
  not_accepted: { icon: Clock, tone: "text-amber-600 dark:text-amber-400" },
  release_request: { icon: LogOut, tone: "text-red-600 dark:text-red-400" },
  gps_quiet: { icon: MapPinOff, tone: "text-red-600 dark:text-red-400" },
  load_request: { icon: Hand, tone: "text-blue-600 dark:text-blue-400" },
  customer_request: { icon: Inbox, tone: "text-emerald-600 dark:text-emerald-400" },
  vehicle_removed: { icon: PackageX, tone: "text-red-600 dark:text-red-400" },
  document_expired: { icon: FileWarning, tone: "text-red-600 dark:text-red-400" },
  document_expiring: { icon: FileWarning, tone: "text-amber-600 dark:text-amber-400" },
}

export function NeedsAttentionPanel({ className }: { className?: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const inNativeApp = useIsNativeApp()

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getLoadAttention(),
    // GPS silence doesn't send a load update, so also check every minute.
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // Load updates (new proof, status change, driver requests, edits) and quote
  // updates (customer requests) refresh the list.
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
      socket.on("quote:change", refresh)
    })()
    return () => {
      active = false
      window.clearTimeout(timer)
      socket?.off("load:change", refresh)
      socket?.off("quote:change", refresh)
    }
  }, [getToken, queryClient])

  // Mountain Time "today", so "pickup is today" matches the dealership calendar.
  const todayKey = mountainTodayKey()

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

  const total = data ? ATTENTION_KIND_ORDER.reduce((sum, kind) => sum + (data.counts?.[kind] ?? 0), 0) : 0
  if (!data || total === 0) return null

  const summary = ATTENTION_KIND_ORDER.filter((kind) => (data.counts?.[kind] ?? 0) > 0)

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
            {summary.map((kind) => attentionKindLabel(kind, data.counts[kind])).join(" · ")}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", collapsed && "-rotate-90")}
        />
      </button>

      {!collapsed && (
        <ul id="needs-attention-list" className="max-h-80 overflow-y-auto border-t border-border/60 px-1.5 py-1.5 sm:px-2">
          {data.items.map((item) => {
            const meta = KIND_STYLE[item.kind]
            const Icon = meta.icon
            return (
              <li key={attentionKey(item)}>
                <Link
                  href={attentionHref(item, inNativeApp)}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon className={cn("size-4 shrink-0", meta.tone)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs font-bold text-foreground">{attentionTitle(item)}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{describeAttention(item, todayKey)}</span>
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
