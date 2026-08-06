"use client"

import * as React from "react"
import { MapPin, User, Phone, Mail, Building2 } from "lucide-react"
import { LocationBlock, LocationType } from "./types"
import { cn } from "@/lib/utils"

// ─── Route step: pickup + delivery location editors ──────────────────────────

interface LocationSectionProps {
  pickup: LocationBlock
  delivery: LocationBlock
  onPickupChange: (loc: LocationBlock) => void
  onDeliveryChange: (loc: LocationBlock) => void
}

const LOCATION_TYPES: Array<{ value: LocationType; label: string }> = [
  { value: "dealership", label: "Dealership" },
  { value: "auction", label: "Auction" },
  { value: "residence", label: "Residence" },
  { value: "business", label: "Business" },
  { value: "port", label: "Port" },
  { value: "other", label: "Other" },
]

const inputClass = cn(
  "w-full h-9 rounded-lg border border-border/60 bg-background/40 px-2.5 text-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
)

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function LocationEditor({
  title,
  accent,
  value,
  onChange,
}: {
  title: string
  accent: "emerald" | "cyan"
  value: LocationBlock
  onChange: (loc: LocationBlock) => void
}) {
  const set = (patch: Partial<LocationBlock>) => onChange({ ...value, ...patch })
  const accentText =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-cyan-600 dark:text-cyan-400"
  const accentBg =
    accent === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/25"
      : "bg-cyan-500/10 border-cyan-500/25"

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4 relative overflow-hidden">
      <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("size-6 rounded-full border flex items-center justify-center", accentBg)}>
          <MapPin className={cn("size-3.5", accentText)} />
        </div>
        <span className={cn("text-[10px] font-black uppercase tracking-widest", accentText)}>
          {title}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Location Name" className="sm:col-span-2">
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              className={cn(inputClass, "pl-8")}
              value={value.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Business or site name (optional)"
              maxLength={160}
            />
          </div>
        </Field>

        <Field label="Address" className="sm:col-span-2">
          <input
            className={inputClass}
            value={value.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Street address"
            maxLength={240}
          />
        </Field>

        <Field label="City">
          <input
            className={inputClass}
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="City"
            maxLength={120}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="State">
            <input
              className={inputClass}
              value={value.state}
              onChange={(e) => set({ state: e.target.value })}
              placeholder="UT"
              maxLength={40}
            />
          </Field>
          <Field label="ZIP">
            <input
              className={inputClass}
              value={value.zip}
              onChange={(e) => set({ zip: e.target.value.replace(/[^\d-]/g, "") })}
              placeholder="84101"
              maxLength={10}
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Contact Name">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              className={cn(inputClass, "pl-8")}
              value={value.contactName ?? ""}
              onChange={(e) => set({ contactName: e.target.value })}
              placeholder="On-site contact"
              maxLength={120}
            />
          </div>
        </Field>

        <Field label="Location Type">
          <select
            className={inputClass}
            value={value.locationType ?? ""}
            onChange={(e) =>
              set({ locationType: (e.target.value || "") as LocationType | "" })
            }
          >
            <option value="">Select type…</option>
            {LOCATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phone">
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              className={cn(inputClass, "pl-8")}
              value={value.phone ?? ""}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="(555) 555-5555"
              maxLength={30}
              inputMode="tel"
            />
          </div>
        </Field>

        <Field label="Email">
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              className={cn(inputClass, "pl-8")}
              value={value.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="contact@example.com"
              maxLength={160}
              inputMode="email"
            />
          </div>
        </Field>
      </div>
    </div>
  )
}

export function LocationSection({
  pickup,
  delivery,
  onPickupChange,
  onDeliveryChange,
}: LocationSectionProps) {
  return (
    <div className="space-y-4">
      <LocationEditor
        title="Origin — Pickup"
        accent="emerald"
        value={pickup}
        onChange={onPickupChange}
      />
      <LocationEditor
        title="Destination — Delivery"
        accent="cyan"
        value={delivery}
        onChange={onDeliveryChange}
      />
    </div>
  )
}