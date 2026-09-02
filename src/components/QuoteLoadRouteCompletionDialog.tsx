"use client"

import * as React from "react"
import { MapPin, Loader2, Truck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { STATE_ZIP_MAP, US_STATES } from "@/components/create-load/types"
import { getQuoteLoadRouteDraft } from "@/types/transportation"
import type {
  Quote,
  QuoteLoadLocationInput,
  QuoteLoadRouteDetails,
} from "@/types/transportation"

const ZIP_RE = /^\d{5}(-\d{4})?$/

interface QuoteLoadRouteCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote
  isSubmitting?: boolean
  onConfirm: (routeDetails: QuoteLoadRouteDetails) => Promise<void>
}

type RouteErrors = Record<string, string>

function cloneRouteDetails(details: QuoteLoadRouteDetails): QuoteLoadRouteDetails {
  return {
    pickupLocation: { ...details.pickupLocation },
    deliveryLocation: { ...details.deliveryLocation },
  }
}

function validateLocation(
  prefix: "pickupLocation" | "deliveryLocation",
  label: "Origin" | "Destination",
  location: QuoteLoadLocationInput,
  errors: RouteErrors,
) {
  if (!location.address.trim()) {
    errors[`${prefix}.address`] = `${label} address is required`
  }
  if (!location.city.trim()) {
    errors[`${prefix}.city`] = `${label} city is required`
  }
  if (!location.state.trim()) {
    errors[`${prefix}.state`] = `${label} state is required`
  }
  if (!ZIP_RE.test(location.zip.trim())) {
    errors[`${prefix}.zip`] = `${label} ZIP code must be 5 digits`
  }
}

function LocationEditor({
  title,
  prefix,
  value,
  onChange,
  errors,
}: {
  title: string
  prefix: "pickupLocation" | "deliveryLocation"
  value: QuoteLoadLocationInput
  onChange: (next: QuoteLoadLocationInput) => void
  errors: RouteErrors
}) {
  const errorFor = (field: keyof QuoteLoadLocationInput) =>
    errors[`${prefix}.${String(field)}`]

  const inputClass = (field: keyof QuoteLoadLocationInput) =>
    cn(
      "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
      errorFor(field) &&
        "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30",
    )

  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-emerald-500" />
        <h3 className="text-xs font-black uppercase tracking-widest">
          {title}
        </h3>
      </div>

      <label className="block">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Street Address <span className="text-destructive">*</span>
        </span>
        <input
          value={value.address}
          onChange={(event) =>
            onChange({ ...value, address: event.target.value })
          }
          className={inputClass("address")}
          aria-invalid={Boolean(errorFor("address"))}
          placeholder="Exact pickup/delivery street address"
        />
        {errorFor("address") && (
          <span className="mt-1 block text-[11px] font-semibold text-destructive">
            {errorFor("address")}
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_130px] gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            City <span className="text-destructive">*</span>
          </span>
          <input
            value={value.city}
            onChange={(event) =>
              onChange({ ...value, city: event.target.value })
            }
            className={inputClass("city")}
            aria-invalid={Boolean(errorFor("city"))}
            placeholder="City"
          />
          {errorFor("city") && (
            <span className="mt-1 block text-[11px] font-semibold text-destructive">
              {errorFor("city")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            State <span className="text-destructive">*</span>
          </span>
          <select
            value={value.state}
            onChange={(event) => {
              const nextState = event.target.value
              const nextZip = nextState ? STATE_ZIP_MAP[nextState] ?? "" : ""

              onChange({
                ...value,
                state: nextState,
                zip: nextZip,
              })
            }}
            className={cn(inputClass("state"), "cursor-pointer")}
            aria-invalid={Boolean(errorFor("state"))}
          >
            <option value="">Select…</option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {errorFor("state") && (
            <span className="mt-1 block text-[11px] font-semibold text-destructive">
              {errorFor("state")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            ZIP <span className="text-destructive">*</span>
          </span>
          <input
            value={value.zip}
            onChange={(event) =>
              onChange({ ...value, zip: event.target.value })
            }
            className={inputClass("zip")}
            aria-invalid={Boolean(errorFor("zip"))}
            placeholder={
              value.state ? STATE_ZIP_MAP[value.state] ?? "84101" : "84101"
            }
            inputMode="numeric"
            maxLength={10}
          />
          {errorFor("zip") && (
            <span className="mt-1 block text-[11px] font-semibold text-destructive">
              {errorFor("zip")}
            </span>
          )}
        </label>
      </div>
    </section>
  )
}

export function QuoteLoadRouteCompletionDialog({
  open,
  onOpenChange,
  quote,
  isSubmitting = false,
  onConfirm,
}: QuoteLoadRouteCompletionDialogProps) {
  const draft = React.useMemo(
    () =>
      getQuoteLoadRouteDraft({
        fromAddress: quote.fromAddress,
        fromZip: quote.fromZip,
        toAddress: quote.toAddress,
        toZip: quote.toZip,
        fromLocation: quote.fromLocation,
        toLocation: quote.toLocation,
      }),
    [
      quote.fromAddress,
      quote.fromZip,
      quote.toAddress,
      quote.toZip,
      quote.fromLocation,
      quote.toLocation,
    ],
  )

  const [routeDetails, setRouteDetails] =
    React.useState<QuoteLoadRouteDetails>(() =>
      cloneRouteDetails(draft.routeDetails),
    )
  const [errors, setErrors] = React.useState<RouteErrors>({})

  React.useEffect(() => {
    if (!open) return

    setRouteDetails(cloneRouteDetails(draft.routeDetails))

    const initialErrors: RouteErrors = {}
    for (const field of draft.missingFields) {
      const label = field.startsWith("pickupLocation")
        ? "Origin"
        : "Destination"

      if (field.endsWith(".address")) {
        initialErrors[field] = `${label} address is required`
      } else if (field.endsWith(".city")) {
        initialErrors[field] = `${label} city is required`
      } else if (field.endsWith(".state")) {
        initialErrors[field] = `${label} state is required`
      } else if (field.endsWith(".zip")) {
        initialErrors[field] = `${label} ZIP code must be 5 digits`
      }
    }
    setErrors(initialErrors)
  }, [open, draft])

  const handleSubmit = async () => {
    const nextErrors: RouteErrors = {}

    validateLocation(
      "pickupLocation",
      "Origin",
      routeDetails.pickupLocation,
      nextErrors,
    )
    validateLocation(
      "deliveryLocation",
      "Destination",
      routeDetails.deliveryLocation,
      nextErrors,
    )

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await onConfirm({
        pickupLocation: {
          ...routeDetails.pickupLocation,
          address: routeDetails.pickupLocation.address.trim(),
          city: routeDetails.pickupLocation.city.trim(),
          state: routeDetails.pickupLocation.state.trim().toUpperCase(),
          zip: routeDetails.pickupLocation.zip.trim(),
          country: routeDetails.pickupLocation.country || "US",
        },
        deliveryLocation: {
          ...routeDetails.deliveryLocation,
          address: routeDetails.deliveryLocation.address.trim(),
          city: routeDetails.deliveryLocation.city.trim(),
          state: routeDetails.deliveryLocation.state.trim().toUpperCase(),
          zip: routeDetails.deliveryLocation.zip.trim(),
          country: routeDetails.deliveryLocation.country || "US",
        },
      })
    } catch {
      // The parent conversion flow already displays the server/client error.
      // Keep this dialog open so the dispatcher can correct details and retry.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isSubmitting) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Route Details</DialogTitle>
          <DialogDescription>
            We filled in everything available from the quote. Complete only the
            highlighted Load details, then continue with conversion.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          This does not change the quote&apos;s flexibility. These structured
          details are collected only because the created Load needs them for
          dispatch, driver routing, editing, and reporting.
        </div>

        <div className="space-y-4">
          <LocationEditor
            title="Origin — Pickup"
            prefix="pickupLocation"
            value={routeDetails.pickupLocation}
            onChange={(pickupLocation) => {
              setRouteDetails((previous) => ({
                ...previous,
                pickupLocation,
              }))
              setErrors((previous) => {
                const next = { ...previous }
                delete next["pickupLocation.address"]
                delete next["pickupLocation.city"]
                delete next["pickupLocation.state"]
                delete next["pickupLocation.zip"]
                return next
              })
            }}
            errors={errors}
          />

          <LocationEditor
            title="Destination — Delivery"
            prefix="deliveryLocation"
            value={routeDetails.deliveryLocation}
            onChange={(deliveryLocation) => {
              setRouteDetails((previous) => ({
                ...previous,
                deliveryLocation,
              }))
              setErrors((previous) => {
                const next = { ...previous }
                delete next["deliveryLocation.address"]
                delete next["deliveryLocation.city"]
                delete next["deliveryLocation.state"]
                delete next["deliveryLocation.zip"]
                return next
              })
            }}
            errors={errors}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Truck className="size-4" />
            )}
            {isSubmitting ? "Converting…" : "Complete & Convert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}