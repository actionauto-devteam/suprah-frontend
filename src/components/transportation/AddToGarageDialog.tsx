"use client"

import * as React from "react"
import { AlertTriangle, CarFront, Loader2 } from "lucide-react"
import { toast } from "@/lib/readable-toast"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
import { useAuth } from "@/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Staff put a delivered customer request's car in the customer's My Garage.
 * The car is also marked Sold in Inventory and the customer is told. The
 * server checks every rule again. Styled like the Cancel Load window.
 */
export function AddToGarageDialog({
  open,
  onOpenChange,
  loadId,
  customerName,
  vehicleLabel,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loadId: string
  customerName: string
  vehicleLabel?: string
  onAdded: () => void
}) {
  const { getToken } = useAuth()
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const car = vehicleLabel || "car"

  const close = (next: boolean) => {
    if (saving) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await apiClient.post(
        `/api/loads/${encodeURIComponent(loadId)}/add-to-garage`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      toast.success(String(res.data?.message || `Added the ${car} to ${customerName}'s My Garage.`))
      onOpenChange(false)
      onAdded()
    } catch (caught) {
      setError(userErrorMessage(caught, "add this car to the customer's garage"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
            <CarFront className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Add to Customer&apos;s Garage?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            The {car} goes into {customerName}&apos;s My Garage in their Suprah AI customer account.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6">
          <ul className="space-y-1.5 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-relaxed">
            <li>The car is marked <span className="font-semibold">Sold</span> in Inventory, so it isn&apos;t offered for sale again.</li>
            <li>{customerName} is told the car was added to My Garage.</li>
            <li>It shows in the CRM&apos;s Garage Review history like any other transfer.</li>
          </ul>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => close(false)} disabled={saving}>
            Not Now
          </Button>
          <Button
            type="button"
            className="min-h-11 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void submit()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> Adding…
              </>
            ) : (
              "Add to Garage"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
