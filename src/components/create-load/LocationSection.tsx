"use client"

import * as React from "react"
import { MapPin, Building2, User, Phone, Mail } from "lucide-react"
import { LocationBlock, LOCATION_TYPES, US_STATES, STATE_ZIP_MAP } from "./types"
import { cn } from "@/lib/utils"

// ─── Route step: pickup + delivery ───────────────────────────────────────────
// This is the component LoadFormLayout actually renders for step "route".
// (LocationFields.tsx is a separate, unused implementation — changes made
// there never reach the form.)
//
// CHANGE IN THIS VERSION: State is a DROPDOWN, not a free-text input, and
// picking a state auto-fills the ZIP from STATE_ZIP_MAP.
//
// Requires STATE_ZIP_MAP to be Record<string, string> (capital-city ZIPs).
// An older revision of types.ts typed it Record<string, [number, number]>
// (ZIP ranges) — with that version the field fills "84000,84799" instead of
// "84101". Check which one your types.ts has.
//
// The autofill is NON-DESTRUCTIVE: it writes only when the ZIP is empty or
// still holds a value this component put there. Once a dispatcher types a
// real ZIP, re-picking the state won't wipe it.

const LOCATION_TYPE_LABELS: Record<string, string> = {
  dealership: "Dealership",
  auction: "Auction",
  residence: "Residence",
  business: "Business",
  port: "Port",
  other: "Other",
}

const labelClass =
  "block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1"

const controlClass =
  "w-full h-11 rounded-lg border border-border/60 bg-background/40 px-3 text-sm " +
  "placeholder:text-muted-foreground/50 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-colors"

interface FieldProps {
  label: string
  className?: string
  children: React.ReactNode
  hint?: string
}

function Field({ label, className, children, hint }: FieldProps) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? (
        <span className="block text-[10px] text-muted-foreground mt-1">{hint}</span>
      ) : null}
    </label>
  )
}

/** Input with a leading icon; icon is decorative only. */
function IconInput({
  icon: Icon,
  ...props
}: { icon: React.ComponentType<{ className?: string }> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="size-4 text-muted-foreground/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input {...props} className={cn(controlClass, "pl-9", props.className)} />
    </div>
  )
}

// ─── One location block ──────────────────────────────────────────────────────

interface LocationCardProps {
  title: string
  accent: "emerald" | "cyan"
  value: LocationBlock
  onChange: (updated: LocationBlock) => void
}

function LocationCard({ title, accent, value, onChange }: LocationCardProps) {
  // Remembers the ZIP this card auto-filled, so a dispatcher-typed ZIP stays
  // distinguishable from one we supplied. Per-card, so pickup and delivery
  // track independently.
  const autoFilledZipRef = React.useRef<string | null>(null)

  const set =
    (key: keyof LocationBlock) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [key]: e.target.value })

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextState = e.target.value
    const stateZip = STATE_ZIP_MAP[nextState]
    const currentZip = value.zip ?? ""
    const zipIsOursToSet =
      currentZip === "" || currentZip === autoFilledZipRef.current

    if (stateZip && zipIsOursToSet) {
      autoFilledZipRef.current = stateZip
      onChange({ ...value, state: nextState, zip: stateZip })
    } else {
      onChange({ ...value, state: nextState })
    }
  }

  // Typing in the ZIP hands ownership of the field back to the dispatcher.
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (next !== autoFilledZipRef.current) autoFilledZipRef.current = null
    onChange({ ...value, zip: next })
  }

  const zipWasAutoFilled = !!value.zip && value.zip === autoFilledZipRef.current

  const accentText =
    accent === "emerald"
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-cyan-500 dark:text-cyan-400"
  const accentRing =
    accent === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : "border-cyan-500/40 bg-cyan-500/10"

  return (
    <div className="rounded-xl border border-border/60 bg-background/20 p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "size-8 rounded-full border flex items-center justify-center shrink-0",
            accentRing,
          )}
        >
          <MapPin className={cn("size-4", accentText)} />
        </span>
        <span
          className={cn(
            "text-[11px] font-black uppercase tracking-[0.2em]",
            accentText,
          )}
        >
          {title}
        </span>
      </div>

      <Field label="Location Name">
        <IconInput
          icon={Building2}
          placeholder="Business or site name (optional)"
          value={value.name ?? ""}
          onChange={set("name")}
          maxLength={160}
        />
      </Field>

      <Field label="Address">
        <input
          className={controlClass}
          placeholder="Street address"
          value={value.address ?? ""}
          onChange={set("address")}
          maxLength={240}
        />
      </Field>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="City" className="col-span-2">
          <input
            className={controlClass}
            placeholder="City"
            value={value.city ?? ""}
            onChange={set("city")}
            maxLength={120}
          />
        </Field>

        {/* ── State: dropdown, drives the ZIP autofill ── */}
        <Field label="State" className="col-span-1">
          <select
            className={cn(controlClass, "appearance-none cursor-pointer")}
            value={value.state ?? ""}
            onChange={handleStateChange}
          >
            <option value="">UT</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="ZIP"
          className="col-span-1"
          hint={zipWasAutoFilled ? `From ${value.state} — use the exact ZIP` : undefined}
        >
          <input
            className={controlClass}
            placeholder={
              value.state ? STATE_ZIP_MAP[value.state] ?? "84101" : "84101"
            }
            value={value.zip ?? ""}
            onChange={handleZipChange}
            maxLength={10}
            inputMode="numeric"
          />
        </Field>
      </div>

      {/* Contact Name / Location Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Contact Name">
          <IconInput
            icon={User}
            placeholder="On-site contact"
            value={value.contactName ?? ""}
            onChange={set("contactName")}
            maxLength={120}
          />
        </Field>
        <Field label="Location Type">
          <select
            className={cn(controlClass, "cursor-pointer")}
            value={value.locationType ?? ""}
            onChange={set("locationType")}
          >
            <option value="">Select type…</option>
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LOCATION_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Phone / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phone">
          <IconInput
            icon={Phone}
            placeholder="(555) 555-5555"
            value={value.phone ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
              onChange({ ...value, phone: digits })
            }}
            type="tel"
            inputMode="numeric"
            maxLength={14}
          />
        </Field>
        <Field label="Email">
          <IconInput
            icon={Mail}
            placeholder="contact@example.com"
            value={value.email ?? ""}
            onChange={set("email")}
            type="email"
            maxLength={160}
          />
        </Field>
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface LocationSectionProps {
  pickup: LocationBlock
  delivery: LocationBlock
  onPickupChange: (updated: LocationBlock) => void
  onDeliveryChange: (updated: LocationBlock) => void
}

export function LocationSection({
  pickup,
  delivery,
  onPickupChange,
  onDeliveryChange,
}: LocationSectionProps) {
  return (
    <div className="space-y-4">
      <LocationCard
        title="Origin — Pickup"
        accent="emerald"
        value={pickup}
        onChange={onPickupChange}
      />
      <LocationCard
        title="Destination — Delivery"
        accent="cyan"
        value={delivery}
        onChange={onDeliveryChange}
      />
    </div>
  )
}