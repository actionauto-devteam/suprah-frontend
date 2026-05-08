"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Check, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface CrmCalendarSyncButtonProps {
  onSyncComplete?: () => void
  compactOnMobile?: boolean
  className?: string
}

export function CrmCalendarSyncButton({
  onSyncComplete,
  compactOnMobile = false,
  className,
}: CrmCalendarSyncButtonProps) {
  const [syncing, setSyncing] = React.useState(false)
  const [syncResult, setSyncResult] = React.useState<"success" | "error" | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  const crmToken = typeof window !== "undefined" ? localStorage.getItem("crm_token") : null

  // Don't render if no CRM session
  if (!crmToken) return null

  const handleSync = async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) return
    try {
      setSyncing(true)
      setSyncResult(null)
      setMessage(null)

      const response = await apiClient.post(
        "/api/crm/calendar/sync",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000,
        }
      )

      const data = response.data?.data || response.data
      const syncedCount = data?.count ?? 0

      setSyncResult("success")
      setMessage(`Synced ${syncedCount} event${syncedCount !== 1 ? "s" : ""} from Google Calendar.`)

      if (onSyncComplete) {
        await onSyncComplete()
      }
    } catch (error: unknown) {
      console.error("[CrmCalendarSyncButton] Sync error:", error)
      setSyncResult("error")
      const err = error as {
        code?: string
        message?: string
        response?: { status?: number; data?: { message?: string } }
      }

      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        setMessage("Sync timed out. Please try again.")
      } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        setMessage("Cannot reach server. Check that the backend is running.")
      } else if (err.response?.status === 403) {
        setMessage("Google account is missing required permissions. Please disconnect and reconnect your Google account.")
      } else if (err.response?.status === 401) {
        const errMsg = err.response?.data?.message || ""
        if (errMsg.toLowerCase().includes("reconnect")) {
          setMessage("Google Calendar needs to be reconnected. Please disconnect and reconnect your calendar.")
        } else {
          setMessage("Not authorized. Please connect Google Calendar first.")
        }
      } else if (err.response?.status === 500) {
        const errMsg = err.response?.data?.message || "Server error during sync"
        if (
          errMsg.toLowerCase().includes("refresh token") ||
          errMsg.toLowerCase().includes("no refresh token") ||
          errMsg.toLowerCase().includes("insufficient")
        ) {
          setMessage("Google Calendar needs to be reconnected. Please disconnect and reconnect your calendar.")
        } else {
          setMessage(errMsg)
        }
      } else {
        setMessage(err.response?.data?.message || "Failed to sync.")
      }

      const isPartialSync = !!err.response
      if (isPartialSync && onSyncComplete) {
        await onSyncComplete()
      }
    } finally {
      setSyncing(false)
      setTimeout(() => {
        setSyncResult(null)
        setMessage(null)
      }, 5000)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className={cn(compactOnMobile && "px-2.5 sm:px-3", className)}
        aria-label={syncing ? "Syncing calendar" : "Sync calendar"}
      >
        {syncing ? (
          <RefreshCw
            className={cn(
              "h-4 w-4 animate-spin",
              compactOnMobile ? "sm:mr-2" : "mr-2",
            )}
          />
        ) : syncResult === "success" ? (
          <Check
            className={cn(
              "h-4 w-4 text-green-500",
              compactOnMobile ? "sm:mr-2" : "mr-2",
            )}
          />
        ) : syncResult === "error" ? (
          <AlertCircle
            className={cn(
              "h-4 w-4 text-red-500",
              compactOnMobile ? "sm:mr-2" : "mr-2",
            )}
          />
        ) : (
          <RefreshCw
            className={cn("h-4 w-4", compactOnMobile ? "sm:mr-2" : "mr-2")}
          />
        )}
        <span className={cn(compactOnMobile && "hidden sm:inline")}>
          {syncing ? "Syncing..." : "Sync Calendar"}
        </span>
      </Button>

      {message && (
        <div
          className={`absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] px-3 py-2 rounded-md text-sm whitespace-normal z-50 shadow-md ${
            syncResult === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}
