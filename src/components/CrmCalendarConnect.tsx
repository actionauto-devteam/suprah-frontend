"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.17 22.56 15.4 22.56 12.25z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export function CrmCalendarConnect() {
  const [isConnected, setIsConnected] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)

  const crmToken = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null

  // Don't render if no CRM session
  if (!crmToken && !isLoading) return null

  React.useEffect(() => {
    if (!crmToken) { setIsLoading(false); return }
    checkConnection()
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkConnection()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const checkConnection = async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await apiClient.get("/api/crm/calendar/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = res.data?.data || res.data
      setIsConnected(data.connected || false)
    } catch {
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) return
    try {
      setIsConnecting(true)
      const res = await apiClient.get("/api/crm/calendar/auth", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { url } = res.data?.data || res.data
      if (!url) return setIsConnecting(false)

      const popup = window.open(url, "Google Auth", "width=500,height=600")
      if (!popup) return setIsConnecting(false)

      const pollConn = setInterval(async () => {
        try {
          const t = localStorage.getItem("crm_token")
          if (!t) return
          const r = await apiClient.get("/api/crm/calendar/status", {
            headers: { Authorization: `Bearer ${t}` },
          })
          const data = r.data?.data || r.data
          if (data.connected) {
            clearInterval(pollConn); clearInterval(pollClose)
            if (!popup.closed) popup.close()
            setIsConnected(true); setIsConnecting(false)
          }
        } catch {}
      }, 1000)

      const pollClose = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollConn); clearInterval(pollClose)
          checkConnection().then(() => setIsConnecting(false))
        }
      }, 500)

      setTimeout(() => {
        clearInterval(pollConn); clearInterval(pollClose)
        if (!popup.closed) popup.close()
        setIsConnecting(false)
      }, 300_000)
    } catch {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) return
    try {
      setIsConnecting(true)
      await apiClient.post("/api/crm/calendar/disconnect", {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all duration-150 cursor-pointer"

  if (isLoading) return (
    <button disabled className={`${base} border-border text-muted-foreground bg-card cursor-not-allowed`}>
      <Loader2 className="size-3.5 animate-spin" /> Checking…
    </button>
  )

  if (!crmToken) return null

  if (isConnecting) return (
    <button disabled className={`${base} border-border text-muted-foreground bg-card cursor-not-allowed`}>
      <Loader2 className="size-3.5 animate-spin" />
      {isConnected ? "Disconnecting…" : "Connecting…"}
    </button>
  )

  if (isConnected) return (
    <button
      onClick={handleDisconnect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${base} ${
        hovered
          ? "border-red-400/60 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
          : "border-emerald-400/60 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
      }`}
    >
      <GoogleIcon />
      <span className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${hovered ? "bg-red-500" : "bg-emerald-500"}`} />
        {hovered ? "Disconnect" : "Google Calendar"}
      </span>
    </button>
  )

  return (
    <button
      onClick={handleConnect}
      className={`${base} border-border text-foreground/70 bg-card hover:border-blue-400/60 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30`}
    >
      <GoogleIcon />
      Connect Google Calendar
    </button>
  )
}
