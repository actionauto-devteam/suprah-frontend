"use client"

import * as React from "react"
import { Loader2, MapPinCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { userErrorMessage } from "@/lib/user-error"
import { arrivalAt, arrivalStopFor } from "@/lib/load-arrival"
import { formatMountainTime } from "@/lib/mountain-time"
import { cn } from "@/lib/utils"
import type { Load } from "@/types/load"

/**
 * "I've Arrived at Pickup / Delivery" for the driver's current stop. Once
 * tapped it shows when they arrived. Renders nothing when the load isn't at
 * a stop (not accepted yet, delivered, cancelled).
 */
export function DriverArrivalButton({
  load,
  onArrived,
  className,
}: {
  load: Load
  /** Called after the arrival is saved, to refresh the load. */
  onArrived?: () => void | Promise<void>
  className?: string
}) {
  const { getToken } = useAuth()
  const [saving, setSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)

  const stop = arrivalStopFor(load.status)
  // Forget the local "saved" time when the load moves to another stop.
  React.useEffect(() => setSavedAt(null), [stop, load._id])
  if (!stop) return null

  const arrivedAt = arrivalAt(load, stop) ?? savedAt
  const stopName = stop === "pickup" ? "pickup" : "delivery"

  if (arrivedAt) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300",
          className,
        )}
      >
        <MapPinCheck className="size-4 shrink-0" />
        You told Dispatch you arrived at the {stopName} at {formatMountainTime(arrivedAt)}.
      </p>
    )
  }

  const markArrived = async () => {
    if (saving) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiClient.post(
        `/api/driver-tracking/loads/${encodeURIComponent(String(load._id))}/arrive`,
        { stop },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const saved = res.data?.data?.arrivals?.[stop]?.at
      setSavedAt(typeof saved === "string" ? saved : new Date().toISOString())
      toast.success("Dispatch knows you've arrived", {
        description: "Your waiting time is now on record.",
      })
      await onArrived?.()
    } catch (err) {
      toast.error(userErrorMessage(err, "let Dispatch know you've arrived"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={markArrived}
        disabled={saving}
        className="h-11 w-full gap-2 rounded-xl font-bold"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <MapPinCheck className="size-4" />}
        {stop === "pickup" ? "I've Arrived at Pickup" : "I've Arrived at Delivery"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Tap this when you get there, so your waiting time is on record.
      </p>
    </div>
  )
}
