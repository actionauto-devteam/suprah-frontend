import * as React from "react"
import {
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  Hash,
  Globe2,
  FileText,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  LocationBlock,
  LOCATION_TYPES,
  US_STATES,
  STATE_ZIP_MAP,
} from "./types"
import type { ValidationIssue } from "./validation"

// ─── Route step: pickup + delivery ───────────────────────────────────────────
// This is the Location component rendered by LoadFormLayout.
//
// Required fields mirror both frontend validation.ts and backend
// load.validation.ts:
//   address, city, state, zip
//
// Recommended fields improve driver coordination but stay non-blocking:
//   contactName, phone
//
// All other location details remain optional.
//
// STATE_ZIP_MAP provides a default ZIP value when the user deliberately changes
// a State. Existing Edit Load ZIP values are preserved during initial hydration;
// they are replaced only after an intentional State selection. The populated ZIP
// remains editable because a state can contain many valid ZIP codes.

const LOCATION_TYPE_LABELS: Record<string, string> = {
  dealership: "Dealership",
  auction: "Auction",
  residence: "Residence",
  business: "Business",
  port: "Port",
  other: "Other",
}

const labelClass =
  "block text-xs font-bold text-foreground/80 uppercase tracking-[0.12em] mb-1.5"

const controlClass =
  "w-full h-11 rounded-lg border border-border bg-background px-3 text-base font-medium text-foreground " +
  "placeholder:font-normal placeholder:text-muted-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/60 transition-colors"

type FieldImportance = "required" | "recommended" | "optional"

interface FieldProps {
  label: string
  importance?: FieldImportance
  className?: string
  children: React.ReactNode
  hint?: string
  error?: string
}

function Field({
  label,
  importance = "optional",
  className,
  children,
  hint,
  error,
}: FieldProps) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={cn(labelClass, "flex items-center gap-1.5 flex-wrap")}>
        <span>
          {label}
          {importance === "required" && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </span>

        {importance === "recommended" && (
          <span className="normal-case tracking-normal rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
            Recommended
          </span>
        )}

        {importance === "optional" && (
          <span className="normal-case tracking-normal text-[9px] font-semibold text-muted-foreground/70">
            Optional
          </span>
        )}
      </span>

      {children}

      {error ? (
        <span
          role="alert"
          className="block text-[11px] font-semibold text-destructive mt-1.5"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="block text-[11px] font-medium text-muted-foreground mt-1">
          {hint}
        </span>
      ) : null}
    </label>
  )
}

/** Input with a leading icon; icon is decorative only. */
function IconInput({
  icon: Icon,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        {...props}
        className={cn(controlClass, "pl-9", props.className)}
      />
    </div>
  )
}

// ─── One location block ──────────────────────────────────────────────────────

interface LocationCardProps {
  title: string
  accent: "emerald" | "cyan"
  prefix: "pickup" | "delivery"
  value: LocationBlock
  onChange: (updated: LocationBlock) => void
  errors?: Record<string, string>
}

function LocationCard({
  title,
  accent,
  prefix,
  value,
  onChange,
  errors = {},
}: LocationCardProps) {
  const set =
    (key: keyof LocationBlock) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [key]: e.target.value })

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextState = e.target.value
    const nextZip = nextState ? STATE_ZIP_MAP[nextState] ?? "" : ""

    // The ZIP must become a real controlled field value, not only a visual
    // placeholder. This runs only on a deliberate State change, so Edit Load
    // keeps its saved ZIP until the user actually chooses another State.
    onChange({
      ...value,
      state: nextState,
      zip: nextZip,
    })
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, zip: e.target.value })
  }

  const errorFor = (field: keyof LocationBlock): string | undefined =>
    errors[`${prefix}.${String(field)}`]

  const invalidControlClass = (field: keyof LocationBlock) =>
    errorFor(field)
      ? "border-destructive focus-visible:ring-destructive/40 focus-visible:border-destructive"
      : ""

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
            "text-xs font-black uppercase tracking-[0.14em]",
            accentText,
          )}
        >
          {title}
        </span>
      </div>

      <Field label="Location Name" importance="optional">
        <IconInput
          icon={Building2}
          placeholder="Business or site name"
          value={value.name ?? ""}
          onChange={set("name")}
          maxLength={160}
        />
      </Field>

      <Field
        label="Address"
        importance="required"
        error={errorFor("address")}
      >
        <input
          aria-invalid={Boolean(errorFor("address"))}
          className={cn(controlClass, invalidControlClass("address"))}
          placeholder="Street address"
          value={value.address ?? ""}
          onChange={set("address")}
          maxLength={240}
        />
      </Field>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field
          label="City"
          importance="required"
          className="col-span-2"
          error={errorFor("city")}
        >
          <input
            aria-invalid={Boolean(errorFor("city"))}
            className={cn(controlClass, invalidControlClass("city"))}
            placeholder="City"
            value={value.city ?? ""}
            onChange={set("city")}
            maxLength={120}
          />
        </Field>

        <Field
          label="State"
          importance="required"
          className="col-span-1"
          error={errorFor("state")}
        >
          <select
            aria-invalid={Boolean(errorFor("state"))}
            className={cn(
              controlClass,
              "cursor-pointer",
              invalidControlClass("state"),
            )}
            value={value.state ?? ""}
            onChange={handleStateChange}
          >
            <option value="">Select…</option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="ZIP"
          importance="required"
          className="col-span-1"
          error={errorFor("zip")}
          hint={
            value.state
              ? `Default ZIP for ${value.state}; edit it if the exact route ZIP is different.`
              : undefined
          }
        >
          <input
            aria-invalid={Boolean(errorFor("zip"))}
            className={cn(controlClass, invalidControlClass("zip"))}
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

      {/* Contact Name / Location Type / Country */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field
          label="Contact Name"
          importance="recommended"
          hint="Helps the driver know who to ask for on arrival."
        >
          <IconInput
            icon={User}
            placeholder="On-site contact"
            value={value.contactName ?? ""}
            onChange={set("contactName")}
            maxLength={120}
          />
        </Field>

        <Field label="Location Type" importance="optional">
          <select
            className={cn(controlClass, "cursor-pointer")}
            value={value.locationType ?? ""}
            onChange={set("locationType")}
          >
            <option value="">Select type…</option>
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {LOCATION_TYPE_LABELS[type] ?? type}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Country"
          importance="optional"
          hint="Defaults to US for new loads."
        >
          <IconInput
            icon={Globe2}
            placeholder="US"
            value={value.country ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                country: e.target.value.toUpperCase().slice(0, 3),
              })
            }
            maxLength={3}
            className="uppercase"
          />
        </Field>
      </div>

      {/* Phone / Extension / Email */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_1fr] gap-3">
        <Field
          label="Phone"
          importance="recommended"
          hint="Useful for pickup or delivery coordination."
        >
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

        <Field label="Ext" importance="optional">
          <IconInput
            icon={Hash}
            placeholder="102"
            value={value.phoneExt ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 6)
              onChange({ ...value, phoneExt: digits })
            }}
            inputMode="numeric"
            maxLength={6}
          />
        </Field>

        <Field
          label="Email"
          importance="optional"
          error={errorFor("email")}
        >
          <IconInput
            icon={Mail}
            placeholder="contact@example.com"
            value={value.email ?? ""}
            onChange={set("email")}
            type="email"
            maxLength={160}
            aria-invalid={Boolean(errorFor("email"))}
            className={invalidControlClass("email")}
          />
        </Field>
      </div>

      <Field
        label="Location Notes"
        importance="optional"
        hint="Gate code, dock instructions, access hours, or other site-specific details."
      >
        <div className="relative">
          <FileText className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
          <Textarea
            placeholder="Optional location notes"
            value={value.notes ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                notes: e.target.value.slice(0, 1000),
              })
            }
            maxLength={1000}
            rows={3}
            className="min-h-20 pl-9 text-sm resize-y"
          />
        </div>
      </Field>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface LocationSectionProps {
  pickup: LocationBlock
  delivery: LocationBlock
  onPickupChange: (updated: LocationBlock) => void
  onDeliveryChange: (updated: LocationBlock) => void
  validationIssues?: ValidationIssue[]
}

export function LocationSection({
  pickup,
  delivery,
  onPickupChange,
  onDeliveryChange,
  validationIssues = [],
}: LocationSectionProps) {
  const errors = React.useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {}

    for (const issue of validationIssues) {
      result[issue.field] = issue.message
    }

    return result
  }, [validationIssues])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-bold text-foreground">Field guide:</span>{" "}
        <span className="text-destructive font-bold">*</span> Required fields
        must be completed.{" "}
        <span className="font-bold text-amber-700 dark:text-amber-300">
          Recommended
        </span>{" "}
        details help the driver coordinate the stop but do not block load
        creation.
      </div>

      <LocationCard
        title="Origin — Pickup"
        accent="emerald"
        prefix="pickup"
        value={pickup}
        onChange={onPickupChange}
        errors={errors}
      />

      <LocationCard
        title="Destination — Delivery"
        accent="cyan"
        prefix="delivery"
        value={delivery}
        onChange={onDeliveryChange}
        errors={errors}
      />
    </div>
  )
}