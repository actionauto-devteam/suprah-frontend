"use client"

import * as React from "react"
import { MapPin, Building2, Phone, User, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Field, FieldRow } from "./FormField"
import { LocationBlock, LOCATION_TYPES, US_STATES, STATE_ZIP_MAP } from "./types"

// ─── LocationFields ──────────────────────────────────────────────────────────
// FIELD-NAME ALIGNMENT (build fix + silent-strip prevention):
// This component previously bound to `companyName` and `street`, which don't
// exist on LocationBlock — the canonical keys are `name` and `address`,
// matching the backend zod locationBlockSchema and the Mongoose
// locationSchema. Binding to the canonical keys is not just a type fix:
// the backend REQUIRES `address`, so a payload carrying `street` instead
// would fail validation on every submit.
//
// `country`, `phoneExt`, and `notes` are genuinely new fields — they were
// added to LocationBlock (types.ts), the zod schema, and the Mongoose
// schema in the same change. Without all three, zod's strip mode discards
// them silently (same failure mode as dates.notes and pricing.pricePerMile).

interface LocationFieldsProps {
  value: LocationBlock
  onChange: (updated: LocationBlock) => void
}

export function LocationFields({ value, onChange }: LocationFieldsProps) {
  const set = (key: keyof LocationBlock) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange({ ...value, [key]: e.target.value })

  const setSelect = (key: keyof LocationBlock) => (val: string) => {
    const update: Partial<LocationBlock> = { [key]: val }
    if (key === "state" && STATE_ZIP_MAP[val]) {
      update.zip = STATE_ZIP_MAP[val]
    }
    onChange({ ...value, ...update })
  }

  return (
    <div className="space-y-3">
      <Field label="Location Type" required icon={Building2}>
        <Select value={value.locationType} onValueChange={setSelect("locationType")}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <FieldRow>
        <Field label="Company Name" icon={Building2}>
          {/* canonical key: `name` (backend locationSchema.name) */}
          <Input placeholder="ABC Motors" value={value.name} onChange={set("name")} className="h-9 text-sm" />
        </Field>
        <Field label="Contact Name" required icon={User}>
          <Input placeholder="John Smith" value={value.contactName} onChange={set("contactName")} maxLength={50} className="h-9 text-sm" />
        </Field>
      </FieldRow>

      <Field label="Street Address" required icon={MapPin}>
        {/* canonical key: `address` — REQUIRED by backend zod; binding to a
            different key here breaks every submit, not just the build */}
        <Input placeholder="1234 Main St, Suite 100" value={value.address} onChange={set("address")} maxLength={100} className="h-9 text-sm" />
      </Field>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="City" required className="col-span-1">
          <Input placeholder="Salt Lake City" value={value.city} onChange={set("city")} className="h-9 text-sm" />
        </Field>
        <Field label="State" required className="col-span-1">
          <Select value={value.state} onValueChange={setSelect("state")}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="UT" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="ZIP" required className="col-span-2 sm:col-span-1">
          <Input placeholder="84101" value={value.zip} onChange={set("zip")} maxLength={10} className="h-9 text-sm" />
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Country" className="col-span-1">
          <Input placeholder="US" value={value.country} onChange={set("country")} maxLength={3} className="h-9 text-sm uppercase" />
        </Field>
        <Field label="Phone" icon={Phone} required className="col-span-1">
          <Input
            placeholder="8015550100"
            value={value.phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              onChange({ ...value, phone: digits });
            }}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            className="h-9 text-sm"
          />
        </Field>
        <Field label="Ext" icon={Hash} className="col-span-2 sm:col-span-1">
          <Input placeholder="102" value={value.phoneExt} onChange={set("phoneExt")} maxLength={6} className="h-9 text-sm" />
        </Field>
      </div>

      <Field label="Location Notes">
        <Textarea
          placeholder="Gate code, dock instructions, hours of operation…"
          value={value.notes}
          onChange={set("notes")}
          rows={2}
          className="text-sm resize-none"
        />
      </Field>
    </div>
  )
}