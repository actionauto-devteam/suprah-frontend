"use client"

import * as React from "react"
import { Anchor, Gauge, MapPin, Radio, Smartphone } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { fmtHuman, toMDTDate } from "@/components/crm/timeproof/shared"

interface PhonePeriod {
  start: string
  end: string
  endedBy: "switch" | "time-out" | "open"
  startedBy: "switch" | "shift-start"
  locationUpdates: { count: number; firstAt: string | null; lastAt: string | null }
}

interface DailyMovement {
  distanceMi: number
  topSpeedMph: number
  stationaryMinutes: number
  stationarySegments: Array<{ start: string; end: string; durationMin: number }>
  placeVisits: Array<{ placeName: string; enteredAt: string; exitedAt: string | null; durationMin: number | null }>
}

interface MobileMonitoringPanelProps {
  userId: string
  dateStr: string
}

const fmtClock = (iso: string) =>
  toMDTDate(new Date(iso)).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })

const StatCard = ({ label, value, hint, icon: Icon, accent }: {
  label: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
}) => (
  <div className={cn("space-y-2 rounded-xl border px-4 py-3.5", accent ? "border-teal-500/30 bg-teal-50/60 dark:bg-teal-950/20" : "border-border/40 bg-card")}>
    <div className="flex items-center justify-between">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">{label}</p>
      <Icon className={cn("h-3.5 w-3.5", accent ? "text-teal-600" : "text-muted-foreground/25")} />
    </div>
    <p className={cn("text-2xl font-black leading-none tracking-tight", accent && "text-teal-700 dark:text-teal-300")}>{value}</p>
    <p className="text-[10px] leading-none text-muted-foreground/40">{hint}</p>
  </div>
)

export function MobileMonitoringPanel({ userId, dateStr }: MobileMonitoringPanelProps) {
  const [movement, setMovement] = React.useState<DailyMovement | null>(null)
  const [periods, setPeriods] = React.useState<PhonePeriod[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem("crm_token")
    if (!token) {
      setError("Sign in again to view mobile monitoring.")
      setLoading(false)
      return
    }
    const headers = { Authorization: `Bearer ${token}` }
    setLoading(true)
    setError("")
    Promise.all([
      apiClient.getDailyActivityLog({ date: dateStr, userId }, { headers }).catch(() => null),
      apiClient.get(`/api/crm/timeproof/user/${userId}/activity-log?date=${dateStr}`, { headers }).catch(() => null),
    ])
      .then(([movementRes, logRes]) => {
        if (cancelled) return
        if (!movementRes && !logRes) {
          setError("Couldn't load mobile monitoring for this day.")
          return
        }
        setMovement(movementRes?.data?.data ?? null)
        setPeriods(logRes?.data?.data?.phonePeriods ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, dateStr])

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted/30" />
      </div>
    )
  }

  if (error) {
    return <div className="rounded-2xl border border-border/40 bg-card px-5 py-5 text-[13px] text-red-600 dark:text-red-400">{error}</div>
  }

  const totalPhoneSeconds = periods.reduce(
    (sum, period) => sum + Math.max(0, Math.round((new Date(period.end).getTime() - new Date(period.start).getTime()) / 1000)),
    0,
  )
  const totalUpdates = periods.reduce((sum, period) => sum + period.locationUpdates.count, 0)
  const hasMovement = !!movement && (movement.placeVisits.length > 0 || movement.stationarySegments.length > 0 || movement.distanceMi > 0)
  const timeline = movement
    ? [
        ...movement.placeVisits.map((visit) => ({ kind: "place" as const, at: new Date(visit.enteredAt).getTime(), visit })),
        ...movement.stationarySegments.map((segment) => ({ kind: "stay" as const, at: new Date(segment.start).getTime(), segment })),
      ].sort((a, b) => a.at - b.at)
    : []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Phone Monitoring"
          value={periods.length > 0 ? fmtHuman(totalPhoneSeconds) : "0m"}
          hint={`${periods.length} phone period${periods.length === 1 ? "" : "s"}`}
          icon={Smartphone}
          accent={periods.length > 0}
        />
        <StatCard label="Location Updates" value={String(totalUpdates)} hint="Received from the phone" icon={Radio} />
        <StatCard label="Distance" value={movement ? `${movement.distanceMi.toFixed(1)}mi` : "—"} hint="GPS-tracked movement" icon={MapPin} />
        <StatCard label="Top Speed" value={movement ? `${movement.topSpeedMph}mph` : "—"} hint="Fastest recorded ping" icon={Gauge} />
        <StatCard label="Stayed In One Spot" value={movement ? fmtHuman(movement.stationaryMinutes * 60) : "—"} hint="Time without moving" icon={Anchor} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card">
        <div className="flex items-center gap-2 border-b border-border/20 px-4 py-4 sm:px-5">
          <Smartphone className="h-4 w-4 text-teal-600" />
          <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-foreground">Phone Monitoring Periods</h2>
          <span className="ml-auto text-[10px] text-muted-foreground/40">MDT</span>
        </div>
        {periods.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground sm:px-5">
            The phone was not the monitored device at any time on this day.
          </div>
        ) : (
          <ul className="divide-y divide-border/10">
            {periods.map((period, index) => {
              const seconds = Math.max(0, Math.round((new Date(period.end).getTime() - new Date(period.start).getTime()) / 1000))
              const updates = period.locationUpdates
              return (
                <li key={`${period.start}-${index}`} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[13px] font-bold text-foreground">
                      {fmtClock(period.start)} to {period.endedBy === "open" ? "now" : fmtClock(period.end)}
                      <span className="ml-2 font-mono text-[12px] font-semibold text-muted-foreground">{fmtHuman(seconds)}</span>
                    </p>
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      {period.startedBy === "shift-start" ? "Shift started on the phone" : "Monitoring moved to the phone"}
                      {period.endedBy === "switch" ? " · then moved back to the computer" : period.endedBy === "time-out" ? " · shift ended" : " · still on the phone"}
                    </p>
                    {updates.count > 0 ? (
                      <p className="text-[12px] leading-snug text-muted-foreground">
                        {updates.count} location {updates.count === 1 ? "update" : "updates"} received
                        {updates.firstAt && updates.lastAt ? ` · ${fmtClock(updates.firstAt)} to ${fmtClock(updates.lastAt)}` : ""}
                      </p>
                    ) : (
                      <p className="text-[12px] leading-snug text-amber-700 dark:text-amber-300">No location updates were received from the phone during this time</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card">
        <div className="flex items-center gap-2 border-b border-border/20 px-4 py-4 sm:px-5">
          <MapPin className="h-4 w-4 text-blue-500" />
          <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-foreground">Movement &amp; Places</h2>
          <span className="ml-auto text-[10px] text-muted-foreground/40">GPS records for the day</span>
        </div>
        {!hasMovement ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground sm:px-5">No GPS movement or places recorded for this day.</div>
        ) : (
          <ul className="divide-y divide-border/10">
            {timeline.length === 0 && (
              <li className="px-4 py-6 text-center text-[13px] text-muted-foreground sm:px-5">
                Movement was recorded, but no stops or places were detected.
              </li>
            )}
            {timeline.map((entry, index) =>
              entry.kind === "place" ? (
                <li key={`place-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{entry.visit.placeName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/60">
                      {fmtClock(entry.visit.enteredAt)} to {entry.visit.exitedAt ? fmtClock(entry.visit.exitedAt) : "still here"}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-blue-500">
                    {entry.visit.durationMin != null ? fmtHuman(entry.visit.durationMin * 60) : "—"}
                  </span>
                </li>
              ) : (
                <li key={`stay-${index}`} className="flex items-center gap-3 bg-muted/10 px-4 py-3 sm:px-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/30">
                    <Anchor className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-muted-foreground/70">Stayed in one spot</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/60">
                      {fmtClock(entry.segment.start)} to {fmtClock(entry.segment.end)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-muted-foreground/60">{fmtHuman(entry.segment.durationMin * 60)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
