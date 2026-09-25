"use client"

import * as React from "react"
import { Activity, AlertTriangle, Coffee, LogIn, LogOut, Monitor, RotateCcw, Smartphone, Timer } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { fmtHuman, toMDTDate } from "@/components/crm/timeproof/shared"

type EventKind = "time-in" | "time-out" | "break-in" | "break-out" | "idle" | "idle-stage" | "shift-resumed" | "monitoring-switch"
type ReasonKind = "auto" | "admin" | "early-end" | "none"

interface ActivityEvent {
  id: string
  kind: EventKind
  at: string
  endAt?: string | null
  durationSeconds?: number
  ongoing?: boolean
  note?: string | null
  reasonKind?: ReasonKind
  startedVia?: "desktop" | "mobile" | null
  flaggedAt?: string | null
  stage?: 2 | 3
  removedTimeOutAt?: string | null
  removedTimeOutNote?: string | null
  switchedTo?: "desktop" | "mobile"
  switchedBy?: "user" | "admin" | "geofence"
  placeName?: string | null
  locationUpdates?: { count: number; firstAt: string | null; lastAt: string | null } | null
}

interface ActivitySummary {
  firstTimeIn: string | null
  lastTimeOut: string | null
  isShiftOpen: boolean
  breakCount: number
  breakSeconds: number
  idleCount: number
  idleSeconds: number
  resumeCount: number
  switchCount?: number
}

interface ActivityLogCardProps {
  userId: string
  dateStr: string
}

const fmtClock = (iso: string) =>
  toMDTDate(new Date(iso)).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })

const fmtClockShort = (iso: string) =>
  toMDTDate(new Date(iso)).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })

const REASON_CHIP: Record<Exclude<ReasonKind, "none">, { label: string; className: string }> = {
  auto: { label: "Auto clock-out", className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  "early-end": { label: "Early end", className: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  admin: { label: "Admin action", className: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
}

const KIND_META: Record<EventKind, { icon: LucideIcon; tile: string; title: string }> = {
  "time-in": { icon: LogIn, tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", title: "Time in" },
  "time-out": { icon: LogOut, tile: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300", title: "Time out" },
  "break-in": { icon: Coffee, tile: "bg-amber-500/10 text-amber-600 dark:text-amber-400", title: "Break in" },
  "break-out": { icon: Coffee, tile: "bg-sky-500/10 text-sky-600 dark:text-sky-400", title: "Break out" },
  idle: { icon: AlertTriangle, tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400", title: "Idle" },
  "idle-stage": { icon: Timer, tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400", title: "Idle marker" },
  "shift-resumed": { icon: RotateCcw, tile: "bg-blue-500/10 text-blue-600 dark:text-blue-400", title: "Shift resumed" },
  "monitoring-switch": { icon: Monitor, tile: "bg-teal-500/10 text-teal-600 dark:text-teal-400", title: "Monitoring switched" },
}

const Chip = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
      className
    )}
  >
    {children}
  </span>
)

const EventRow = ({ event }: { event: ActivityEvent }) => {
  const meta = KIND_META[event.kind]
  const Icon = event.kind === "monitoring-switch" && event.switchedTo === "mobile" ? Smartphone : meta.icon
  const detailClass = "text-[12px] leading-snug text-muted-foreground break-words"

  let title = meta.title
  if (event.kind === "idle-stage") {
    title = event.stage === 2 ? "Idle 20 min mark — 2nd warning" : "Idle 30 min mark — auto-end stage"
  }
  if (event.kind === "monitoring-switch") {
    title = event.switchedTo === "mobile"
      ? event.switchedBy === "geofence" ? "Monitoring moved to phone automatically" : "Monitoring moved to phone"
      : "Monitoring moved to computer"
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", meta.tile)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[13px] font-bold text-foreground">{title}</p>
          {event.kind === "time-out" && event.reasonKind && event.reasonKind !== "none" && (
            <Chip className={REASON_CHIP[event.reasonKind].className}>{REASON_CHIP[event.reasonKind].label}</Chip>
          )}
          {event.kind === "break-in" && event.ongoing && (
            <Chip className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">On break</Chip>
          )}
          {event.kind === "idle" && event.ongoing && (
            <Chip className="border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300">Ongoing</Chip>
          )}
        </div>

        {event.kind === "time-in" && event.startedVia && (
          <p className={detailClass}>Started via {event.startedVia}</p>
        )}
        {(event.kind === "time-in" || event.kind === "time-out") && event.note && (
          <p className={detailClass}>{event.note}</p>
        )}
        {event.kind === "break-in" && event.ongoing && typeof event.durationSeconds === "number" && (
          <p className={detailClass}>{fmtHuman(event.durationSeconds)} so far</p>
        )}
        {event.kind === "break-out" && typeof event.durationSeconds === "number" && (
          <p className={detailClass}>Break lasted {fmtHuman(event.durationSeconds)}</p>
        )}
        {event.kind === "idle" && (
          <>
            <p className={detailClass}>
              {fmtClockShort(event.at)} → {event.endAt ? fmtClockShort(event.endAt) : "still idle"}
              {typeof event.durationSeconds === "number" ? ` · ${fmtHuman(event.durationSeconds)}` : ""}
            </p>
            {event.flaggedAt && <p className={detailClass}>Flagged idle at {fmtClock(event.flaggedAt)}</p>}
          </>
        )}
        {event.kind === "monitoring-switch" && (
          <>
            <p className={detailClass}>
              {event.switchedBy === "admin"
                ? "Changed by an admin"
                : event.switchedBy === "geofence"
                  ? `The phone left ${event.placeName || "the work site"}`
                  : "Chosen by the employee"}
            </p>
            {event.switchedTo === "mobile" && event.locationUpdates && (
              event.locationUpdates.count > 0 ? (
                <p className={detailClass}>
                  {event.locationUpdates.count} location {event.locationUpdates.count === 1 ? "update" : "updates"} received from the phone
                  {event.locationUpdates.firstAt && event.locationUpdates.lastAt
                    ? ` · ${fmtClockShort(event.locationUpdates.firstAt)} to ${fmtClockShort(event.locationUpdates.lastAt)}`
                    : ""}
                </p>
              ) : (
                <p className="text-[12px] leading-snug text-amber-700 dark:text-amber-300">No location updates were received from the phone during this time</p>
              )
            )}
          </>
        )}
        {event.kind === "shift-resumed" && (
          <p className={detailClass}>
            {event.removedTimeOutAt
              ? `The earlier time-out at ${fmtClock(event.removedTimeOutAt)} was undone`
              : "The earlier time-out was undone"}
            {event.removedTimeOutNote ? ` (${event.removedTimeOutNote})` : ""}
          </p>
        )}
      </div>
      <p className="shrink-0 pt-0.5 font-mono text-[12px] font-black tabular-nums text-foreground">{fmtClock(event.at)}</p>
    </li>
  )
}

const SummaryChip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
    {children}
  </span>
)

export function ActivityLogCard({ userId, dateStr }: ActivityLogCardProps) {
  const [events, setEvents] = React.useState<ActivityEvent[]>([])
  const [summary, setSummary] = React.useState<ActivitySummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem("crm_token")
    if (!token) {
      setError("Sign in again to view the activity log.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    apiClient
      .get(`/api/crm/timeproof/user/${userId}/activity-log?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (cancelled) return
        const data = res.data?.data
        setEvents(data?.events ?? [])
        setSummary(data?.summary ?? null)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the activity log for this day.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, dateStr])

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card">
      <div className="space-y-3 border-b border-border/20 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-foreground">Activity Log</h2>
          {!loading && !error && (
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-muted-foreground">
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          )}
        </div>
        {!loading && !error && summary && events.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.firstTimeIn && <SummaryChip>First in {fmtClockShort(summary.firstTimeIn)}</SummaryChip>}
            {summary.lastTimeOut && <SummaryChip>Last out {fmtClockShort(summary.lastTimeOut)}</SummaryChip>}
            {summary.isShiftOpen && <SummaryChip>Shift still open</SummaryChip>}
            {summary.breakCount > 0 && (
              <SummaryChip>
                {summary.breakCount} {summary.breakCount === 1 ? "break" : "breaks"} · {fmtHuman(summary.breakSeconds)}
              </SummaryChip>
            )}
            {summary.idleCount > 0 && (
              <SummaryChip>
                {summary.idleCount} idle · {fmtHuman(summary.idleSeconds)}
              </SummaryChip>
            )}
            {typeof summary.switchCount === "number" && summary.switchCount > 0 && (
              <SummaryChip>
                {summary.switchCount} monitoring {summary.switchCount === 1 ? "switch" : "switches"}
              </SummaryChip>
            )}
            {summary.resumeCount > 0 && (
              <SummaryChip>
                {summary.resumeCount} {summary.resumeCount === 1 ? "resume" : "resumes"}
              </SummaryChip>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 px-4 py-4 sm:px-5" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-muted/40" />
              <div className="h-3 flex-1 rounded bg-muted/40" />
              <div className="h-3 w-20 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-5 text-[13px] text-red-600 dark:text-red-400 sm:px-5">{error}</div>
      ) : events.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-muted-foreground sm:px-5">
          No activity recorded for this day.
        </div>
      ) : (
        <ul className="divide-y divide-border/10">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}
