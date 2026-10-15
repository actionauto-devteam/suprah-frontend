"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"

// Driver photo uploads (pickup and delivery proof) that fail only because the
// phone has no signal keep the photo on screen and send it again on their own
// as soon as the connection is back, instead of showing an error.

/** True when a request failed because the phone has no connection (the server never answered). */
export function isNoConnectionError(error: unknown): boolean {
  const e = error as { response?: unknown; code?: string; message?: string } | null | undefined
  if (!e || e.response) return false
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  return e.code === "ERR_NETWORK" || e.message === "Network Error"
}

/**
 * While `waiting` is true, calls `retry` when the phone comes back online,
 * and also on a timer (the online event isn't always reliable) that backs off
 * from 20 seconds to at most 2 minutes, so a flaky connection can't use up the
 * upload limit. Nothing runs while `busy` (a send is already in progress).
 */
export function useSendWhenBackOnline(waiting: boolean, retry: () => void, busy = false) {
  const retryRef = React.useRef(retry)
  const attemptsRef = React.useRef(0)
  React.useEffect(() => {
    retryRef.current = retry
  }, [retry])

  React.useEffect(() => {
    if (!waiting) attemptsRef.current = 0
  }, [waiting])

  React.useEffect(() => {
    if (!waiting || busy) return
    const attempt = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return
      attemptsRef.current += 1
      retryRef.current()
    }
    const delay = Math.min(20_000 * 2 ** attemptsRef.current, 120_000)
    window.addEventListener("online", attempt)
    const timer = window.setTimeout(attempt, delay)
    return () => {
      window.removeEventListener("online", attempt)
      window.clearTimeout(timer)
    }
  }, [waiting, busy])
}

/** The plain-English notice shown while a photo waits for signal. */
export function WaitingForSignalNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" />
      <span>
        No signal right now. Keep this screen open: your photo is kept here and will be sent
        automatically as soon as you&apos;re back online.
      </span>
    </div>
  )
}
