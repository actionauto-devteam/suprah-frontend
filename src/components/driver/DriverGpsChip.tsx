"use client"

import { useNow } from "@/hooks/useNow"
import { formatShortAge } from "@/lib/driver-next-stop"
import { locationBlockedChip } from "@/lib/driver-location-messages"
import { cn } from "@/lib/utils"

export type GpsChipTone = "live" | "stale" | "waiting" | "blocked" | "off"

export type GpsChipInput = {
  permissionDenied: boolean
  inNativeApp: boolean
  isStarting: boolean
  isSharing: boolean
  /** A GPS fix has arrived (the driver's last position). */
  hasFix: boolean
  /** When that fix was measured (ms), when known. */
  recordedAt?: number | null
}

/** The chip's state: its color, what it shows, and what screen readers hear. */
export function gpsChipState(input: GpsChipInput, now: number): { tone: GpsChipTone; text: string; spoken: string } {
  const age = input.hasFix && input.recordedAt ? Math.max(0, (now - input.recordedAt) / 1000) : null
  if (input.permissionDenied) {
    const text = locationBlockedChip(input.inNativeApp)
    return { tone: "blocked", text, spoken: text }
  }
  if (input.isStarting) return { tone: "waiting", text: "Connecting to GPS…", spoken: "Connecting to GPS…" }
  if (input.isSharing && input.hasFix) {
    if (age === null) return { tone: "live", text: "Live", spoken: "Live" }
    return age <= 90
      ? { tone: "live", text: `Live · updated ${formatShortAge(age)} ago`, spoken: "Live" }
      : { tone: "stale", text: `Last update ${formatShortAge(age)} ago`, spoken: "Your location hasn't updated for over a minute" }
  }
  if (input.isSharing) return { tone: "waiting", text: "Waiting for a GPS fix…", spoken: "Waiting for a GPS fix…" }
  return { tone: "off", text: "Not sharing your location", spoken: "Not sharing your location" }
}

const DOT: Record<GpsChipTone, string> = {
  live: "bg-emerald-500",
  stale: "bg-amber-500",
  waiting: "bg-amber-500 animate-pulse motion-reduce:animate-none",
  blocked: "bg-rose-500",
  off: "bg-slate-400",
}
const TEXT: Record<GpsChipTone, string> = {
  live: "text-emerald-700 dark:text-emerald-400",
  stale: "text-amber-700 dark:text-amber-400",
  waiting: "text-amber-700 dark:text-amber-400",
  blocked: "text-rose-700 dark:text-rose-400",
  off: "text-muted-foreground",
}

/**
 * The GPS status chip on the driver home's map (2026-11-18). Its "updated
 * 3 s ago" ticks on its own every second, so the page no longer redraws with
 * it, and screen readers hear only status changes, not every passing second.
 */
export function DriverGpsChip({ className, ...input }: GpsChipInput & { className?: string }) {
  const now = useNow(1000)
  const chip = gpsChipState(input, now.getTime())
  return (
    <div className={className}>
      <span role="status" aria-live="polite" className="sr-only">{chip.spoken}</span>
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="relative flex size-2 shrink-0">
          {chip.tone === "live" && (
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={cn("relative inline-flex rounded-full size-2", DOT[chip.tone])} />
        </span>
        <span className={cn("text-xs font-bold leading-snug", TEXT[chip.tone])}>{chip.text}</span>
      </div>
    </div>
  )
}
