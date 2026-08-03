"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, AlertTriangle, ArrowRight, ImageOff } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { IdlePeriod } from "@/components/crm/timeproof/shared"

interface Screenshot {
  _id: string
  capturedAt: string
  idleDetected: boolean
  url: string
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Pairs each idle period with the most recent regular screenshot taken
 * BEFORE it started, and the idle-confirmation screenshot (idleDetected=true,
 * captureAndUploadOnce in the tray) taken somewhere within the period —
 * purely a client-side match against the two existing endpoints (idle-log,
 * screenshots), no new backend aggregation. Only reliable for periods after
 * the tray started actually taking the confirmation shot — older idle
 * periods (or a tray still on an older build) simply won't have an "after"
 * shot, and that's shown honestly rather than a broken image.
 */
function pairIdlePeriod(period: IdlePeriod, screenshots: Screenshot[]) {
  const startMs = new Date(period.idleStart).getTime()
  const endMs = period.idleEnd ? new Date(period.idleEnd).getTime() : Date.now()

  let before: Screenshot | null = null
  for (const s of screenshots) {
    const t = new Date(s.capturedAt).getTime()
    if (t <= startMs && (!before || t > new Date(before.capturedAt).getTime())) before = s
  }

  const after = screenshots.find((s) => {
    const t = new Date(s.capturedAt).getTime()
    return s.idleDetected && t >= startMs && t <= endMs
  }) ?? null

  return { before, after }
}

export default function IdleRecordScreenshotsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateStr = params.date as string
  const userId = searchParams.get("userId") ?? undefined

  const [idlePeriods, setIdlePeriods] = React.useState<IdlePeriod[]>([])
  const [screenshots, setScreenshots] = React.useState<Screenshot[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

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
    ])
      .then(([idleRes, ssRes]) => {
        const periods: IdlePeriod[] = idleRes.data?.data?.idleLog ?? []
        const list: Screenshot[] = ssRes.data?.data?.screenshots ?? []
        list.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
        setIdlePeriods(periods)
        setScreenshots(list)
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
            const { before, after } = pairIdlePeriod(period, screenshots)
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
                <div className="grid grid-cols-2 gap-px bg-border/30">
                  <div className="bg-card p-3 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">Before idle</p>
                    {before ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={before.url} alt="Before idle" className="w-full aspect-video object-cover rounded-lg" />
                        <p className="text-[10px] text-muted-foreground/40 font-mono">{fmtTime(before.capturedAt)}</p>
                      </>
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                        <ImageOff className="h-4 w-4 text-muted-foreground/25" />
                        <p className="text-[9px] text-muted-foreground/35">No earlier screenshot</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-card p-3 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/40">Confirmed idle (10 min)</p>
                    {after ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={after.url} alt="Confirmed idle" className="w-full aspect-video object-cover rounded-lg" />
                        <p className="text-[10px] text-muted-foreground/40 font-mono">{fmtTime(after.capturedAt)}</p>
                      </>
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-1">
                        <ImageOff className="h-4 w-4 text-muted-foreground/25" />
                        <p className="text-[9px] text-muted-foreground/35">No evidence shot for this period</p>
                      </div>
                    )}
                  </div>
                </div>
                {before && after && (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-[9px] font-bold text-muted-foreground/35 uppercase tracking-wider border-t border-border/20">
                    Compare <ArrowRight className="h-2.5 w-2.5" /> same screen, {fmtDuration(period.durationSeconds)} apart
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
