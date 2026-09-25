"use client"

import * as React from "react"
import { getActiveTrayToken, pushTokenToTray } from "@/lib/trayConnection"

const FAST_INTERVAL_MS = 3_000
const FAST_ATTEMPTS = 5
const SLOW_INTERVAL_MS = 10_000
const SLOW_FAILURE_LIMIT = 15
const CAPPED_INTERVAL_MS = 20_000
const KEEPALIVE_INTERVAL_MS = 60_000
const TOKEN_WATCH_INTERVAL_MS = 2_000

export function TrayAutoConnect() {
  React.useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let inFlight = false
    let connected = false
    let failures = 0
    let lastToken: string | null = null

    const nextDelay = () => {
      if (connected) return KEEPALIVE_INTERVAL_MS
      if (failures < FAST_ATTEMPTS) return FAST_INTERVAL_MS
      if (failures < SLOW_FAILURE_LIMIT) return SLOW_INTERVAL_MS
      return CAPPED_INTERVAL_MS
    }

    const schedule = () => {
      if (cancelled) return
      clearTimeout(timeoutId)
      timeoutId = setTimeout(attempt, nextDelay())
    }

    const attempt = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const token = getActiveTrayToken()
        lastToken = token
        if (!token) return
        const result = await pushTokenToTray(token)
        if (cancelled) return
        if (result === "connected") {
          connected = true
          failures = 0
        } else {
          connected = false
          failures += 1
        }
      } finally {
        inFlight = false
        schedule()
      }
    }

    const pushNow = () => {
      if (cancelled) return
      clearTimeout(timeoutId)
      attempt()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") pushNow()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "crm_token") {
        failures = 0
        pushNow()
      }
    }

    const tokenWatcher = setInterval(() => {
      const current = getActiveTrayToken()
      if (current && current !== lastToken) {
        failures = 0
        pushNow()
      }
    }, TOKEN_WATCH_INTERVAL_MS)

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", pushNow)
    window.addEventListener("online", pushNow)
    window.addEventListener("storage", onStorage)

    attempt()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      clearInterval(tokenWatcher)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", pushNow)
      window.removeEventListener("online", pushNow)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return null
}
