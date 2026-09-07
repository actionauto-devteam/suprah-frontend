"use client";

import * as React from "react";
import {
  Banknote,
  Calendar,
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  DollarSign,
  Gauge,
  Hash,
  ImageIcon,
  MapPin,
  Palette,
  Route,
  ClipboardList,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatScheduleDate } from "@/utils/calendar.utils";
import type { Load, LoadStatus, LoadVehicleItem } from "@/types/load";

export type TransportationMobileLoadTab = "overview" | "vehicles" | "financials";

export function formatMobileLoadCurrency(value?: number) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | Date) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  });
}

export function getMobileLoadSchedulePresentation(load: Load) {
  const pickupDate = load.dates?.firstAvailable || load.dates?.pickupDeadline;

  if (load.status === "Delivered") {
    return {
      tileLabel: "Delivered",
      modalLabel: "Delivered",
      displayValue: load.deliveredAt
        ? formatDateTime(load.deliveredAt)
        : load.dates?.deliveryDeadline
          ? formatScheduleDate(load.dates.deliveryDeadline)
          : "Delivered",
      helper: load.deliveredAt
        ? "This load has completed delivery."
        : "Delivery is complete. The recorded delivery time is not available.",
      tone: "emerald" as const,
      stage: "completed" as const,
    };
  }

  if (load.status === "Picked Up" || load.status === "In-Transit") {
    return {
      tileLabel: "Delivery Deadline",
      modalLabel: "Delivery Deadline",
      displayValue: load.dates?.deliveryDeadline
        ? formatScheduleDate(load.dates.deliveryDeadline)
        : "Not set",
      helper:
        load.status === "Picked Up"
          ? "The vehicle has been picked up. The next important date is the delivery deadline."
          : "The load is in transit. The delivery deadline is now the active schedule target.",
      tone: "cyan" as const,
      stage: "delivery" as const,
    };
  }

  return {
    tileLabel: "Pickup Date",
    modalLabel: "Pickup Date",
    displayValue: pickupDate ? formatScheduleDate(pickupDate) : "ASAP",
    helper:
      load.status === "Accepted"
        ? "The load has been accepted. Pickup is the next scheduled milestone."
        : load.status === "Assigned"
          ? "The load is assigned. Pickup is the next scheduled milestone."
          : "Pickup is the next scheduled milestone for this load.",
    tone: "amber" as const,
    stage: "pickup" as const,
  };
}

const STATUS_BADGE: Record<LoadStatus, string> = {
  Draft: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  Posted: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Assigned: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  Accepted: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  "Picked Up": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  "In-Transit": "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  Delivered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Cancelled: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
};

const JOURNEY_STATUSES = [
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
  "Delivered",
] as const;

type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

const JOURNEY_THEME: Record<JourneyStatus, { bar: string; badge: string }> = {
  Assigned: {
    bar: "bg-blue-500",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400",
  },
  Accepted: {
    bar: "bg-violet-500",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-500 dark:text-violet-400",
  },
  "Picked Up": {
    bar: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400",
  },
  "In-Transit": {
    bar: "bg-cyan-500",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400",
  },
  Delivered: {
    bar: "bg-emerald-500",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  },
};

function currentJourneyStatus(status: LoadStatus): JourneyStatus | null {
  return JOURNEY_STATUSES.includes(status as JourneyStatus)
    ? (status as JourneyStatus)
    : null;
}

function DetailField({
  label,
  value,
  icon,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border px-3 py-2.5",
        emphasis
          ? "border-emerald-500/40 bg-emerald-500/6"
          : "border-border/60 bg-background/45",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
        {icon}
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 break-words text-xs font-black leading-snug text-foreground",
          emphasis && "text-sm text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function RouteBlock({
  label,
  city,
  state,
  address,
  contact,
  tone,
}: {
  label: "Origin" | "Destination";
  city?: string;
  state?: string;
  address?: string;
  contact?: string;
  tone: "emerald" | "cyan";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/45 p-3">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em]",
          tone === "emerald" ? "text-emerald-500" : "text-cyan-500",
        )}
      >
        <MapPin className="size-3 shrink-0" /> {label}
      </div>
      <p className="mt-1 break-words text-sm font-black leading-snug text-foreground">
        {[city, state].filter(Boolean).join(", ") || "—"}
      </p>
      {address ? (
        <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">
          {address}
        </p>
      ) : null}
      {contact ? (
        <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
          <User className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-words">{contact}</span>
        </p>
      ) : null}
    </div>
  );
}

function getVehicleName(vehicle: LoadVehicleItem, index: number) {
  const name = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || `Vehicle ${index + 1}`;
}

function getLicensePlate(vehicle: LoadVehicleItem) {
  if (!vehicle.licensePlate) return "—";
  return [vehicle.licensePlate, vehicle.licenseState].filter(Boolean).join(" · ");
}

export function TransportationMobileLoadOverview({ load }: { load: Load }) {
  const schedule = getMobileLoadSchedulePresentation(load);
  const journey = currentJourneyStatus(load.status);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 gap-2">
        <RouteBlock
          label="Origin"
          city={load.pickupLocation.city}
          state={load.pickupLocation.state}
          address={load.pickupLocation.address || load.pickupLocation.street}
          contact={load.pickupLocation.contactName}
          tone="emerald"
        />
        <RouteBlock
          label="Destination"
          city={load.deliveryLocation.city}
          state={load.deliveryLocation.state}
          address={load.deliveryLocation.address || load.deliveryLocation.street}
          contact={load.deliveryLocation.contactName}
          tone="cyan"
        />
      </div>

      {journey ? (
        <section className="rounded-xl border border-border/60 bg-background/45 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
              Journey Progress
            </span>
            <Badge
              className={cn(
                "border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                JOURNEY_THEME[journey].badge,
              )}
            >
              {load.status}
            </Badge>
          </div>
          <div className="grid grid-cols-5 gap-1" aria-label={`Journey Progress: ${load.status}`}>
            {JOURNEY_STATUSES.map((status) => (
              <span
                key={status}
                title={status === journey ? `${status} — Current` : status}
                className={cn(
                  "h-1.5 rounded-full",
                  status === journey ? JOURNEY_THEME[status].bar : "bg-muted",
                )}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={cn(
          "overflow-hidden rounded-2xl border p-4",
          schedule.tone === "emerald" &&
            "border-emerald-500/40 bg-linear-to-br from-emerald-500/9 via-background to-emerald-500/2",
          schedule.tone === "cyan" &&
            "border-cyan-500/40 bg-linear-to-br from-cyan-500/9 via-background to-blue-500/2",
          schedule.tone === "amber" &&
            "border-amber-500/45 bg-linear-to-br from-amber-500/9 via-background to-amber-500/2",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            Current Schedule Focus
          </span>
          <Badge
            className={cn(
              "border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
              STATUS_BADGE[load.status],
            )}
          >
            {load.status}
          </Badge>
        </div>

        <div className="mt-3 flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border",
              schedule.tone === "emerald" && "border-emerald-500/25 bg-emerald-500/10",
              schedule.tone === "cyan" && "border-cyan-500/25 bg-cyan-500/10",
              schedule.tone === "amber" && "border-amber-500/25 bg-amber-500/10",
            )}
          >
            {schedule.stage === "completed" ? (
              <CheckCircle2 className="size-4.5 text-emerald-500" />
            ) : schedule.stage === "delivery" ? (
              <CalendarDays className="size-4.5 text-cyan-500" />
            ) : (
              <CalendarDays className="size-4.5 text-amber-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "break-words text-xs font-black uppercase tracking-[0.12em]",
                schedule.tone === "emerald" && "text-emerald-600 dark:text-emerald-400",
                schedule.tone === "cyan" && "text-cyan-600 dark:text-cyan-400",
                schedule.tone === "amber" && "text-amber-600 dark:text-amber-400",
              )}
            >
              {schedule.modalLabel}
            </p>
            <p className="mt-1 break-words text-xl font-black leading-tight tracking-tight text-foreground">
              {schedule.displayValue}
            </p>
            <p className="mt-1.5 break-words text-[11px] leading-relaxed text-muted-foreground">
              {schedule.helper}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2">
        {[
          {
            label: "First Available",
            value: load.dates?.firstAvailable,
            helper: "Earliest date the vehicle is ready for pickup.",
            tone: "amber" as const,
            isCurrent: schedule.stage === "pickup",
            withTime: false,
          },
          {
            label: "Pickup Deadline",
            value: load.dates?.pickupDeadline,
            helper: "Target deadline for pickup completion.",
            tone: "violet" as const,
            isCurrent: false,
            withTime: false,
          },
          {
            label: load.status === "Delivered" ? "Delivered" : "Delivery Deadline",
            value: load.status === "Delivered" ? load.deliveredAt : load.dates?.deliveryDeadline,
            helper:
              load.status === "Delivered"
                ? "Recorded completion of final delivery."
                : "Target deadline for final delivery.",
            tone: load.status === "Delivered" ? ("emerald" as const) : ("cyan" as const),
            isCurrent: schedule.stage === "delivery" || schedule.stage === "completed",
            withTime: load.status === "Delivered",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              "min-w-0 rounded-xl border bg-background/50 p-3",
              item.isCurrent
                ? item.tone === "emerald"
                  ? "border-emerald-500/45 bg-emerald-500/5"
                  : item.tone === "cyan"
                    ? "border-cyan-500/45 bg-cyan-500/5"
                    : "border-amber-500/45 bg-amber-500/5"
                : "border-border/60",
            )}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border",
                  item.tone === "amber" &&
                    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  item.tone === "violet" &&
                    "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
                  item.tone === "cyan" &&
                    "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                  item.tone === "emerald" &&
                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {item.tone === "emerald" ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <Calendar className="size-3.5" />
                )}
              </div>
              {item.isCurrent ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                    item.tone === "emerald" &&
                      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    item.tone === "cyan" &&
                      "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                    item.tone === "amber" &&
                      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  Current
                </span>
              ) : null}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 break-words text-sm font-black tracking-tight text-foreground">
              {item.value
                ? item.withTime
                  ? formatDateTime(item.value)
                  : formatScheduleDate(item.value)
                : "Not set"}
            </p>
            <p className="mt-1 break-words text-[10px] leading-relaxed text-muted-foreground">
              {item.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DetailField label="Trailer" value={load.trailerType?.replace(/_/g, " ")} />
        <DetailField
          label="Assigned"
          value={
            load.assignedDriverId && typeof load.assignedDriverId === "object"
              ? load.assignedDriverId.name || load.assignedDriverId.email || "Assigned"
              : load.assignedDriverId
                ? "Assigned"
                : "—"
          }
        />
      </div>

      {load.dates?.notes ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
            Schedule Notes
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/85">
            {load.dates.notes}
          </p>
        </div>
      ) : null}

      {load.additionalInfo?.notes || load.additionalInfo?.instructions ? (
        <div className="rounded-xl border border-border/60 bg-background/45 p-3">
          {load.additionalInfo?.notes ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                {load.additionalInfo.notes}
              </p>
            </div>
          ) : null}
          {load.additionalInfo?.instructions ? (
            <div className={load.additionalInfo?.notes ? "mt-3 border-t border-border/50 pt-3" : ""}>
              <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                Instructions
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                {load.additionalInfo.instructions}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TransportationMobileLoadVehicles({ load }: { load: Load }) {
  const vehicles = load.vehicles ?? [];

  if (vehicles.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 text-center">
        <Car className="mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-bold text-foreground">No vehicle information available</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Add vehicles to this load to see their transport details here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.10em] text-emerald-600 dark:text-emerald-400">
          Vehicles on {load.loadNumber}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} attached to this transport record.
        </p>
      </div>

      {vehicles.map((vehicle, index) => (
        <section
          key={`${vehicle.vehicleId ?? vehicle.vin ?? "vehicle"}-${index}`}
          className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/45 shadow-sm"
        >
          <div className="relative overflow-hidden border-b border-border/60 bg-muted/30">
            {vehicle.imageUrl ? (
              <img
                src={vehicle.imageUrl}
                alt={getVehicleName(vehicle, index)}
                loading="lazy"
                className="h-36 w-full object-contain object-center"
              />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 bg-linear-to-br from-emerald-950/20 via-muted/20 to-cyan-950/20">
                <ImageIcon className="size-7 text-muted-foreground/45" />
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground/60">
                  No photo
                </span>
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
              Vehicle {index + 1}
            </span>
          </div>

          <div className="min-w-0 p-3.5">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-black tracking-tight text-foreground">
                  {getVehicleName(vehicle, index)}
                </h3>
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                  VIN: {vehicle.vin || "Not provided"}
                </p>
              </div>
              <Badge
                className={cn(
                  "border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                  vehicle.condition === "Operable"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                {vehicle.condition}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <DetailField label="Vehicle Type" value={vehicle.vehicleType || "—"} icon={<Car className="size-3" />} />
              <DetailField label="Color" value={vehicle.color || "—"} icon={<Palette className="size-3" />} />
              <DetailField label="Lot Number" value={vehicle.lotNumber || "—"} icon={<Hash className="size-3" />} />
              <DetailField label="License Plate" value={getLicensePlate(vehicle)} icon={<ClipboardList className="size-3" />} />
              <DetailField label="Oversized" value={vehicle.oversized ? "Yes" : "No"} icon={<Gauge className="size-3" />} />
            </div>

            {vehicle.carrierNotes ? (
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                  Carrier Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/85">
                  {vehicle.carrierNotes}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TransportationMobileLoadFinancials({ load }: { load: Load }) {
  return (
    <div className="space-y-3.5">
      <section className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-linear-to-br from-emerald-500/8 via-background to-cyan-500/4 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Carrier Pay
            </p>
            <p className="mt-1 break-words text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatMobileLoadCurrency(load.pricing?.carrierPayAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              Route Distance
            </p>
            <p className="mt-0.5 break-words font-mono text-sm font-black text-foreground">
              {load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} mi` : "—"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <DetailField
          label="Carrier Pay"
          value={formatMobileLoadCurrency(load.pricing?.carrierPayAmount)}
          icon={<DollarSign className="size-3" />}
          emphasis
        />
        <DetailField
          label="COD / COP"
          value={formatMobileLoadCurrency(load.pricing?.copCodAmount ?? 0)}
          icon={<Banknote className="size-3" />}
        />
        <DetailField
          label="Total Distance"
          value={load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} mi` : "—"}
          icon={<Route className="size-3" />}
        />
        <DetailField
          label="Price / Mile"
          value={load.pricing?.pricePerMile != null ? `$${load.pricing.pricePerMile.toFixed(2)}/mi` : "—"}
          icon={<Gauge className="size-3" />}
        />
        <DetailField
          label="Estimated Market Rate"
          value={formatMobileLoadCurrency(load.pricing?.estimatedRate)}
          icon={<Gauge className="size-3" />}
        />
        <DetailField
          label="Balance"
          value={formatMobileLoadCurrency(load.pricing?.balanceAmount)}
          icon={<CircleDollarSign className="size-3" />}
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
          Financial Context
        </p>
        <p className="mt-1.5 break-words text-[11px] leading-relaxed text-muted-foreground">
          Values shown here come from this load&apos;s saved pricing information. Missing amounts are displayed as unavailable rather than estimated.
        </p>
      </div>
    </div>
  );
}