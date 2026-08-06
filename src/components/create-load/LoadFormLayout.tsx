"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Truck, Megaphone, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createLoad, assignDriverToLoad, calculateLoadRate, RateResult } from "@/lib/api/loads"
import { apiClient } from "@/lib/api-client"
import {
  PostType,
  LocationBlock,
  LoadVehicle,
  LoadDates,
  LoadAdditionalInfo,
  LoadContract,
  LoadPricingInput,
  TRAILER_TYPE_OPTIONS,
  emptyLocation,
  emptyVehicle,
  emptyAdditionalInfo,
  emptyDates,
} from "./types"
import { validateAll, validateAssignment } from "./validation"
import { LocationSection } from "./LocationSection"
import { VehicleSection } from "./VehicleSection"
import { DatesSection } from "./DatesSection"
import { AdditionalInfoSection } from "./AdditionalInfoSection"
import { ContractSection } from "./ContractSection"
import { DriverPickerSection } from "./DriverPickerSection"
import { cn } from "@/lib/utils"

// ─── Create Load: form orchestrator ──────────────────────────────────────────
// Owns all form state and the submit flow for BOTH workflows:
//
//   load-board     → create the load; it's Posted and publicly visible
//   assign-carrier → create the load, then either
//        · assign the selected driver (status → Assigned), or
//        · "Make it Available Load": skip assignment entirely — the load
//          stays Posted + unassigned, which IS the Available Loads pool.
//          Drivers request it from their account; the dispatcher approves
//          from the Transportation page, and the load moves into the
//          driver's active loads with every module synced via load:change.

interface LoadFormLayoutProps {
  postType: PostType
}

type StepKey =
  | "route"
  | "vehicles"
  | "schedule"
  | "pricing"
  | "assignment"
  | "contract"

export function LoadFormLayout({ postType }: LoadFormLayoutProps) {
  const router = useRouter()

  // Signer-name default from the centralized user record. (The rewritten
  // AuthProvider exposes getToken/isLoaded/isSignedIn — not a user object —
  // so we read /api/users/me directly.)
  const [signerName, setSignerName] = React.useState("")
  React.useEffect(() => {
    let cancelled = false
    apiClient
      .get("/api/users/me")
      .then((res: { data: any }) => {
        const u = res.data?.data ?? res.data
        if (!cancelled && u?.name) setSignerName(u.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // ── Form state ──
  const [pickup, setPickup] = React.useState<LocationBlock>(emptyLocation)
  const [delivery, setDelivery] = React.useState<LocationBlock>(emptyLocation)
  const [vehicles, setVehicles] = React.useState<LoadVehicle[]>([
    emptyVehicle(),
  ])
  const [trailerType, setTrailerType] = React.useState<string>("open_2car")
  const [dates, setDates] = React.useState<LoadDates>(emptyDates)
  const [additionalInfo, setAdditionalInfo] =
    React.useState<LoadAdditionalInfo>(emptyAdditionalInfo)
  const [pricing, setPricing] = React.useState<LoadPricingInput>({})
  const [contract, setContract] = React.useState<LoadContract>({
    agreedToTerms: false,
    signatureDataUrl: null,
    signerName: "",
  })

  // ── Assignment state (assign-carrier only) ──
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(
    null,
  )
  const [makeAvailable, setMakeAvailable] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ── Steps ──
  const steps: Array<{ key: StepKey; label: string }> = React.useMemo(() => {
    const base: Array<{ key: StepKey; label: string }> = [
      { key: "route", label: "Route" },
      { key: "vehicles", label: "Vehicles" },
      { key: "schedule", label: "Schedule" },
      { key: "pricing", label: "Pricing" },
    ]
    if (postType === "assign-carrier") {
      base.push({ key: "assignment", label: "Driver" })
    }
    base.push({ key: "contract", label: "Sign & Post" })
    return base
  }, [postType])

  const [stepIndex, setStepIndex] = React.useState(0)
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  // ── Submit ──
  const handleSubmit = async () => {
    const result = validateAll({
      postType,
      pickup,
      delivery,
      vehicles,
      trailerType,
      dates,
      contract,
      selectedDriverId,
      makeAvailable: postType === "assign-carrier" ? makeAvailable : false,
    })

    if (!result.valid) {
      // Surface the first issue and jump to the relevant step
      const first = result.issues[0]
      toast.error(first.message)
      const field = first.field
      const target: StepKey = field.startsWith("vehicles")
        ? "vehicles"
        : field.startsWith("dates")
          ? "schedule"
          : field.startsWith("contract")
            ? "contract"
            : field === "driverId"
              ? "assignment"
              : "route"
      const idx = steps.findIndex((s) => s.key === target)
      if (idx >= 0) setStepIndex(idx)
      return
    }

    // Advisory warnings (e.g. trailer capacity) — inform, don't block
    for (const warning of result.warnings) toast.warning(warning)

    setIsSubmitting(true)
    try {
      const { load, warning } = await createLoad({
        postType,
        pickup,
        delivery,
        vehicles,
        dates,
        additionalInfo,
        contract,
        trailerType,
        pricing,
      })

      if (warning) toast.warning(warning)

      // ── Assignment branch ──
      if (postType === "assign-carrier" && !makeAvailable && selectedDriverId) {
        try {
          await assignDriverToLoad(load._id, selectedDriverId)
          toast.success(
            `Load ${load.loadNumber} created and assigned to the driver.`,
          )
        } catch (assignErr: any) {
          // The load EXISTS — don't pretend the whole thing failed. Tell the
          // dispatcher exactly what state they're in and where to fix it.
          toast.error(
            `Load ${load.loadNumber} was created, but assigning the driver failed: ` +
              (assignErr?.response?.data?.message ||
                assignErr?.message ||
                "unknown error") +
              ". Assign them from the Transportation page.",
          )
        }
      } else if (postType === "assign-carrier" && makeAvailable) {
        toast.success(
          `Load ${load.loadNumber} published to Available Loads. Drivers can now request it.`,
        )
      } else {
        toast.success(`Load ${load.loadNumber} posted to the load board.`)
      }

      router.push("/transportation?tab=shipments")
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create load. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const goNext = () => {
    // Gate the assignment step locally so users get feedback in place
    if (step.key === "assignment") {
      const check = validateAssignment(postType, selectedDriverId, makeAvailable)
      if (!check.valid) {
        toast.error(check.issues[0].message)
        return
      }
    }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Step rail ── */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => i < stepIndex && setStepIndex(i)}
            className={cn(
              "flex-1 flex flex-col gap-1.5 group",
              i > stepIndex && "cursor-default",
            )}
          >
            <span
              className={cn(
                "h-1 rounded-full transition-colors",
                i < stepIndex
                  ? "bg-emerald-500"
                  : i === stepIndex
                    ? "bg-linear-to-r from-emerald-500 to-cyan-500"
                    : "bg-muted",
              )}
            />
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-widest text-center",
                i === stepIndex
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground/60",
              )}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Active step ── */}
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5 sm:p-6 relative overflow-hidden">
        <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />

        {step.key === "route" && (
          <LocationSection
            pickup={pickup}
            delivery={delivery}
            onPickupChange={setPickup}
            onDeliveryChange={setDelivery}
          />
        )}

        {step.key === "vehicles" && (
          <div className="space-y-4">
            {/* Trailer selection lives in the layout; the team's
                VehicleSection reads it for its capacity gate */}
            <label className="block min-w-0">
              <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
                Trailer Type
              </span>
              <select
                className="w-full h-9 rounded-lg border border-border/60 bg-background/40 px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                value={trailerType}
                onChange={(e) => setTrailerType(e.target.value)}
              >
                {TRAILER_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                    {t.capacity > 0 ? ` (rated ${t.capacity})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <VehicleSection
              vehicles={vehicles}
              onChange={setVehicles}
              trailerType={trailerType}
            />
          </div>
        )}

        {step.key === "schedule" && (
          <div className="space-y-5">
            <DatesSection value={dates} onChange={setDates} />
            <AdditionalInfoSection
              value={additionalInfo}
              onChange={setAdditionalInfo}
            />
          </div>
        )}

        {step.key === "pricing" && (
          <PricingPanel
            pickupZip={pickup.zip}
            deliveryZip={delivery.zip}
            vehicles={vehicles}
            trailerType={trailerType}
            pricing={pricing}
            onChange={setPricing}
          />
        )}

        {step.key === "assignment" && (
          <DriverPickerSection
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
            makeAvailable={makeAvailable}
            onMakeAvailableChange={setMakeAvailable}
          />
        )}

        {step.key === "contract" && (
          <ContractSection
            contract={contract}
            onChange={setContract}
            defaultSignerName={signerName}
          />
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-1.5 text-[10px] font-black uppercase tracking-widest"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0 || isSubmitting}
        >
          <ArrowLeft className="size-3.5" /> Back
        </Button>

        {isLastStep ? (
          <Button
            type="button"
            className="h-10 gap-2 px-5 text-[10px] font-black uppercase tracking-widest bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : postType === "assign-carrier" && makeAvailable ? (
              <Megaphone className="size-4" />
            ) : (
              <Truck className="size-4" />
            )}
            {isSubmitting
              ? "Creating…"
              : postType === "assign-carrier" && makeAvailable
                ? "Publish as Available Load"
                : postType === "assign-carrier"
                  ? "Create & Assign"
                  : "Post to Load Board"}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-10 gap-1.5 px-5 text-[10px] font-black uppercase tracking-widest"
            onClick={goNext}
            disabled={isSubmitting}
          >
            Next <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Inline pricing panel ────────────────────────────────────────────────────
// Self-contained so the layout has no dependency on PricingSection's prop
// shape. Live estimate via the existing calculate-rate endpoint.
//
// Price / Mile is a first-class, EDITABLE input, kept in two-way sync with
// Carrier Pay through the estimate's mileage — and it is now PERSISTED:
// the parsed $/mi value is written to pricing.pricePerMile, which flows
// through createLoad → backend zod → Load.pricing.pricePerMile. Cards and
// detail views can then show "$X.XX/mi" without re-deriving it.
//
//   · Calculate Rate  → seeds $/mi from estimatedRate ÷ miles
//   · Edit $/mi       → Carrier Pay auto-recalculates ($/mi × miles)
//   · Edit Carrier Pay → $/mi re-derives (pay ÷ miles) so they never disagree
//   · Recalculate     → if the dispatcher has set their own $/mi, that rate
//                       is kept and re-applied against the NEW mileage;
//                       otherwise the fresh estimate reseeds both fields.
//
// The $/mi input stays disabled until an estimate exists — without a mileage
// there is nothing to multiply against. Local `ppmText` string state exists
// only so partial input ("2.", "2.0") isn't clobbered mid-keystroke; the
// canonical value lives in pricing.pricePerMile.

interface PricingPanelProps {
  pickupZip: string
  deliveryZip: string
  vehicles: LoadVehicle[]
  trailerType: string
  pricing: LoadPricingInput
  onChange: (p: LoadPricingInput) => void
}

const round2 = (n: number) => Math.round(n * 100) / 100

function PricingPanel({
  pickupZip,
  deliveryZip,
  vehicles,
  trailerType,
  pricing,
  onChange,
}: PricingPanelProps) {
  const [estimate, setEstimate] = React.useState<RateResult | null>(null)
  const [isCalculating, setIsCalculating] = React.useState(false)

  // Display buffer for the $/mi input; canonical value = pricing.pricePerMile
  const [ppmText, setPpmText] = React.useState<string>(
    pricing.pricePerMile != null ? String(pricing.pricePerMile) : "",
  )
  // Tracks whether the CURRENT $/mi came from the dispatcher (typed) or was
  // derived from an estimate — decides whose number survives a Recalculate.
  const userSetPpmRef = React.useRef(false)

  const miles = estimate?.miles ?? 0
  const zipsReady = /^\d{5}/.test(pickupZip ?? "") && /^\d{5}/.test(deliveryZip ?? "")

  const runEstimate = async () => {
    if (!zipsReady) {
      toast.error("Enter valid pickup and delivery ZIP codes first (Route step).")
      return
    }
    setIsCalculating(true)
    try {
      const result = await calculateLoadRate(
        pickupZip,
        deliveryZip,
        trailerType,
        vehicles.map((v) => ({ condition: v.condition })),
      )
      setEstimate(result)

      const userPpm = Number(ppmText)
      if (userSetPpmRef.current && Number.isFinite(userPpm) && userPpm > 0) {
        // Dispatcher owns the rate — apply it to the fresh mileage
        onChange({
          ...pricing,
          pricePerMile: userPpm,
          carrierPayAmount: Math.round(userPpm * result.miles),
        })
      } else {
        // Seed $/mi from the estimate; prefill pay only if untouched
        const derived =
          result.miles > 0 ? round2(result.estimatedRate / result.miles) : 0
        setPpmText(derived > 0 ? String(derived) : "")
        userSetPpmRef.current = false
        onChange({
          ...pricing,
          pricePerMile: derived > 0 ? derived : undefined,
          carrierPayAmount:
            pricing.carrierPayAmount == null
              ? result.estimatedRate
              : pricing.carrierPayAmount,
        })
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Rate calculation failed.",
      )
    } finally {
      setIsCalculating(false)
    }
  }

  // Edit $/mi → auto-recalculate Carrier Pay from it; persist the rate
  const handlePpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setPpmText(raw)
    userSetPpmRef.current = true
    if (raw === "") {
      onChange({ ...pricing, pricePerMile: undefined, carrierPayAmount: undefined })
      return
    }
    const ppm = Math.max(0, Number(raw) || 0)
    onChange({
      ...pricing,
      pricePerMile: ppm,
      ...(miles > 0 ? { carrierPayAmount: Math.round(ppm * miles) } : {}),
    })
  }

  // Edit Carrier Pay directly → re-derive $/mi so the two stay in sync
  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const pay = raw === "" ? undefined : Math.max(0, Number(raw) || 0)
    if (miles > 0) {
      const derived = pay != null && pay > 0 ? round2(pay / miles) : undefined
      setPpmText(derived != null ? String(derived) : "")
      userSetPpmRef.current = true
      onChange({ ...pricing, carrierPayAmount: pay, pricePerMile: derived })
    } else {
      onChange({ ...pricing, carrierPayAmount: pay })
    }
  }

  const handleCodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange({
      ...pricing,
      copCodAmount: raw === "" ? undefined : Math.max(0, Number(raw) || 0),
    })
  }

  const balance =
    (pricing.carrierPayAmount ?? 0) - (pricing.copCodAmount ?? 0)

  const inputClass =
    "w-full h-9 rounded-lg border border-border/60 bg-background/40 px-2.5 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <div className="space-y-4">
      {/* Estimate */}
      <div className="rounded-xl border border-border/60 bg-background/40 p-4 relative overflow-hidden">
        <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Rate Estimate
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest"
            onClick={runEstimate}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {estimate ? "Recalculate" : "Calculate Rate"}
          </Button>
        </div>
        {estimate ? (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">
                Distance
              </span>
              <span className="font-mono font-black tabular-nums">
                {Math.round(estimate.miles)} MI
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">
                Est. Rate
              </span>
              <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                ${estimate.estimatedRate.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-0.5">
                ETA
              </span>
              <span className="font-mono font-black tabular-nums">
                {estimate.eta.min}–{estimate.eta.max} days
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-2">
            Uses the pickup/delivery ZIPs, vehicle count and condition, and
            trailer type from the earlier steps. Calculating unlocks the
            Price / Mile field below.
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block min-w-0">
          <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
            Price / Mile (USD)
          </span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step="0.01"
            value={ppmText}
            onChange={handlePpmChange}
            placeholder={
              estimate && estimate.miles > 0
                ? String(round2(estimate.estimatedRate / estimate.miles))
                : "—"
            }
            inputMode="decimal"
            disabled={!estimate || miles <= 0}
            title={
              !estimate
                ? "Calculate the rate first to get the mileage"
                : undefined
            }
          />
        </label>
        <label className="block min-w-0">
          <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
            Carrier Pay (USD)
          </span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step="1"
            value={pricing.carrierPayAmount ?? ""}
            onChange={handlePayChange}
            placeholder={estimate ? String(estimate.estimatedRate) : "0"}
            inputMode="decimal"
          />
        </label>
        <label className="block min-w-0">
          <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
            COP / COD (USD)
          </span>
          <input
            className={inputClass}
            type="number"
            min={0}
            step="1"
            value={pricing.copCodAmount ?? ""}
            onChange={handleCodChange}
            placeholder="0"
            inputMode="decimal"
          />
        </label>
        <div className="min-w-0">
          <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
            Balance (Pay − COD)
          </span>
          <div className="h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 flex items-center">
            <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              ${balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Sync hint — only once both sides are live */}
      {estimate && miles > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Price / Mile and Carrier Pay stay in sync over{" "}
          <span className="font-mono tabular-nums">{Math.round(miles)} mi</span>{" "}
          — edit either one and the other updates. The $/mi rate is saved with
          the load.
        </p>
      )}
    </div>
  )
}