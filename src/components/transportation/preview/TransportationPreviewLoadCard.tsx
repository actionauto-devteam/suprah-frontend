"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Car,
  ChevronRight,
  DollarSign,
  Edit3,
  FileText,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";
import { getLoadDeleteBlockReason } from "@/lib/load-delete-policy";
import { loadStatusTone, type PreviewTone } from "@/lib/load-status-tone";
import { generateLoadPDF } from "@/utils/pdfGenerator";
import { useOrg } from "@/hooks/useOrg";
import type { Load } from "@/types/load";
import {
  formatMobileLoadCurrency,
  getMobileLoadSchedulePresentation,
  type TransportationMobileLoadTab,
} from "@/components/transportation/TransportationMobileLoadDetailSections";
import {
  VehicleImageLightbox,
  type VehicleImageLightboxItem,
} from "@/components/transportation/VehicleImageLightbox";
import { previewStyles, previewTone } from "@/components/mobile-preview/MobilePreviewScope";

interface TransportationPreviewLoadCardProps {
  load: Load;
  /** Kept for parity with TransportationMobileLoadCard; the new card looks the same in both views. */
  presentation: "shipments" | "load-board";
  onDelete?: (loadId: string) => void;
  isDeleting?: boolean;
  onInspect: (load: Load, tab?: TransportationMobileLoadTab) => void;
}

const JOURNEY_STATUSES = ["Assigned", "Accepted", "Picked Up", "In-Transit", "Delivered"] as const;

const SCHEDULE_TONE: Record<"emerald" | "cyan" | "amber", PreviewTone> = {
  emerald: "mint",
  cyan: "blue",
  amber: "amber",
};

const iconButtonClass =
  "flex size-11 items-center justify-center rounded-xl text-[var(--mp-muted)] transition-colors hover:bg-[var(--mp-surface-2)] hover:text-[var(--mp-ink)] disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)] touch-manipulation";

const tapAreaClass =
  "rounded-lg text-left transition-colors hover:bg-[var(--mp-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]";

/**
 * Load card in the phone redesign (deck slide 8). Same data and actions as
 * TransportationMobileLoadCard; only the arrangement and styling differ.
 */
export function TransportationPreviewLoadCard({
  load,
  onDelete,
  isDeleting = false,
  onInspect,
}: TransportationPreviewLoadCardProps) {
  const router = useRouter();
  const { organization } = useOrg();
  const [isExporting, setIsExporting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageViewerOpen, setImageViewerOpen] = React.useState(false);
  const [imageViewerIndex, setImageViewerIndex] = React.useState(0);

  const tone = previewTone(loadStatusTone(load.status));
  const vehicles = load.vehicles ?? [];
  const firstVehicle = vehicles.find((vehicle) => Boolean(vehicle.imageUrl)) ?? vehicles[0];
  const firstVehicleIndex = firstVehicle ? Math.max(0, vehicles.indexOf(firstVehicle)) : 0;
  const heroImage = !imageFailed ? firstVehicle?.imageUrl : undefined;
  const imageViewerItems: VehicleImageLightboxItem[] = vehicles.map((vehicle, index) => ({
    id: String(vehicle.vehicleId ?? vehicle.vin ?? `vehicle-${index + 1}`),
    src: vehicle.imageUrl || undefined,
    label:
      [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ").trim() ||
      `Vehicle ${index + 1}`,
    subtitle: vehicle.vin ? `VIN ${vehicle.vin}` : undefined,
  }));
  const isPublic = load.additionalInfo?.visibility !== "private";
  const isDirectAssignment = load.postType === "assign-carrier";
  const pricingEnabled = load.pricing?.isPricingEnabled !== false;
  const schedule = getMobileLoadSchedulePresentation(load);
  const scheduleTone = previewTone(SCHEDULE_TONE[schedule.tone]);
  const journeyIndex = JOURNEY_STATUSES.indexOf(load.status as (typeof JOURNEY_STATUSES)[number]);
  const deleteBlockReason = getLoadDeleteBlockReason(load);
  const driverName =
    load.assignedDriverId && typeof load.assignedDriverId === "object"
      ? load.assignedDriverId.name
      : undefined;
  const unitCount = vehicles.length;

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeMobileOnlyOverlays = () => {
      if (media.matches) setDeleteOpen(false);
    };
    closeMobileOnlyOverlays();
    media.addEventListener("change", closeMobileOnlyOverlays);
    return () => media.removeEventListener("change", closeMobileOnlyOverlays);
  }, []);

  const inspect = (event: React.MouseEvent, tab: TransportationMobileLoadTab) => {
    event.stopPropagation();
    event.preventDefault();
    onInspect(load, tab);
  };

  const handleExport = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExporting(true);
    try {
      generateLoadPDF(load, organization?.name || "Your Dealership");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        aria-label={`Load ${load.loadNumber}, ${load.status}`}
        onClick={() => onInspect(load, "overview")}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onInspect(load, "overview");
          }
        }}
        className={cn(
          tone.tone,
          tone.line,
          "rounded-[18px] border bg-[var(--mp-surface)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
        )}
      >
        {/* Photo, load number, status */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="View full vehicle image"
            title={heroImage ? undefined : "No photo on file"}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setImageViewerIndex(firstVehicleIndex);
              setImageViewerOpen(true);
            }}
            className={cn(
              tone.soft,
              "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
            )}
          >
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt="Load vehicle"
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="size-full object-cover"
              />
            ) : (
              <Car className={cn("size-6", tone.text)} aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(previewStyles.mono, "truncate text-[17px] font-semibold text-[var(--mp-ink)]")}
                title={load.loadNumber}
              >
                {load.loadNumber}
              </h3>
              <span
                className={cn(
                  tone.pill,
                  previewStyles.mono,
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                  load.status === "Cancelled" && "line-through",
                )}
              >
                {load.status}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--mp-muted)]">
              <span>{isPublic ? "Public" : "Private"}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                aria-label="View vehicle information"
                onClick={(event) => inspect(event, "vehicles")}
                className={cn(tapAreaClass, "-mx-1 min-h-8 px-1 underline-offset-2 hover:underline")}
              >
                {unitCount} unit{unitCount === 1 ? "" : "s"}
              </button>
            </p>
          </div>
        </div>

        {/* Origin -> distance -> destination */}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <button
            type="button"
            aria-label="View origin details"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "min-w-0 px-1 py-1")}
          >
            <span className={cn(previewStyles.mono, "block text-[11px] uppercase tracking-[0.14em] text-[var(--mp-muted)]")}>
              Origin
            </span>
            <span className="block truncate text-[17px] font-semibold text-[var(--mp-ink)]">
              {load.pickupLocation.city}, {load.pickupLocation.state}
            </span>
          </button>
          <button
            type="button"
            aria-label="View route distance"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "flex flex-col items-center px-1 py-1")}
          >
            <span className={cn(previewStyles.mono, tone.text, "text-xs")}>
              {load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} MI` : "— MI"}
            </span>
            <ArrowRight className={cn("size-5", tone.text)} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="View destination details"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "min-w-0 px-1 py-1 text-right")}
          >
            <span className={cn(previewStyles.mono, "block text-[11px] uppercase tracking-[0.14em] text-[var(--mp-muted)]")}>
              Destination
            </span>
            <span className="block truncate text-[17px] font-semibold text-[var(--mp-ink)]">
              {load.deliveryLocation.city}, {load.deliveryLocation.state}
            </span>
          </button>
        </div>

        {/* Journey progress: Assigned -> Delivered, same steps as today */}
        {journeyIndex >= 0 ? (
          <div
            role="img"
            aria-label={`Journey progress: step ${journeyIndex + 1} of ${JOURNEY_STATUSES.length}, ${load.status}`}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--mp-surface-2)]"
          >
            <div
              className={cn(tone.fill, "h-full rounded-full")}
              style={{ width: `${((journeyIndex + 1) / JOURNEY_STATUSES.length) * 100}%` }}
            />
          </div>
        ) : null}

        {/* Pay and schedule */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <button
            type="button"
            aria-label="View financial information"
            onClick={(event) => inspect(event, "financials")}
            className={cn(tapAreaClass, "-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-[var(--mp-ink)]")}
          >
            <DollarSign className="size-4 text-[var(--mp-muted)]" aria-hidden="true" />
            {isDirectAssignment ? "Total driver pay" : "Carrier pay"}
            <span className={cn(previewStyles.mono, "font-semibold", pricingEnabled ? tone.text : "text-[var(--mp-muted)]")}>
              {pricingEnabled ? formatMobileLoadCurrency(load.pricing?.carrierPayAmount) : "Not provided"}
            </span>
          </button>
          <button
            type="button"
            aria-label="View current schedule milestone"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-sm text-[var(--mp-muted)]")}
          >
            <Calendar className={cn("size-3.5", scheduleTone.tone, scheduleTone.text)} aria-hidden="true" />
            <span>{schedule.tileLabel}:</span>
            <span className="font-medium text-[var(--mp-ink)]">{schedule.displayValue}</span>
          </button>
        </div>

        {driverName ? (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--mp-muted)]">
            <User className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{driverName} assigned</span>
          </p>
        ) : null}

        {/* Actions: same as today's card, plus an explicit Details link */}
        <div
          className="mt-2 flex items-center justify-between border-t border-[var(--mp-hairline)] pt-2"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Edit load"
              title="Edit"
              onClick={() => router.push(`/transportation/load/${load._id}/edit`)}
              className={iconButtonClass}
            >
              <Edit3 className="size-4" />
            </button>
            <button
              type="button"
              aria-label="View document"
              title="View Document"
              onClick={handleExport}
              disabled={isExporting}
              className={iconButtonClass}
            >
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            </button>
            {onDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      type="button"
                      aria-label={deleteBlockReason ?? "Delete load"}
                      onClick={() => setDeleteOpen(true)}
                      disabled={isDeleting || deleteBlockReason !== null}
                      className={cn(iconButtonClass, "hover:text-[var(--mp-danger)]")}
                    >
                      {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{deleteBlockReason ?? "Delete"}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onInspect(load, "overview")}
            className="flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-[15px] font-semibold text-[var(--mp-mint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
          >
            Details
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </article>

      <VehicleImageLightbox
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        items={imageViewerItems}
        initialIndex={imageViewerIndex}
      />

      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete?.(load._id);
        }}
        title="Delete Load"
        description={`Are you sure you want to delete load ${load.loadNumber}? This action cannot be undone.`}
        confirmText="Yes, Delete Load"
        variant="danger"
      />
    </>
  );
}
