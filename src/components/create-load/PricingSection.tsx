"use client"

import * as React from "react"
import { Route, Loader2, AlertCircle, Zap, Clock, TrendingUp } from "lucide-react"
import { LoadVehicle } from "./types"
import { calculateLoadRate } from "@/lib/api/loads"

interface PricingSectionProps {
  pickupZip: string
  deliveryZip: string
  vehicles: LoadVehicle[]
  trailerType: string
}

export function PricingSection({ pickupZip, deliveryZip, vehicles, trailerType }: PricingSectionProps) {
  const [result, setResult] = React.useState<{
    miles: number
    estimatedRate: number
    eta: { min: number; max: number }
  } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const vehicleKey = vehicles.map((v) => `${trailerType}:${v.condition}`).join(",")

  React.useEffect(() => {
    if (pickupZip.length < 5 || deliveryZip.length < 5) {
      setResult(null)
      setError(null)
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      setLoading(true)
      setError(null)
      calculateLoadRate(
        pickupZip,
        deliveryZip,
        trailerType,
        vehicles.map((v) => ({ condition: v.condition }))
      )
        .then((data) => { if (!cancelled) { setResult(data); setLoading(false) } })
        .catch(() => { if (!cancelled) { setError("We couldn't calculate a rate for these ZIP codes. Check the pickup and delivery ZIP codes and try again."); setLoading(false) } })
    }, 600)
    return () => { cancelled = true; clearTimeout(timeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupZip, deliveryZip, vehicleKey, trailerType])

  return (
    <div className="space-y-4">
      {pickupZip.length < 5 || deliveryZip.length < 5 ? (
        <div className="flex flex-col items-center justify-center py-5 gap-2 text-center">
          <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
            <Route className="size-4 text-muted-foreground/60" />
          </div>
          <p className="text-xs text-muted-foreground">Enter pickup and delivery ZIP codes to see the estimated rate</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-5 gap-2 text-center">
          <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground">Calculating rate…</p>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-500/8 border border-green-500/20 p-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Rate</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${result.estimatedRate.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Auto-calculated based on distance and vehicle details</p>
            </div>
            <div className="size-11 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5 text-green-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="size-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Route className="size-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold font-mono">{Math.round(result.miles).toLocaleString()} mi</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="size-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="size-3.5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Est. Transit</p>
                <p className="text-sm font-semibold">{result.eta.min}–{result.eta.max} days</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Zap className="size-3 text-green-500 shrink-0" />
            Rate via SupraPay — $1.50/mi base, min $300.
          </div>
        </div>
      ) : null}
    </div>
  )
}
