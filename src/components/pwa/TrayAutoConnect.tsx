"use client"

import * as React from "react"

const TRAY_AUTH_URL = "http://127.0.0.1:18642/auth"
const RETRY_INTERVAL_MS = 10_000

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

  React.useEffect(() => {
    let cancelled = false

    const attempt = async () => {
      if (connectedRef.current || cancelled) return
      const token = getActiveToken()
      if (!token) return
      try {
        const res = await fetch(TRAY_AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(2000),
        })
        if (res.ok) connectedRef.current = true
      } catch {
        // Tray app not running (yet) — silently retry on the next tick.
      }
    }

    attempt()
    const interval = setInterval(attempt, RETRY_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return null
}
