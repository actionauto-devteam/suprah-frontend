"use client"

import * as React from "react"

const TRAY_AUTH_URL = "http://127.0.0.1:18642/auth"
const RETRY_INTERVAL_MS = 10_000
// After enough consecutive failures (Chrome's Private Network Access blocking
// this fetch outright on browsers/tray versions that don't support it yet,
// or the tray genuinely not running), back off to a slower cadence — retrying
// every 10s forever floods devtools with an unsuppressable browser-level CORS
// log line on every attempt (can't be silenced from application code) without
// actually getting closer to connecting.
const BACKOFF_AFTER_FAILURES = 6
const BACKOFF_INTERVAL_MS = 120_000

function getActiveToken(): string | null {
  if (typeof window === "undefined") return null
  const crmToken = localStorage.getItem("crm_token")
  if (crmToken) return crmToken
  return (window as any).__AUTH_TOKEN__ || null
}

/**
 * Silently hands the current session's token to the desktop tray app the
 * moment it becomes reachable on localhost — no manual sign-in inside the
 * tray app itself. Mounted once at the root layout so it runs app-wide
 * (not just on TimeProof pages) and works for either a CRM session or a
 * main-system session, whichever is active.
 */
export function TrayAutoConnect() {
  const connectedRef = React.useRef(false)
  const failureCountRef = React.useRef(0)

  React.useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleNext = () => {
      if (cancelled) return
      const delay = failureCountRef.current >= BACKOFF_AFTER_FAILURES ? BACKOFF_INTERVAL_MS : RETRY_INTERVAL_MS
      timeoutId = setTimeout(attempt, delay)
    }

    const attempt = async () => {
      if (connectedRef.current || cancelled) { scheduleNext(); return }
      const token = getActiveToken()
      if (!token) { scheduleNext(); return }
      try {
        const res = await fetch(TRAY_AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(2000),
        })
        if (res.ok) {
          connectedRef.current = true
          failureCountRef.current = 0
        } else {
          failureCountRef.current += 1
        }
      } catch {
        // Tray app not running (yet), or the browser blocked this loopback
        // fetch outright (Private Network Access) — either way, back off
        // after repeated failures instead of retrying every 10s forever.
        failureCountRef.current += 1
      }
      scheduleNext()
    }

    attempt()
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [])

  return null
}
