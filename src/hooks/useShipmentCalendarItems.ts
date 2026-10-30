"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import { fromZoned } from "@/utils/calendar.utils"
import { shipmentToCalendarItem, type CalendarShipmentEntry } from "@/lib/calendar-shipments"
import type { CalendarItem } from "@/types/calendar.types"

/** Mountain Time midnight (or the last second) of a calendar day, like the calendar's own all-day items. */
const dayToInstant = (day: string, endOfDay: boolean): string => {
  const [year, month, date] = day.split("-").map(Number)
  const wall = endOfDay ? new Date(year, month - 1, date, 23, 59, 59) : new Date(year, month - 1, date, 0, 0, 0)
  return fromZoned(wall).toISOString()
}

/**
 * Transportation's pickup windows and delivery deadlines for the calendar's
 * visible range. Empty for staff who don't dispatch, and when the request
 * fails (the calendar itself keeps working).
 */
export function useShipmentCalendarItems(rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const [items, setItems] = React.useState<CalendarItem[]>([])
  const from = rangeStart.toISOString()
  const to = rangeEnd.toISOString()

  React.useEffect(() => {
    const controller = new AbortController()
    apiClient
      .get("/api/loads/calendar", { params: { from, to }, signal: controller.signal })
      .then((res) => {
        const data = res.data?.data ?? res.data
        const entries: CalendarShipmentEntry[] = Array.isArray(data?.items) ? data.items : []
        setItems(entries.map((entry) => shipmentToCalendarItem(entry, dayToInstant)))
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.warn("Could not load shipments for the calendar", err)
        setItems([])
      })
    return () => controller.abort()
  }, [from, to])

  return items
}
