"use client"

import * as React from "react"

/**
 * The current time, refreshed every `intervalMs` (default every second).
 *
 * Use it inside the small part of the screen that shows the time (a clock, a
 * "2 s ago" label), not in a whole page: only the part that calls it redraws
 * on each tick (2026-11-18).
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
