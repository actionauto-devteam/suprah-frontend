"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { getVehicleShipping } from "@/lib/api/vehicleShipping"
import {
  checkableVins,
  loadsWithVin,
  sameVinWarning,
  type VehicleShippingResult,
} from "@/lib/vehicle-shipping"

/**
 * The live loads that already have one of these VINs, looked up a moment
 * after the VINs stop changing. The load being edited is left out. A failed
 * lookup shows no warning; saving is never blocked.
 */
export function useSameVinLoads(vins: Array<string | undefined>, excludeLoadId?: string) {
  const checkable = checkableVins(vins)
  const key = checkable.join(",")
  const [result, setResult] = React.useState<VehicleShippingResult | null>(null)

  React.useEffect(() => {
    if (!key) {
      setResult(null)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      getVehicleShipping({ vins: key.split(","), excludeLoadId }, { signal: controller.signal })
        .then(setResult)
        .catch((err) => {
          if (controller.signal.aborted) return
          console.warn("Could not check for other loads with the same VIN", err)
          setResult(null)
        })
    }, 400)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [key, excludeLoadId])

  return checkable
    .map((vin) => ({ vin, loads: loadsWithVin(result, vin) }))
    .filter((entry) => entry.loads.length > 0)
}

/** Create Load's warning when a VIN is already on another live load. */
export function SameVehicleWarning({ matches }: { matches: ReturnType<typeof useSameVinLoads> }) {
  return (
    <div role="status" aria-live="polite">
      {matches.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 space-y-1 break-words">
            {matches.map(({ vin, loads }) => (
              <p key={vin}>{sameVinWarning(vin, loads)}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
