"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Truck, Megaphone, ArrowLeft, ArrowRight, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createLoad,
  assignDriverToLoad,
  calculateLoadRate,
  RateResult,
  updateLoad,
  uploadVehicleInspectionPhoto,
} from "@/lib/api/loads"
import { apiClient } from "@/lib/api-client"
import type { Load } from "@/types/load"
import {
  PostType,
  LocationBlock,
  LocationType,
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
import { DriverPickerSection, OrgDriver } from "./DriverPickerSection"
import { InspectionSection } from "./InspectionSection"
import { ReviewSection } from "./ReviewSection"
import { cn } from "@/lib/utils"
import type { DriverLoadCompatibility } from "@/types/driver-tracking"
import { extractCompatibilityFromError } from "@/lib/driver-load-compatibility"
import { DriverLoadCompatibilityReviewDialog } from "@/components/driver-tracker/DriverLoadCompatibilityReviewDialog"
import { scheduleDateKey } from "@/utils/calendar.utils"


// ─── Create / Edit Load: form orchestrator ───────────────────────────────────
// Owns all form state and the submit flow for BOTH workflows AND both modes:
//
//   mode="create", postType="load-board"     → create the load; Posted + public
//   mode="create", postType="assign-carrier" → create, then assign or publish
//                                               as an Available Load
//   mode="edit"                              → same steps, pre-filled from
//                                               initialLoad, PUT instead of
//                                               POST. Driver assignment is
//                                               read-only here — reassignment
//                                               has its own dedicated flow
//                                               (driver-tracker page) with
//                                               notification side effects
//                                               this form doesn't replicate.

interface LoadFormLayoutProps {
  postType: PostType
  mode?: "create" | "edit"
  initialLoad?: Load
}

type StepKey =
  | "route"
  | "vehicles"
  | "schedule"
  | "pricing"
  | "assignment"
  | "inspect"
  | "review"

// ── Edit mode: map the fetched Load back into wizard form state ──
// Inverse of the payload createLoad() builds in lib/api/loads.ts. Backend
// location docs use `address`/`name`; some older frontend typings reference
// `street`/`companyName` — read both defensively so a real API response
// (which only ever has address/name) always wins.
function toDateInputValue(iso?: string): string {
  return scheduleDateKey(iso)
}

function mapLocationFromLoad(loc: any): LocationBlock {
  if (!loc) return emptyLocation()
  return {
    name: loc.name ?? loc.companyName ?? "",
    address: loc.address ?? loc.street ?? "",
    city: loc.city ?? "",
    state: loc.state ?? "",
    zip: loc.zip ?? "",
    country: loc.country ?? "",
    phone: loc.phone ?? "",
    phoneExt: loc.phoneExt ?? "",
    email: loc.email ?? "",
    contactName: loc.contactName ?? "",
    locationType: (loc.locationType as LocationType) ?? "",
    notes: loc.notes ?? "",
  }
}

function mapVehiclesFromLoad(vehicles?: any[]): LoadVehicle[] {
  if (!vehicles || !vehicles.length) return [emptyVehicle()]
  return vehicles.map((v) => ({
    ...emptyVehicle(),
    vehicleId: v.vehicleId ?? undefined,
    vin: v.vin ?? "",
    year: v.year ?? "",
    make: v.make ?? "",
    model: v.model ?? "",
    color: v.color ?? "",
    condition: v.condition === "Inoperable" ? "Inoperable" : "Operable",
    inspectionPhotoUrl: v.inspectionPhotoUrl ?? undefined,
  }))
}

function mapDatesFromLoad(dates?: any): LoadDates {
  if (!dates) return emptyDates()
  return {
    firstAvailable: toDateInputValue(dates.firstAvailable),
    pickupDeadline: toDateInputValue(dates.pickupDeadline),
    deliveryDeadline: toDateInputValue(dates.deliveryDeadline),
    notes: dates.notes ?? "",
  }
}

function mapAdditionalInfoFromLoad(info?: any): LoadAdditionalInfo {
  const base = emptyAdditionalInfo()
  if (!info) return base
  return {
    visibility: info.visibility === "private" ? "private" : "public",
    notes: info.notes ?? "",
    instructions: info.instructions ?? "",
    referenceNumber: info.referenceNumber ?? "",
  }
}

function mapPricingFromLoad(pricing?: any): LoadPricingInput {
  if (!pricing) return {}
  return {
    pricePerMile: pricing.pricePerMile ?? undefined,
    carrierPayAmount: pricing.carrierPayAmount ?? undefined,
    copCodAmount: pricing.copCodAmount ?? undefined,
  }
}

function mapContractFromLoad(contract?: any): LoadContract {
  return {
    agreedToTerms: contract?.agreedToTerms ?? false,
    signatureDataUrl: contract?.signatureDataUrl ?? null,
    signerName: contract?.signerName ?? "",
  }
}

export function LoadFormLayout({
  postType,
  mode = "create",
  initialLoad,
}: LoadFormLayoutProps) {
  const router = useRouter()
  const isEdit = mode === "edit" && !!initialLoad

  // Silently attached as contract.signerName when the Review step's "I
  // agree" checkbox is checked — no visible signer-name field. (The
  // rewritten AuthProvider exposes getToken/isLoaded/isSignedIn — not a
  // user object — so we read /api/users/me directly.) Skipped in edit
  // mode — initialLoad.contract already carries whatever was recorded.
  const [signerName, setSignerName] = React.useState("")
  React.useEffect(() => {
    if (isEdit) return
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
  }, [isEdit])

  // ── Form state ──
  const [pickup, setPickup] = React.useState<LocationBlock>(() =>
    isEdit ? mapLocationFromLoad(initialLoad!.pickupLocation) : emptyLocation(),
  )
  const [delivery, setDelivery] = React.useState<LocationBlock>(() =>
    isEdit ? mapLocationFromLoad(initialLoad!.deliveryLocation) : emptyLocation(),
  )
  const [vehicles, setVehicles] = React.useState<LoadVehicle[]>(() =>
    isEdit ? mapVehiclesFromLoad(initialLoad!.vehicles) : [emptyVehicle()],
  )
  const [trailerType, setTrailerType] = React.useState<string>(
    () => (isEdit ? initialLoad!.trailerType : undefined) || "open_2car",
  )
  const [dates, setDates] = React.useState<LoadDates>(() =>
    isEdit ? mapDatesFromLoad(initialLoad!.dates) : emptyDates(),
  )
  const [additionalInfo, setAdditionalInfo] = React.useState<LoadAdditionalInfo>(
    () => (isEdit ? mapAdditionalInfoFromLoad(initialLoad!.additionalInfo) : emptyAdditionalInfo()),
  )
  const [pricing, setPricing] = React.useState<LoadPricingInput>(() =>
    isEdit ? mapPricingFromLoad(initialLoad!.pricing) : {},
  )
  const [contract, setContract] = React.useState<LoadContract>(() =>
    isEdit
      ? mapContractFromLoad(initialLoad!.contract)
      : { agreedToTerms: false, signatureDataUrl: null, signerName: "" },
  )

  // ── Inspect step: create mode holds Files client-side (no load._id yet) ──
  const [pendingPhotos, setPendingPhotos] = React.useState<Record<string, File>>({})

  const updateVehicleAt = (index: number, updated: LoadVehicle) => {
    setVehicles((prev) => {
      const next = [...prev]
      next[index] = updated
      return next
    })
  }

  // ── Assignment state (assign-carrier, create mode only) ──
  const [selectedDriverId, setSelectedDriverId] = React.useState<string | null>(
    null,
  )
  const [selectedDriverInfo, setSelectedDriverInfo] = React.useState<OrgDriver | null>(null)
  const [makeAvailable, setMakeAvailable] = React.useState(false)

  const currentAssigneeName = React.useMemo(() => {
    if (!isEdit) return null
    const assigned = initialLoad!.assignedDriverId
    if (assigned && typeof assigned === "object") return assigned.name || null
    return null
  }, [isEdit, initialLoad])

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Keep the wizard clean while the user is entering data. Inline field
  // errors become visible only after a submit attempt fails, then update
  // live as the user corrects the fields.
  const [showValidationErrors, setShowValidationErrors] =
    React.useState(false)

  const [createdAssignmentReview, setCreatedAssignmentReview] = React.useState<{
  loadId: string
  loadNumber: string
  driverId: string
  driverName: string
  compatibility: DriverLoadCompatibility
} | null>(null)

const [isApplyingCompatibilityOverride, setIsApplyingCompatibilityOverride] =
  React.useState(false)

  // ── Steps ──
  const steps: Array<{ key: StepKey; label: string }> = React.useMemo(() => {
    const base: Array<{ key: StepKey; label: string }> = [
      { key: "route", label: "Route" },
      { key: "vehicles", label: "Vehicles" },
      { key: "schedule", label: "Schedule" },
      { key: "pricing", label: "Pricing" },
    ]
    // Assigning a driver is a dedicated, side-effect-aware flow elsewhere
    // once a load exists — this step only applies to a brand-new load.
    if (postType === "assign-carrier" && !isEdit) {
      base.push({ key: "assignment", label: "Driver" })
    }
    base.push({ key: "inspect", label: "Post" })
    base.push({ key: "review", label: "Review" })
    return base
  }, [postType, isEdit])

  const [stepIndex, setStepIndex] = React.useState(0)
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  const validation = React.useMemo(
    () =>
      validateAll({
        postType,
        pickup,
        delivery,
        vehicles,
        trailerType,
        dates,
        contract,
        selectedDriverId,
        makeAvailable: postType === "assign-carrier" && !isEdit ? makeAvailable : false,
      }),
    [postType, pickup, delivery, vehicles, trailerType, dates, contract, selectedDriverId, makeAvailable, isEdit],
  )

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validation.valid) {
      setShowValidationErrors(true)
      const first = validation.issues[0]
      toast.error(first.message)
      const field = first.field
      const target: StepKey = field.startsWith("vehicles")
        ? "vehicles"
        : field.startsWith("dates")
          ? "schedule"
          : field.startsWith("contract")
            ? "review"
            : field === "driverId"
              ? "assignment"
              : "route"
      const idx = steps.findIndex((s) => s.key === target)
      if (idx >= 0) setStepIndex(idx)
      return
    }

    setShowValidationErrors(false)
    for (const warning of validation.warnings) toast.warning(warning)

    setIsSubmitting(true)
    try {
      if (isEdit) {
        await updateLoad(initialLoad!._id, {
          pickupLocation: pickup as any,
          deliveryLocation: delivery as any,
          vehicles: vehicles.map(({ id: _unused, ...v }) => ({
            ...v,
            year: v.year ? Number(v.year) : undefined,
            vin: v.vin || undefined,
          })) as any,
          trailerType,
          dates: dates as any,
          additionalInfo: additionalInfo as any,
          contract: contract as any,
          pricing: pricing as any,
        })
        toast.success(`Load ${initialLoad!.loadNumber} updated.`)
        router.push(`/transportation/load/${initialLoad!._id}`)
        return
      }

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

      // ── Inspect step: flush any photos picked before the load existed ──
      if (Object.keys(pendingPhotos).length > 0) {
        await Promise.all(
          vehicles.map(async (v, index) => {
            const file = pendingPhotos[v.id]
            if (!file) return
            try {
              await uploadVehicleInspectionPhoto(load._id, index, file)
            } catch {
              toast.error(`Load ${load.loadNumber} was created, but a vehicle photo failed to upload.`)
            }
          }),
        )
      }

      // ── Assignment branch ──
      if (postType === "assign-carrier" && !makeAvailable && selectedDriverId) {
        try {
          await assignDriverToLoad(load._id, selectedDriverId)
          toast.success(
            `Load ${load.loadNumber} created and assigned to the driver.`,
          )
        } catch (assignErr: any) {
            const compatibility = extractCompatibilityFromError(assignErr)

            if (compatibility) {
              setCreatedAssignmentReview({
                loadId: load._id,
                loadNumber: load.loadNumber,
                driverId: selectedDriverId,
                driverName: selectedDriverInfo?.name || "Selected Driver",
                compatibility,
              })

              toast.warning(
                `Load ${load.loadNumber} was created. Review driver compatibility to finish the assignment.`,
              )

              return
            }

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
          `Failed to ${isEdit ? "save" : "create"} load. Please try again.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmCreatedAssignmentOverride = async () => {
    if (!createdAssignmentReview || isApplyingCompatibilityOverride) return

    setIsApplyingCompatibilityOverride(true)

    try {
      await assignDriverToLoad(
        createdAssignmentReview.loadId,
        createdAssignmentReview.driverId,
        {
          overrideAvailability:
            createdAssignmentReview.compatibility.requiresAvailabilityOverride,

          overrideCapacity:
            createdAssignmentReview.compatibility.requiresCapacityOverride,
        },
      )

      toast.success(
        `Load ${createdAssignmentReview.loadNumber} created and assigned to ${createdAssignmentReview.driverName}.`,
      )

      setCreatedAssignmentReview(null)
      router.push("/transportation?tab=shipments")
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "The compatibility override could not be applied.",
      )
    } finally {
      setIsApplyingCompatibilityOverride(false)
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
            validationIssues={
              showValidationErrors
                ? validation.issues.filter(
                    (issue) =>
                      issue.field.startsWith("pickup.") ||
                      issue.field.startsWith("delivery."),
                  )
                : []
            }
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
            onSelectDriverInfo={setSelectedDriverInfo}
            makeAvailable={makeAvailable}
            onMakeAvailableChange={setMakeAvailable}
            loadPreview={{
              dates: {
                firstAvailable: dates.firstAvailable || null,
                pickupDeadline: dates.pickupDeadline || null,
              },
              vehicleCount: vehicles.length,
              trailerTypeRequired: trailerType,
              pickupLocation: {
                city: pickup.city || null,
                state: pickup.state || null,
                zip: pickup.zip || null,
              },
              deliveryLocation: {
                city: delivery.city || null,
                state: delivery.state || null,
                zip: delivery.zip || null,
              },
            }}
          />
        )}

        {step.key === "inspect" && (
          <InspectionSection
            vehicles={vehicles}
            mode={isEdit ? "edit" : "create"}
            loadId={isEdit ? initialLoad!._id : undefined}
            pendingPhotos={pendingPhotos}
            onPendingPhotosChange={setPendingPhotos}
            onVehicleUpdate={updateVehicleAt}
          />
        )}

        {step.key === "review" && (
          <ReviewSection
            mode={isEdit ? "edit" : "create"}
            postType={postType}
            pickup={pickup}
            delivery={delivery}
            vehicles={vehicles}
            trailerType={trailerType}
            dates={dates}
            additionalInfo={additionalInfo}
            pricing={pricing}
            contract={contract}
            onToggleAgree={() =>
              setContract((prev) => ({
                ...prev,
                agreedToTerms: !prev.agreedToTerms,
                signerName: !prev.agreedToTerms ? signerName || prev.signerName : prev.signerName,
              }))
            }
            selectedDriverName={selectedDriverInfo?.name ?? null}
            makeAvailable={makeAvailable}
            currentAssigneeName={currentAssigneeName}
            validation={validation}
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
            ) : isEdit ? (
              <Save className="size-4" />
            ) : postType === "assign-carrier" && makeAvailable ? (
              <Megaphone className="size-4" />
            ) : (
              <Truck className="size-4" />
            )}
            {isSubmitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save Changes"
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
        <DriverLoadCompatibilityReviewDialog
          open={createdAssignmentReview !== null}
          onOpenChange={(open) => {
            if (open || isApplyingCompatibilityOverride) return

            setCreatedAssignmentReview(null)

            // The load already exists as Posted.
            // Canceling does not create another load.
            router.push("/transportation?tab=shipments")
          }}
          compatibility={createdAssignmentReview?.compatibility ?? null}
          driverName={createdAssignmentReview?.driverName || "Selected Driver"}
          loadLabel={createdAssignmentReview?.loadNumber || "New Load"}
          actionLabel="Assign Anyway"
          isSubmitting={isApplyingCompatibilityOverride}
          onConfirm={confirmCreatedAssignmentOverride}
        />
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