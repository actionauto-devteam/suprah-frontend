"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"
import { initializeSocket } from "@/lib/socket.client"
import { useAuth } from "@/providers/AuthProvider"
import { fromZoned } from "@/utils/calendar.utils"
import { shipmentToCalendarItem, type CalendarShipmentEntry } from "@/lib/calendar-shipments"
import type { CalendarItem } from "@/types/calendar.types"

/** Mountain Time midnight (or the last second) of a calendar day, like the calendar's own all-day items. */
const dayToInstant = (day: string, endOfDay: boolean): string => {
  const [year, month, date] = day.split("-").map(Number)
  const wall = endOfDay ? new Date(year, month - 1, date, 23, 59, 59) : new Date(year, month - 1, date, 0, 0, 0)
  return fromZoned(wall).toISOString()
}

/** Load changes arriving close together cause one refresh. */
const REFRESH_DELAY_MS = 1000

/**
 * Transportation's pickup windows and delivery deadlines for the calendar's
 * visible range. Empty for staff who don't dispatch, and when the request
 * fails (the calendar itself keeps working). Load changes (new dates, a
 * dispatcher change, delivery or cancellation) refresh it live.
 */
export function useShipmentCalendarItems(rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const { getToken } = useAuth()
  const [items, setItems] = React.useState<CalendarItem[]>([])
  const [version, setVersion] = React.useState(0)
  const from = rangeStart.toISOString()
  const to = rangeEnd.toISOString()
  // The range the shown items belong to.
  const shownRange = React.useRef<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    const range = `${from}|${to}`
    apiClient
      .get("/api/loads/calendar", { params: { from, to }, signal: controller.signal })
      .then((res) => {
        const data = res.data?.data ?? res.data
        const entries: CalendarShipmentEntry[] = Array.isArray(data?.items) ? data.items : []
        setItems(entries.map((entry) => shipmentToCalendarItem(entry, dayToInstant)))
        shownRange.current = range
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.warn("Could not load shipments for the calendar", err)
        // A failed live refresh keeps what's shown; a new range shows none.
        if (shownRange.current !== range) setItems([])
      })
    return () => controller.abort()
  }, [from, to, version])

  React.useEffect(() => {
    let active = true
    let timer: number | undefined
    let socket: ReturnType<typeof initializeSocket> | null = null
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (active) setVersion((v) => v + 1)
      }, REFRESH_DELAY_MS)
    }
    void (async () => {
      const token = await getToken()
      if (!token || !active) return
      socket = initializeSocket(token)
      socket.on("load:change", refresh)
    })()
    return () => {
      active = false
      window.clearTimeout(timer)
      socket?.off("load:change", refresh)
    }
  }, [getToken])

  return items
}
