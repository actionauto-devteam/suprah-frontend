"use client"

import * as React from "react"
import { AlertTriangle, Loader2, Tag } from "lucide-react"
import { toast } from "@/lib/readable-toast"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
import {
  CHANGEABLE_VEHICLE_STATUSES,
  VEHICLE_STATUS_CHOICES,
  vehicleStatusChangedMessage,
  type ChangeableVehicleStatus,
} from "@/lib/vehicle-status"
import { useAuth } from "@/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { Vehicle } from "@/types/inventory"

const isChangeable = (status: unknown): status is ChangeableVehicleStatus =>
  (CHANGEABLE_VEHICLE_STATUSES as readonly string[]).includes(String(status))

/**
 * Inventory's "Change status" for one car (staff only; see vehicle-status).
 * A car on a load that's on its way can't be changed here: delivery sets it.
 */
export function VehicleStatusControl({
  vehicle,
  onTheWay = false,
  onChanged,
  className,
}: {
  vehicle: Vehicle
  onTheWay?: boolean
  onChanged: (status: ChangeableVehicleStatus) => void
  className?: string
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [choice, setChoice] = React.useState<ChangeableVehicleStatus | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const current = String(vehicle.status ?? "").trim()
  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
  const groupName = `vehicle-status-${vehicle.id}`

  const save = async () => {
    if (!choice || choice === current) return
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      await apiClient.patch(
        `/api/vehicles/${encodeURIComponent(vehicle.id)}/status`,
        { status: choice },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {},
      )
      setOpen(false)
      toast.success(vehicleStatusChangedMessage(label, choice))
      onChanged(choice)
    } catch (err) {
      setError(userErrorMessage(err, "change this car's status"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        setOpen(next)
        if (next) {
          setError(null)
          setChoice(isChangeable(current) ? current : null)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className={cn("gap-1.5 border-border/60", className)}>
          <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-500 lg:h-4 lg:w-4" aria-hidden="true" />
          Change status
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change status</AlertDialogTitle>
          <AlertDialogDescription>
            {label || "This car"} is {current ? <span className="font-semibold text-foreground">{current}</span> : "without a status"}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {onTheWay ? (
          <p className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-foreground/90">
            This car is on a load that&apos;s on its way. Its status changes by itself at delivery, so it can&apos;t be changed
            here until then.
          </p>
        ) : (
          <fieldset className="min-w-0 space-y-2">
            <legend className="sr-only">New status</legend>
            {CHANGEABLE_VEHICLE_STATUSES.map((status) => (
              <label
                key={status}
                className={cn(
                  "flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                  choice === status ? "border-emerald-500/70 bg-emerald-500/10" : "border-border/60 hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={status}
                  checked={choice === status}
                  onChange={() => setChoice(status)}
                  disabled={busy}
                  className="mt-1 size-4 shrink-0 accent-emerald-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {status}
                    {status === current ? <span className="font-normal text-muted-foreground"> (now)</span> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{VEHICLE_STATUS_CHOICES[status]}</span>
                </span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Saved as a manual change for this car.
            </p>
          </fieldset>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{onTheWay ? "Close" : "Cancel"}</AlertDialogCancel>
          {!onTheWay && (
            <Button type="button" onClick={() => void save()} disabled={busy || !choice || choice === current} className="gap-1.5">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Save status
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
