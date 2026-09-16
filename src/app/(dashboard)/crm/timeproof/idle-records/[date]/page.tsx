"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, AlertTriangle, ImageOff, Download, VideoOff } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { IdlePeriod } from "@/components/crm/timeproof/shared"

interface Screenshot {
  _id: string
  capturedAt: string
  idleDetected: boolean
  idleStage: number | null
  url: string
}

interface IdleRecording {
  _id: string
  idleStartMs: number
  chunkIndex: number
  status: "partial" | "confirmed"
  url: string
}

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const toMDTDate = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)
const fmtTime = (iso: string) =>
  toMDTDate(new Date(iso)).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "UTC" })

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Pairs each idle period with the most recent regular screenshot taken BEFORE it started,
 * plus up to 3 staged-evidence entries (10/20/30 min) — one screenshot + one video chunk
 * per stage the idle period actually reached, matched by the explicit idleStage/chunkIndex
 * identifiers the tray now sends rather than inferring purely from timestamp proximity
 * (more robust than the old single time-window-only match). Purely client-side against the
 * three existing endpoints (idle-log, screenshots, idle-recordings) — no new backend
 * aggregation. A period from an older tray build (or one that never reached a given stage)
 * simply has fewer/no entries for it, shown honestly rather than a broken image.
 */
const RECORDING_MATCH_TOLERANCE_MS = 5 * 60_000
const STAGE_MINUTES = [10, 20, 30] as const

function pairIdlePeriod(period: IdlePeriod, screenshots: Screenshot[], recordings: IdleRecording[]) {
  const startMs = new Date(period.idleStart).getTime()
  const endMs = period.idleEnd ? new Date(period.idleEnd).getTime() : Date.now()

  let before: Screenshot | null = null
  for (const s of screenshots) {
    const t = new Date(s.capturedAt).getTime()
    if (t <= startMs && (!before || t > new Date(before.capturedAt).getTime())) before = s
  }

  const stages = STAGE_MINUTES.map((minutes, idx) => {
    const chunkIndex = idx + 1
    const screenshot = screenshots.find((s) => {
      const t = new Date(s.capturedAt).getTime()
      return s.idleStage === minutes && t >= startMs && t <= endMs
    }) ?? null
    const video = recordings.find((r) =>
      r.chunkIndex === chunkIndex &&
      r.idleStartMs >= startMs - RECORDING_MATCH_TOLERANCE_MS &&
      r.idleStartMs <= endMs
    ) ?? null
    return { minutes, screenshot, video }
  }).filter((s) => s.screenshot || s.video)

  return { before, stages }
}

export default function IdleRecordScreenshotsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateStr = params.date as string
  const userId = searchParams.get("userId") ?? undefined

  const [idlePeriods, setIdlePeriods] = React.useState<IdlePeriod[]>([])
  const [screenshots, setScreenshots] = React.useState<Screenshot[]>([])
  const [recordings, setRecordings] = React.useState<IdleRecording[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  // The listing's embedded downloadUrl is signed for 15 minutes — fine for an immediate click,
  // but stale by the time someone reviews a few videos on this page before downloading one, and
  // the browser then shows a raw R2 "ExpiredRequest" XML error. Minting a fresh signature at
  // click-time instead means the link never goes stale no matter how long the page's been open.
  const handleDownloadVideo = async (video: IdleRecording) => {
    const token = localStorage.getItem("crm_token")
    if (!token || downloadingId) return
    setDownloadingId(video._id)
    try {
      const res = await apiClient.get(
        `/api/crm/timeproof/idle-recordings/download-url?key=${encodeURIComponent(video._id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const freshUrl = res.data?.data?.downloadUrl
      if (freshUrl) window.open(freshUrl, "_blank", "noopener,noreferrer")
    } catch {
      // Best-effort — the video is still viewable inline either way.
    } finally {
      setDownloadingId(null)
    }
  }

  const formattedDate = React.useMemo(() => {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    })
  }, [dateStr])

  React.useEffect(() => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }

    const idleLogEndpoint = userId
      ? `/api/crm/timeproof/user/${userId}/idle-log?startDate=${dateStr}&endDate=${dateStr}`
      : `/api/crm/timeproof/idle-log?startDate=${dateStr}&endDate=${dateStr}`
    const screenshotsQs = new URLSearchParams({ date: dateStr })
    if (userId) screenshotsQs.set("userId", userId)

    setLoading(true)
    Promise.all([
      apiClient.get(idleLogEndpoint, { headers: { Authorization: `Bearer ${token}` } }),
      apiClient.get(`/api/crm/timeproof/screenshots?${screenshotsQs.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
      apiClient.get(`/api/crm/timeproof/idle-recordings?${screenshotsQs.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([idleRes, ssRes, recRes]) => {
        const periods: IdlePeriod[] = idleRes.data?.data?.idleLog ?? []
        const list: Screenshot[] = ssRes.data?.data?.screenshots ?? []
        const recs: IdleRecording[] = recRes.data?.data?.recordings ?? []
        list.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
        setIdlePeriods(periods)
        setScreenshots(list)
        setRecordings(recs)
        setError("")
      })
      .catch((e: any) => setError(e?.response?.data?.message || "Failed to load idle records."))
      .finally(() => setLoading(false))
  }, [dateStr, userId, router])

  return (
    <div className="min-h-screen bg-background timeproof-scope">
      <div
        className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight truncate">Idle Records</p>
            <p className="text-[10px] text-muted-foreground/40 truncate">{formattedDate}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : idlePeriods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/25" />
            <p className="text-sm font-semibold text-muted-foreground/50">No idle periods recorded for this day.</p>
          </div>
        ) : (
          idlePeriods.map((period, i) => {
            const { before, stages } = pairIdlePeriod(period, screenshots, recordings)
            return (
              <div key={i} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-rose-50/30 dark:bg-rose-950/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      {fmtTime(period.idleStart)} {period.idleEnd ? `– ${fmtTime(period.idleEnd)}` : "(ongoing)"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                    {fmtDuration(period.durationSeconds)}
                  </span>
                </div>

                <div className="p-3 space-y-2 border-b border-border/20">
                  <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">Before idle</p>
                  {before ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={before.url} alt="Before idle" className="w-full max-w-sm aspect-video object-cover rounded-lg" />
                      <p className="text-[10px] text-muted-foreground/40 font-mono">{fmtTime(before.capturedAt)}</p>
                    </>
                  ) : (
                    <div className="w-full max-w-sm aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                      <ImageOff className="h-4 w-4 text-muted-foreground/25" />
                      <p className="text-[9px] text-muted-foreground/35">No earlier screenshot</p>
                    </div>
                  )}
                </div>

                {stages.length === 0 ? (
                  <div className="p-3">
                    <div className="w-full aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                      <VideoOff className="h-4 w-4 text-muted-foreground/25" />
                      <p className="text-[9px] text-muted-foreground/35">No staged evidence for this period</p>
                    </div>
                  </div>
                ) : (
                  stages.map(({ minutes, screenshot, video }) => (
                    <div key={minutes} className="grid grid-cols-2 gap-px bg-border/30 border-t border-border/20">
                      <div className="bg-card p-3 space-y-2 col-span-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">
                          {minutes === 30 ? `Auto-end (${minutes} min idle)` : `Confirmed idle (${minutes} min)`}
                        </p>
                      </div>
                      <div className="bg-card p-3 pt-0 space-y-2">
                        {screenshot ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={screenshot.url} alt={`Idle ${minutes} min screenshot`} className="w-full aspect-video object-cover rounded-lg" />
                            <p className="text-[10px] text-muted-foreground/40 font-mono">{fmtTime(screenshot.capturedAt)}</p>
                          </>
                        ) : (
                          <div className="w-full aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                            <ImageOff className="h-4 w-4 text-muted-foreground/25" />
                            <p className="text-[9px] text-muted-foreground/35">No screenshot</p>
                          </div>
                        )}
                      </div>
                      <div className="bg-card p-3 pt-0 space-y-2">
                        {video ? (
                          <>
                            <video src={video.url} controls muted className="w-full aspect-video object-cover rounded-lg bg-black" />
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] text-muted-foreground/40 font-mono">
                                {video.status === "partial" ? "(partial clip)" : "confirmed"}
                              </p>
                              <button
                                onClick={() => handleDownloadVideo(video)}
                                disabled={downloadingId === video._id}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 disabled:opacity-50"
                              >
                                <Download className="h-3 w-3" /> {downloadingId === video._id ? "Preparing…" : "Download"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                            <VideoOff className="h-4 w-4 text-muted-foreground/25" />
                            <p className="text-[9px] text-muted-foreground/35">No video</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
