"use client"

import { Clock } from "lucide-react"
import { useNow } from "@/hooks/useNow"
import { getCalendarTimeZoneAbbreviation } from "@/utils/calendar.utils"

/**
 * Driver Tracker's Mountain Time clock. It ticks on its own every second, so
 * the rest of the page (map, drivers, loads) no longer redraws with it
 * (2026-11-18).
 */
export function TrackerHeaderClock() {
  const now = useNow(1000)
  return (
    <span className="flex w-full flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground xl:justify-end">
      <Clock className="size-3 shrink-0" />
      {now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Denver",
      })}
      <span className="text-primary/60 font-black whitespace-nowrap">
        {now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/Denver",
        })}{" "}
        {getCalendarTimeZoneAbbreviation(now)}
      </span>
      <span className="text-muted-foreground/40 font-medium normal-case whitespace-nowrap">
        (Mountain Time)
      </span>
    </span>
  )
}
