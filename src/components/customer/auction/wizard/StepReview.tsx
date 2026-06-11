"use client";

import { CheckCircle2, XCircle, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuctionListing, PHOTO_SLOT_META } from "@/lib/api/auctionListings";
import { resolveImageUrl, cn } from "@/lib/utils";
import {
  WizardForm,
  RequirementItem,
  CONDITIONS,
  TITLE_STATUSES,
  CONTACT_PREFERENCES,
} from "./form";

function SummarySection({
  title,
  step,
  onJump,
  rows,
}: {
  title: string;
  step: number;
  onJump: (step: number) => void;
  rows: { label: string; value?: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/50 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => onJump(step)}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[10px] text-muted-foreground">{row.label}</dt>
            <dd className="truncate text-xs font-semibold text-foreground">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function StepReview({
  form,
  listing,
  requirements,
  onJump,
}: {
  form: WizardForm;
  listing: AuctionListing | null;
  requirements: RequirementItem[];
  onJump: (step: number) => void;
}) {
  const missing = requirements.filter((r) => !r.done);
  const conditionLabel = CONDITIONS.find((c) => c.value === form.condition)?.label;
  const titleLabel = TITLE_STATUSES.find((t) => t.value === form.titleStatus)?.label;
  const contactLabel = CONTACT_PREFERENCES.find((c) => c.value === form.contactPreference)?.label;
  const photos = listing?.photos ?? [];

  return (
    <div className="space-y-4">
      {missing.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3.5 dark:bg-amber-500/10">
          <p className="mb-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            {missing.length} required {missing.length === 1 ? "item" : "items"} left before you can submit
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onJump(r.step)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-background px-2.5 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:border-amber-500/60 dark:text-amber-400"
              >
                <XCircle className="h-3 w-3" />
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Everything looks complete — ready to submit for review.
          </p>
        </div>
      )}

      <SummarySection
        title="Vehicle"
        step={1}
        onJump={onJump}
        rows={[
          { label: "VIN", value: form.vin },
          { label: "Year", value: form.year },
          { label: "Make", value: form.make },
          { label: "Model", value: form.model },
          { label: "Trim", value: form.trim },
          { label: "Body Style", value: form.bodyStyle },
          { label: "Mileage", value: form.mileage ? `${Number(form.mileage).toLocaleString()} mi` : undefined },
          { label: "Transmission", value: form.transmission },
          { label: "Fuel Type", value: form.fuelType },
          { label: "Drivetrain", value: form.driveTrain },
          { label: "Engine", value: form.engine },
          { label: "Exterior", value: form.exteriorColor },
          { label: "Interior", value: form.interiorColor },
          { label: "Doors", value: form.doors },
          { label: "Seats", value: form.seats },
        ]}
      />

      <SummarySection
        title="Condition & History"
        step={2}
        onJump={onJump}
        rows={[
          { label: "Condition", value: conditionLabel },
          { label: "Title Status", value: titleLabel },
          { label: "Owners", value: form.ownersCount },
          { label: "Keys", value: form.keysCount },
          { label: "Accidents", value: form.hasAccidentHistory ? "Yes" : "No" },
          { label: "Service Records", value: form.hasServiceHistory ? "Yes" : "No" },
          { label: "Known Issues", value: form.knownIssues },
          { label: "Features", value: form.features.length > 0 ? `${form.features.length} selected` : undefined },
        ]}
      />

      <div className="rounded-xl border border-border/50 p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Photos ({photos.length})
          </p>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => onJump(3)}>
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>
        {photos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos uploaded yet.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p) => (
              <div key={`${p.slot}-${p.url}`} className="shrink-0 space-y-1">
                <img
                  src={resolveImageUrl(p.url) || ""}
                  alt={PHOTO_SLOT_META[p.slot].label}
                  className="h-16 w-24 rounded-lg border border-border/50 object-cover"
                />
                <p className="text-center text-[9px] font-medium text-muted-foreground">{PHOTO_SLOT_META[p.slot].label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <SummarySection
        title="Pricing & Contact"
        step={4}
        onJump={onJump}
        rows={[
          {
            label: "Asking Price",
            value: Number(form.askingPrice) > 0
              ? Number(form.askingPrice).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
              : undefined,
          },
          { label: "Negotiable", value: form.isNegotiable ? "Yes" : "No" },
          { label: "Contact Via", value: contactLabel },
        ]}
      />

      {form.description && (
        <div className="rounded-xl border border-border/50 p-3.5">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{form.description}</p>
        </div>
      )}

      <div className={cn("flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/30 p-3.5")}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          By submitting, you confirm the information above is accurate and you own (or are authorized to sell) this vehicle.
          Our team will review your listing — if approved, it will be added to the shop inventory.
        </p>
      </div>
    </div>
  );
}
