"use client"

import { Clock } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { getCalendarTimeZoneAbbreviation } from "@/utils/calendar.utils"

export function formatDualTime(date: Date) {
  const mountain = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Denver",
  })
  const mountainZone = getCalendarTimeZoneAbbreviation(date)
  const utc = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
  return { mountain, mountainZone, utc }
}

/**
 * The driver home's date, Mountain Time and UTC. It ticks on its own every
 * second, so the rest of the page (map, loads, status) no longer redraws with
 * it (2026-11-18).
 */
export function DriverHeaderClock() {
  const now = useNow(1000)
  const { mountain, mountainZone, utc } = formatDualTime(now)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Clock className="size-3 shrink-0" />
      <span>{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Denver" })}</span>
      <span className="font-semibold tabular-nums">{mountain} {mountainZone}</span>
      <span className="hidden sm:inline tabular-nums">({utc} UTC)</span>
    </div>
  )
}
