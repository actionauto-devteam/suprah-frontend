import * as React from "react"

const CLOCK_STEP_MS = 30000
const clockListeners = new Set<() => void>()
let clockTimer: ReturnType<typeof setInterval> | null = null
let clockNow = 0

function subscribeToClock(listener: () => void) {
  clockListeners.add(listener)
  if (clockTimer === null) {
    clockNow = Date.now()
    clockTimer = setInterval(() => {
      clockNow = Date.now()
      clockListeners.forEach((notify) => notify())
    }, CLOCK_STEP_MS)
  }
  return () => {
    clockListeners.delete(listener)
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
}

const readClock = () => clockNow
const readServerClock = () => 0

export function useWaitingClock(): number {
  return React.useSyncExternalStore(subscribeToClock, readClock, readServerClock)
}
