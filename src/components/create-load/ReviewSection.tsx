"use client"

import * as React from "react"
import {
  CheckCircle2, XCircle, MapPin, Car, Calendar, DollarSign,
  UserCheck, ScrollText, Megaphone, ClipboardCheck, StickyNote, Globe, Lock, Check,
} from "lucide-react"
import {
  PostType, LocationBlock, LoadVehicle, LoadDates, LoadAdditionalInfo,
  LoadContract, LoadPricingInput, TRAILER_TYPE_OPTIONS,
} from "./types"
import type { StepValidation } from "./validation"
import { cn } from "@/lib/utils"

// ─── Review step ──────────────────────────────────────────────────────────────
// Read-only summary of everything entered, plus a live readiness checklist
// driven by the same validateAll() the submit handler already gates on —
// this just surfaces it before the click instead of only via a toast after.

interface ReviewSectionProps {
  mode: "create" | "edit"
  postType: PostType
  pickup: LocationBlock
  delivery: LocationBlock
  vehicles: LoadVehicle[]
  trailerType: string
  dates: LoadDates
  additionalInfo: LoadAdditionalInfo
  pricing: LoadPricingInput
  contract: LoadContract
  onToggleAgree: () => void
  selectedDriverName: string | null
  makeAvailable: boolean
  /** Edit mode only — the load's current assignee, shown read-only */
  currentAssigneeName?: string | null
  validation: StepValidation
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
        <Icon className="size-3" /> {title}
      </p>
      {children}
    </div>
  )
}

export function ReviewSection({
  mode,
  postType,
  pickup,
  delivery,
  vehicles,
  trailerType,
  dates,
  additionalInfo,
  pricing,
  contract,
  onToggleAgree,
  selectedDriverName,
  makeAvailable,
  currentAssigneeName,
  validation,
}: ReviewSectionProps) {
  const trailerLabel =
    TRAILER_TYPE_OPTIONS.find((t) => t.value === trailerType)?.label ?? trailerType

  const photosCount = vehicles.filter((v) => v.inspectionPhotoUrl).length

  return (
    <div className="space-y-4">
      {/* ── Readiness checklist ── */}
      <div
        className={cn(
          "rounded-xl border p-4",
          validation.valid
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5",
        )}
      >
        <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 text-muted-foreground/60">
          <ClipboardCheck className="size-3" />
          {validation.valid ? "Ready to " + (mode === "edit" ? "save" : "post") : "Still needed"}
        </p>
        {validation.valid ? (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="size-4" /> Everything required is filled in.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {validation.issues.map((issue, i) => (
              <li
                key={`${issue.field}-${i}`}
                className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2"
              >
                <XCircle className="size-3.5 shrink-0" /> {issue.message}
              </li>
            ))}
          </ul>
        )}
        {validation.warnings.length > 0 && (
          <ul className="space-y-1 mt-2 pt-2 border-t border-border/40">
            {validation.warnings.map((w, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card icon={MapPin} title="Route">
          <Row label="Pickup" value={`${pickup.city || "—"}, ${pickup.state || "—"} ${pickup.zip || ""}`} />
          <Row label="Delivery" value={`${delivery.city || "—"}, ${delivery.state || "—"} ${delivery.zip || ""}`} />
        </Card>

        <Card icon={Car} title="Vehicles">
          <Row label="Count" value={`${vehicles.length} / ${trailerLabel}`} />
          <Row label="Inspection photos" value={`${photosCount} of ${vehicles.length}`} />
          <div className="mt-1 space-y-1">
            {vehicles.map((v, i) => (
              <p key={v.id} className="text-[11px] text-muted-foreground truncate">
                {i + 1}. {v.year} {v.make} {v.model}
                {v.vin ? ` — ${v.vin}` : ""}
              </p>
            ))}
          </div>
        </Card>

        <Card icon={Calendar} title="Schedule">
          <Row label="First Available" value={dates.firstAvailable || "—"} />
          <Row label="Pickup Deadline" value={dates.pickupDeadline || "—"} />
          <Row label="Delivery Deadline" value={dates.deliveryDeadline || "—"} />
        </Card>

        <Card icon={DollarSign} title="Pricing">
          <Row
            label="Carrier Pay"
            value={pricing.carrierPayAmount != null ? `$${pricing.carrierPayAmount.toLocaleString()}` : "—"}
          />
          <Row
            label="COP / COD"
            value={pricing.copCodAmount != null ? `$${pricing.copCodAmount.toLocaleString()}` : "—"}
          />
          <Row
            label="$ / Mile"
            value={pricing.pricePerMile != null ? `$${pricing.pricePerMile.toFixed(2)}` : "—"}
          />
        </Card>

        {postType === "assign-carrier" && (
          <Card icon={UserCheck} title="Assignment">
            {mode === "edit" ? (
              <Row label="Current driver" value={currentAssigneeName || "Unassigned"} />
            ) : makeAvailable ? (
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="size-4 text-emerald-500" /> Available Load — open to requests
              </p>
            ) : (
              <Row label="Driver" value={selectedDriverName || "Not selected"} />
            )}
          </Card>
        )}

        <Card icon={StickyNote} title="Notes & Visibility">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1.5">
            {additionalInfo.visibility === "public" ? (
              <>
                <Globe className="size-3.5 text-emerald-500" /> Visible on Driver Board
              </>
            ) : (
              <>
                <Lock className="size-3.5 text-muted-foreground" /> Private
              </>
            )}
          </p>
          <Row label="Load notes" value={additionalInfo.notes ? "Added" : "—"} />
          <Row label="Carrier instructions" value={additionalInfo.instructions ? "Added" : "—"} />
        </Card>
      </div>

      {/* ── Agree to terms ── */}
      <button
        type="button"
        onClick={onToggleAgree}
        aria-pressed={contract.agreedToTerms}
        className={cn(
          "w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          contract.agreedToTerms
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-border/60 bg-background/40 hover:border-emerald-500/25",
        )}
      >
        <div
          className={cn(
            "size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            contract.agreedToTerms ? "border-emerald-500 bg-emerald-500" : "border-border",
          )}
        >
          {contract.agreedToTerms && <Check className="size-3 text-white" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ScrollText className="size-3.5 text-muted-foreground" /> I agree to the transport terms
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Vehicles are transported in the condition received, normal road wear excepted, and load details are accurate to the best of your knowledge.
          </p>
        </div>
      </button>
    </div>
  )
}
