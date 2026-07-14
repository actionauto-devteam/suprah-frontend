"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Camera,
  Clock,
  Shield,
  AlertTriangle,
  Coffee,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Loader2,
  Play,
  LogIn,
  LogOut,
  MapPin,
  Gauge,
  Anchor,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { LiveClock } from "@/components/crm/LiveClock"

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */
interface Screenshot {
  _id: string
  capturedAt: string
  idleDetected: boolean
  url: string
  isBlurred?: boolean
}

interface BreakSegment {
  from: number  // timestamp ms
  to: number
  duration: number  // ms
}

interface ActualBreak {
  in: string
  out: string | null
  duration: number  // seconds (from backend)
  isActive: boolean
}

interface WorkSession {
  in: string
  out: string | null
  duration: number
  isLive: boolean
}

interface LotTechDayData {
  sessions: WorkSession[]
  totalSeconds: number
  breakSeconds: number
}

interface PlaceVisitEntry {
  placeName: string
  enteredAt: string
  exitedAt: string | null
  durationMin: number | null
}

interface StationarySegment {
  start: string
  end: string
  durationMin: number
}

interface DailyActivityLog {
  distanceMi: number
  topSpeedMph: number
  stationaryMinutes: number
  stationarySegments: StationarySegment[]
  placeVisits: PlaceVisitEntry[]
}

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */
// Only used for timeline gap rendering — high threshold so regular 10-min
// screenshot intervals are never mistaken for breaks in the visual bar.
const TIMELINE_GAP_THRESHOLD_MS = 25 * 60 * 1000  // 25 minutes

// Display all times in MDT (UTC-6) to match the backend's COMPANY_TZ_OFFSET_MINUTES = -360
const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const fmtTime = (iso: string) =>
  new Date(new Date(iso).getTime() + MDT_OFFSET_MS).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })

const fmtDuration = (ms: number) => {
  if (ms === 0) return "0"
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h === 0 && m === 0) return "< 1m"
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const fmtWorkTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return "0m"
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const actualBreaksToSegments = (breaks: ActualBreak[]): BreakSegment[] =>
  breaks.map((b) => ({
    from: new Date(b.in).getTime(),
    to: b.out ? new Date(b.out).getTime() : Date.now(),
    duration: b.duration * 1000,
  }))

const totalBreakMs = (breaks: BreakSegment[]) =>
  breaks.reduce((acc, b) => acc + b.duration, 0)

/* ─────────────────────────────────────────────────────────────────────────
   Timeline
───────────────────────────────────────────────────────────────────────── */
const Timeline = ({
  screenshots,
  breaks,
  onDotClick,
}: {
  screenshots: Screenshot[]
  breaks: BreakSegment[]
  onDotClick: (index: number) => void
}) => {
  if (screenshots.length === 0) return null

  const times = screenshots.map((s) => new Date(s.capturedAt).getTime())
  const minT = times[0]
  const maxT = times[times.length - 1]
  const range = maxT - minT || 1

  const toPos = (ms: number) => ((ms - minT) / range) * 100

  const startLabel = fmtTime(screenshots[0].capturedAt)
  const endLabel = fmtTime(screenshots[screenshots.length - 1].capturedAt)

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
        Screenshot Timeline
      </p>

      <div className="relative h-10 rounded-xl bg-muted/20 border border-border/20 overflow-hidden">
        {/* Work segments (green fill between consecutive non-break screenshots) */}
        {screenshots.slice(1).map((_s, i) => {
          const prev = times[i]
          const curr = times[i + 1]
          const gap = curr - prev
          const isBreak = gap > TIMELINE_GAP_THRESHOLD_MS
          if (isBreak) return null
          const left = toPos(prev)
          const width = toPos(curr) - left
          return (
            <div
              key={i}
              className="absolute top-1 bottom-1 bg-emerald-500/60 rounded-sm"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.2)}%` }}
            />
          )
        })}

        {/* Break segments (orange fill) */}
        {breaks.map((b, i) => {
          const left = toPos(b.from)
          const width = toPos(b.to) - left
          return (
            <div
              key={i}
              className="absolute top-2 bottom-2 bg-amber-400/50 rounded-sm"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
              title={`Break: ${fmtDuration(b.duration)}`}
            />
          )
        })}

        {/* Screenshot dots */}
        {screenshots.map((s, i) => {
          const left = toPos(times[i])
          return (
            <button
              key={s._id}
              onClick={() => onDotClick(i)}
              title={fmtTime(s.capturedAt)}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full border border-background transition-transform hover:scale-150 z-10 ${
                s.idleDetected
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>

      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground/35 font-mono">{startLabel}</span>
        <span className="text-[9px] text-muted-foreground/35 font-mono">{endLabel}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
          <span className="h-2 w-4 rounded-sm bg-emerald-500/60" />
          Work
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
          <span className="h-2 w-4 rounded-sm bg-amber-400/50" />
          Break (&gt;8 min)
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Idle
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Fake perpetual "loading" placeholder — used in place of the actual <img>
   for screenshots that are server-blurred (screenshotBlurUntilPayout). A
   never-resolving loading state reads as an ordinary slow-loading image
   rather than a deliberately blocked one.
───────────────────────────────────────────────────────────────────────── */
const FakeLoadingThumb = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`flex items-center justify-center bg-muted/40 animate-pulse ${className ?? ""}`} style={style}>
    <Loader2 className="h-4 w-4 text-muted-foreground/30 animate-spin" />
  </div>
)

/* ─────────────────────────────────────────────────────────────────────────
   Lightbox
───────────────────────────────────────────────────────────────────────── */
const Lightbox = ({
  screenshots,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  screenshots: Screenshot[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) => {
  const s = screenshots[index]

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onPrev, onNext])

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/60">
            {index + 1} / {screenshots.length}
          </span>
          <span className="text-xs text-white/80 font-medium">
            {fmtTime(s.capturedAt)}
          </span>
          {s.idleDetected && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
              <AlertTriangle className="h-2.5 w-2.5" />
              Idle
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="absolute left-2 sm:left-6 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20 transition-colors z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {s.isBlurred ? (
          <FakeLoadingThumb className="w-full max-w-md rounded-lg" style={{ aspectRatio: "16/9" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s._id}
            src={s.url}
            alt={`Screenshot at ${fmtTime(s.capturedAt)}`}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            style={{ maxHeight: "calc(100vh - 140px)" }}
          />
        )}

        <button
          onClick={onNext}
          disabled={index === screenshots.length - 1}
          className="absolute right-2 sm:right-6 h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20 transition-colors z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Filmstrip */}
      <div className="shrink-0 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max mx-auto justify-center">
          {screenshots.map((ss, i) => (
            <button
              key={ss._id}
              onClick={() => {
                const diff = i - index
                if (diff > 0) for (let j = 0; j < diff; j++) onNext()
                else for (let j = 0; j < -diff; j++) onPrev()
              }}
              className={`relative h-14 w-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                i === index
                  ? "border-white/80 opacity-100"
                  : "border-transparent opacity-40 hover:opacity-70"
              }`}
            >
              {ss.isBlurred ? (
                <FakeLoadingThumb className="w-full h-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ss.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {ss.idleDetected && (
                <div className="absolute inset-0 bg-rose-500/30" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Lot Tech Activity Log View
───────────────────────────────────────────────────────────────────────── */
function LotTechDayView({ dateStr, totalSecondsFromParam, formattedDate }: {
  dateStr: string; totalSecondsFromParam: number; formattedDate: string
}) {
  const router = useRouter()
  const [dayData, setDayData] = React.useState<LotTechDayData | null>(null)
  const [movement, setMovement] = React.useState<DailyActivityLog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    setLoading(true)
    Promise.all([
      apiClient.get("/api/timeclock/my?range=365"),
      apiClient.getDailyActivityLog({ date: dateStr }).catch(() => null),
    ])
      .then(([tpRes, moveRes]) => {
        const cal = tpRes.data?.data?.calendar ?? {}
        const d = cal[dateStr]
        setDayData(d ? {
          sessions: d.sessions ?? [],
          totalSeconds: d.totalSeconds ?? 0,
          breakSeconds: d.breakSeconds ?? 0,
        } : null)
        setMovement(moveRes?.data?.data ?? null)
      })
      .catch(() => setError("Failed to load activity log."))
      .finally(() => setLoading(false))
  }, [dateStr])

  const fmtSec = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
    if (h === 0 && m === 0) return "0m"
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const totalSec = dayData?.totalSeconds ?? totalSecondsFromParam
  const breakSec = dayData?.breakSeconds ?? 0
  const sessions = dayData?.sessions ?? []

  // Compute break intervals from session gaps
  const breakIntervals: { from: string; to: string; durationSec: number }[] = []
  for (let i = 0; i < sessions.length - 1; i++) {
    const prev = sessions[i]
    const next = sessions[i + 1]
    if (prev.out && next.in) {
      const gapSec = (new Date(next.in).getTime() - new Date(prev.out).getTime()) / 1000
      if (gapSec > 60) breakIntervals.push({ from: prev.out, to: next.in, durationSec: gapSec })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-black tracking-tight truncate">{formattedDate}</span>
          </div>
          <div className="ml-auto"><LiveClock /></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center animate-pulse">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-[11px] text-muted-foreground/40 tracking-[0.2em] uppercase font-semibold">Loading…</p>
          </div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">Work Time</p>
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-700 dark:text-emerald-300">{fmtSec(totalSec)}</p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Total for the day</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">Sessions</p>
                  <Play className="h-3.5 w-3.5 text-muted-foreground/25" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none">{sessions.length}</p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Work interval{sessions.length !== 1 ? "s" : ""}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3.5 space-y-2 col-span-2 sm:col-span-1 ${breakSec > 0 ? "border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/15" : "border-border/40 bg-card"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">Break Time</p>
                  <Coffee className={`h-3.5 w-3.5 ${breakSec > 0 ? "text-amber-500" : "text-muted-foreground/25"}`} />
                </div>
                <p className={`text-2xl font-black tracking-tight leading-none ${breakSec > 0 ? "text-amber-700 dark:text-amber-300" : ""}`}>{breakSec > 0 ? fmtSec(breakSec) : "0m"}</p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">{breakIntervals.length} break session{breakIntervals.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">Distance</p>
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/25" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none">{movement ? `${movement.distanceMi.toFixed(1)}mi` : "—"}</p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">GPS-tracked movement</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">Top Speed</p>
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground/25" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none">{movement ? `${movement.topSpeedMph}mph` : "—"}</p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Fastest recorded ping</p>
              </div>
            </div>

            {/* ── Movement & Places ── */}
            {movement && (movement.placeVisits.length > 0 || movement.stationarySegments.length > 0) && (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/20 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-black tracking-tight">Movement &amp; Places</p>
                  <span className="ml-auto text-[10px] text-muted-foreground/40">GPS-verified · MDT</span>
                </div>
                <div className="divide-y divide-border/10">
                  {[
                    ...movement.placeVisits.map((v) => ({
                      kind: "place" as const,
                      sortAt: new Date(v.enteredAt).getTime(),
                      v,
                    })),
                    ...movement.stationarySegments.map((s) => ({
                      kind: "stationary" as const,
                      sortAt: new Date(s.start).getTime(),
                      s,
                    })),
                  ]
                    .sort((a, b) => a.sortAt - b.sortAt)
                    .map((entry, i) =>
                      entry.kind === "place" ? (
                        <div key={`place-${i}`} className="flex items-center gap-4 px-5 py-4">
                          <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <MapPin className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground truncate">{entry.v.placeName}</p>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                              {fmtTime(entry.v.enteredAt)} → {entry.v.exitedAt ? fmtTime(entry.v.exitedAt) : "still here"}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-blue-500 font-mono shrink-0">
                            {entry.v.durationMin != null ? fmtSec(entry.v.durationMin * 60) : "—"}
                          </span>
                        </div>
                      ) : (
                        <div key={`stationary-${i}`} className="flex items-center gap-4 px-5 py-3 bg-muted/10">
                          <div className="h-8 w-8 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center shrink-0">
                            <Anchor className="h-3.5 w-3.5 text-muted-foreground/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-muted-foreground/60">Stayed in one spot</p>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                              {fmtTime(entry.s.start)} → {fmtTime(entry.s.end)}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-muted-foreground/50 font-mono shrink-0">{fmtSec(entry.s.durationMin * 60)}</span>
                        </div>
                      ),
                    )}
                </div>
              </div>
            )}

            {/* ── Activity Log ── */}
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground/50">No activity recorded for this day</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/20 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs font-black tracking-tight">Activity Log</p>
                  <span className="ml-auto text-[10px] text-muted-foreground/40">Server-verified timestamps · MDT</span>
                </div>

                <div className="divide-y divide-border/10">
                  {sessions.map((s, i) => {
                    const breakAfter = breakIntervals[i]
                    return (
                      <React.Fragment key={i}>
                        {/* Work session row */}
                        <div className="flex items-center gap-4 px-5 py-4">
                          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[13px] font-black font-mono tabular-nums text-foreground">
                                {fmtTime(s.in)}
                              </span>
                              <span className="text-muted-foreground/30 text-xs">→</span>
                              <span className="text-[13px] font-black font-mono tabular-nums text-foreground">
                                {s.out ? fmtTime(s.out) : (
                                  <span className="flex items-center gap-1.5 text-emerald-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active
                                  </span>
                                )}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                              {s.out ? fmtSec(s.duration) : "In progress"} · Session {i + 1}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">{s.out ? fmtSec(s.duration) : "—"}</p>
                          </div>
                        </div>

                        {/* Break row (gap to next session) */}
                        {breakAfter && (
                          <div className="flex items-center gap-4 px-5 py-3 bg-amber-500/4 border-l-2 border-amber-400/40">
                            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <Coffee className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold font-mono tabular-nums text-muted-foreground/60">{fmtTime(breakAfter.from)}</span>
                                <span className="text-muted-foreground/30 text-xs">→</span>
                                <span className="text-[12px] font-bold font-mono tabular-nums text-muted-foreground/60">{fmtTime(breakAfter.to)}</span>
                              </div>
                              <p className="text-[10px] text-amber-600/60 mt-0.5">Break · {fmtSec(Math.round(breakAfter.durationSec))}</p>
                            </div>
                            <span className="text-[11px] font-bold text-amber-500 font-mono shrink-0">{fmtSec(Math.round(breakAfter.durationSec))}</span>
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

                {/* Total footer */}
                <div className="px-5 py-4 border-t border-border/20 bg-muted/10 flex items-center gap-3">
                  <LogOut className="h-3.5 w-3.5 text-muted-foreground/30" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Total Worked</span>
                  <span className="ml-auto text-[15px] font-black font-mono text-foreground">{fmtSec(totalSec)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────── */
export default function ScreenshotGalleryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateStr = params.date as string
  const userId = searchParams.get("userId") ?? undefined
  const totalSecondsFromParam = parseInt(searchParams.get("t") ?? "0", 10) || 0

  const [screenshots, setScreenshots] = React.useState<Screenshot[]>([])
  const [actualBreaks, setActualBreaks] = React.useState<ActualBreak[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null)
  const [isLotTechMain, setIsLotTechMain] = React.useState<boolean | null>(null)

  const formattedDate = React.useMemo(() => {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    })
  }, [dateStr])

  // Detect Lot Tech main User mode: no crm_token + main token exists
  React.useEffect(() => {
    const crmToken = localStorage.getItem("crm_token")
    const mainToken = typeof window !== "undefined" ? (window as any).__AUTH_TOKEN__ : null
    if (!crmToken && mainToken) { setIsLotTechMain(true); return }
    setIsLotTechMain(false)
  }, [])

  // Screenshot + break fetch — only runs for CRM users (isLotTechMain === false)
  React.useEffect(() => {
    if (isLotTechMain !== false) return
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }

    setLoading(true)
    const qs = new URLSearchParams({ date: dateStr })
    if (userId) qs.set("userId", userId)

    Promise.all([
      apiClient.get(`/api/crm/timeproof/screenshots?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiClient.get(`/api/crm/timeproof/my?range=365`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([ssRes, tpRes]) => {
        const list: Screenshot[] = ssRes.data?.data?.screenshots ?? []
        list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        setScreenshots(list)
        const cal = tpRes.data?.data?.calendar ?? {}
        const dayBreaks: ActualBreak[] = cal[dateStr]?.breaks ?? []
        setActualBreaks(dayBreaks)
      })
      .catch((e: any) => setError(e?.response?.data?.message || "Failed to load screenshots."))
      .finally(() => setLoading(false))
  }, [dateStr, userId, router, isLotTechMain])

  const breaks = React.useMemo(() => actualBreaksToSegments(actualBreaks), [actualBreaks])
  const idleCount = screenshots.filter((s) => s.idleDetected).length
  const breakTotalMs = totalBreakMs(breaks)

  const openLightbox = (i: number) => setLightboxIndex(i)
  const closeLightbox = () => setLightboxIndex(null)
  const prevPhoto = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
  const nextPhoto = () =>
    setLightboxIndex((i) => (i !== null && i < screenshots.length - 1 ? i + 1 : i))

  // All hooks declared — conditional renders safe from here
  if (isLotTechMain === null) return null
  if (isLotTechMain === true) {
    return <LotTechDayView dateStr={dateStr} totalSecondsFromParam={totalSecondsFromParam} formattedDate={formattedDate} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-black tracking-tight truncate block">
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
              {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background animate-ping" />
            </div>
            <p className="text-[11px] text-muted-foreground/40 tracking-[0.2em] uppercase font-semibold">
              Loading screenshots…
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Work Time */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
                    Work Time
                  </p>
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none text-emerald-700 dark:text-emerald-300">
                  {fmtWorkTime(totalSecondsFromParam)}
                </p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Total for the day</p>
              </div>

              {/* Screenshots */}
              <div className="rounded-xl border border-border/40 bg-card px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
                    Screenshots
                  </p>
                  <Camera className="h-3.5 w-3.5 text-muted-foreground/25" />
                </div>
                <p className="text-2xl font-black tracking-tight leading-none">
                  {screenshots.length}
                </p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Captured today</p>
              </div>

              {/* Breaks */}
              <div
                className={`rounded-xl border px-4 py-3.5 space-y-2 ${
                  breaks.length > 0
                    ? "border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/15"
                    : "border-border/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
                    Breaks
                  </p>
                  <Coffee
                    className={`h-3.5 w-3.5 ${
                      breaks.length > 0 ? "text-amber-500" : "text-muted-foreground/25"
                    }`}
                  />
                </div>
                <p
                  className={`text-2xl font-black tracking-tight leading-none ${
                    breaks.length > 0 ? "text-amber-700 dark:text-amber-300" : ""
                  }`}
                >
                  {fmtDuration(breakTotalMs)}
                </p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">
                  {breaks.length} break session{breaks.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Idle Alerts */}
              <div
                className={`rounded-xl border px-4 py-3.5 space-y-2 ${
                  idleCount > 0
                    ? "border-rose-500/25 bg-rose-50/40 dark:bg-rose-950/15"
                    : "border-border/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
                    Idle Alerts
                  </p>
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${
                      idleCount > 0 ? "text-rose-500" : "text-muted-foreground/25"
                    }`}
                  />
                </div>
                <p
                  className={`text-2xl font-black tracking-tight leading-none ${
                    idleCount > 0 ? "text-rose-700 dark:text-rose-300" : ""
                  }`}
                >
                  {idleCount}
                </p>
                <p className="text-[10px] text-muted-foreground/40 leading-none">Flagged as idle</p>
              </div>
            </div>

            {/* ── Timeline ── */}
            {screenshots.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <Timeline
                  screenshots={screenshots}
                  breaks={breaks}
                  onDotClick={openLightbox}
                />
              </div>
            )}

            {/* ── Screenshot Grid ── */}
            {screenshots.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground/50">No screenshots for this day</p>
                <p className="text-xs text-muted-foreground/30">Screenshots are captured automatically during active sessions</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                    All Screenshots
                  </p>
                  <p className="text-[10px] text-muted-foreground/35">
                    Click any to enlarge
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {screenshots.map((s, i) => (
                    <button
                      key={s._id}
                      onClick={() => openLightbox(i)}
                      className="group flex flex-col gap-1.5 text-left focus:outline-none"
                    >
                      {/* Timestamp + idle badge — outside the image, top-right */}
                      <div className="flex items-center justify-end gap-2 px-0.5">
                        {s.idleDetected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Idle
                          </span>
                        )}
                        <span className="text-sm font-mono font-bold text-foreground/70 group-hover:text-foreground transition-colors">
                          {fmtTime(s.capturedAt)}
                        </span>
                      </div>

                      {/* Screenshot thumbnail */}
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 group-hover:border-primary/40 group-hover:shadow-lg transition-all bg-muted/20">
                        {s.isBlurred ? (
                          <FakeLoadingThumb className="w-full h-full" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.url}
                            alt={`Screenshot at ${fmtTime(s.capturedAt)}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                            loading="lazy"
                          />
                        )}

                        {/* Idle overlay */}
                        {s.idleDetected && (
                          <div className="absolute inset-0 bg-rose-500/20 border-2 border-rose-500/40 rounded-xl" />
                        )}

                        {/* Zoom icon — always visible on touch, hover-reveal on desktop */}
                        <div className="absolute inset-0 bg-black/15 sm:bg-black/0 sm:group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Break Details ── */}
            {breaks.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-black tracking-tight">Break Periods</p>
                  <span className="ml-auto text-[10px] text-muted-foreground/40">
                    Actual break sessions
                  </span>
                </div>
                <div className="space-y-1.5">
                  {breaks.map((b: BreakSegment, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50/30 dark:bg-amber-950/15 border border-amber-500/15"
                    >
                      <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-[11px] font-mono text-muted-foreground/60 flex-1">
                        {new Date(new Date(b.from).getTime() + MDT_OFFSET_MS).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" })}
                        <span className="mx-1.5 text-muted-foreground/30">–</span>
                        {new Date(new Date(b.to).getTime() + MDT_OFFSET_MS).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" })}
                      </span>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {fmtDuration(b.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && (
        <Lightbox
          screenshots={screenshots}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  )
}
