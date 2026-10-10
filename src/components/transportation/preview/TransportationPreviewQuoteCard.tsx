"use client";

import * as React from "react";
import {
  ArrowRight,
  Car,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  Gauge,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { quoteStatusTone } from "@/lib/load-status-tone";
import { useAlert, AlertDialog } from "@/components/AlertDialog";
import { EditQuoteModal } from "@/components/EditQuoteModal";
import type { Quote } from "@/types/transportation";
import type { TransportationMobileQuoteTab } from "@/components/transportation/TransportationMobileQuoteCard";
import {
  VehicleImageLightbox,
  type VehicleImageLightboxItem,
} from "@/components/transportation/VehicleImageLightbox";
import { previewStyles, previewTone } from "@/components/mobile-preview/MobilePreviewScope";

interface TransportationPreviewQuoteCardProps {
  quote: Quote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedQuote: Partial<Quote>) => Promise<void>;
  onInspect: (quote: Quote, tab?: TransportationMobileQuoteTab) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  booked: "Booked",
  rejected: "Rejected",
};

const iconButtonClass =
  "flex size-11 items-center justify-center rounded-xl text-[var(--mp-muted)] transition-colors hover:bg-[var(--mp-surface-2)] hover:text-[var(--mp-ink)] disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)] touch-manipulation";

const tapAreaClass =
  "rounded-lg text-left transition-colors hover:bg-[var(--mp-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });
}

/**
 * Quote card in the phone redesign. Same data and actions as
 * TransportationMobileQuoteCard; only the arrangement and styling differ.
 */
export function TransportationPreviewQuoteCard({
  quote,
  onDelete,
  onUpdate,
  onInspect,
}: TransportationPreviewQuoteCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageViewerOpen, setImageViewerOpen] = React.useState(false);
  const { showAlert, alert, hideAlert } = useAlert();

  const vehicle = quote.vehicleId;
  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
    : quote.vehicleName || "Vehicle not linked";
  const normalizedStatus = String(quote.status || "pending").toLowerCase();
  const statusLabel = STATUS_LABEL[normalizedStatus] ?? STATUS_LABEL.pending;
  const tone = previewTone(quoteStatusTone(STATUS_LABEL[normalizedStatus] ? normalizedStatus : "pending"));
  const heroImage = !imageFailed ? resolveImageUrl(quote.vehicleImage) : undefined;
  const imageViewerItems: VehicleImageLightboxItem[] = [
    {
      id: String(quote.vehicleId?._id ?? quote.vin ?? quote._id),
      src: heroImage,
      label: vehicleName,
      subtitle:
        quote.vin || quote.vehicleId?.vin
          ? `VIN ${quote.vin || quote.vehicleId?.vin}`
          : undefined,
    },
  ];
  const originSummary =
    [quote.fromLocation?.city, quote.fromLocation?.state].filter(Boolean).join(", ") ||
    quote.fromAddress;
  const destinationSummary =
    [quote.toLocation?.city, quote.toLocation?.state].filter(Boolean).join(", ") ||
    quote.toAddress;
  const units = Number(quote.units ?? 1);

  const inspect = (event: React.MouseEvent, tab: TransportationMobileQuoteTab) => {
    event.stopPropagation();
    event.preventDefault();
    onInspect(quote, tab);
  };

  const handleDelete = () => {
    if (isDeleting) return;
    showAlert({
      type: "confirm",
      title: "Delete Quote",
      message: `Are you sure you want to delete this quote for ${quote.firstName} ${quote.lastName}? This action cannot be undone.`,
      confirmText: "Yes, Delete",
      cancelText: "No, Keep Quote",
      onConfirm: async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
          await onDelete(quote._id);
          hideAlert();
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <>
      <AlertDialog {...alert} onOpenChange={hideAlert} />

      <article
        role="button"
        tabIndex={0}
        aria-label={`Quote for ${vehicleName}, ${statusLabel}`}
        onClick={() => onInspect(quote, "overview")}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onInspect(quote, "overview");
          }
        }}
        className={cn(
          tone.tone,
          tone.line,
          "rounded-[18px] border bg-[var(--mp-surface)] p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="View full quote vehicle image"
            title={heroImage ? undefined : "No photo on file"}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
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
                alt={vehicleName}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="size-full object-cover"
              />
            ) : (
              <Car className={cn("size-6", tone.text)} aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <h3 className="line-clamp-2 min-w-0 break-words text-[17px] font-semibold text-[var(--mp-ink)]" title={vehicleName}>
                {vehicleName}
              </h3>
              <span
                className={cn(
                  tone.pill,
                  previewStyles.mono,
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                )}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--mp-muted)]">
              <span>Transport quote</span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(quote.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                aria-label="View quote vehicle information"
                onClick={(event) => inspect(event, "vehicle")}
                className={cn(tapAreaClass, "-mx-1 min-h-8 px-1 underline-offset-2 hover:underline")}
              >
                {units} unit{units === 1 ? "" : "s"}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <button
            type="button"
            aria-label="View quote origin details"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "min-w-0 px-1 py-1")}
          >
            <span className={cn(previewStyles.mono, "block text-[11px] uppercase tracking-[0.14em] text-[var(--mp-muted)]")}>
              Origin
            </span>
            <span className="block line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--mp-ink)] min-[390px]:text-[17px]">{originSummary}</span>
          </button>
          <button
            type="button"
            aria-label="View quote distance"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "flex flex-col items-center px-1 py-1")}
          >
            <span className={cn(previewStyles.mono, tone.text, "text-xs")}>{Math.round(quote.miles)} MI</span>
            <ArrowRight className={cn("size-5", tone.text)} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="View quote destination details"
            onClick={(event) => inspect(event, "overview")}
            className={cn(tapAreaClass, "min-w-0 px-1 py-1 text-right")}
          >
            <span className={cn(previewStyles.mono, "block text-[11px] uppercase tracking-[0.14em] text-[var(--mp-muted)]")}>
              Destination
            </span>
            <span className="block line-clamp-2 break-words text-[15px] font-semibold leading-snug text-[var(--mp-ink)] min-[390px]:text-[17px]">{destinationSummary}</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <button
            type="button"
            aria-label="View quote financial information"
            onClick={(event) => inspect(event, "financials")}
            className={cn(tapAreaClass, "-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-[15px] text-[var(--mp-ink)]")}
          >
            <DollarSign className="size-4 text-[var(--mp-muted)]" aria-hidden="true" />
            Quote rate
            <span className={cn(previewStyles.mono, "font-semibold text-[var(--mp-mint)]")}>
              ${quote.rate.toLocaleString()}
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="View quote overview and transit estimate"
              onClick={(event) => inspect(event, "overview")}
              className={cn(tapAreaClass, "-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-sm text-[var(--mp-muted)]")}
            >
              <Clock className="size-3.5" aria-hidden="true" />
              ETA <span className="font-medium text-[var(--mp-ink)]">{quote.eta.min}–{quote.eta.max} days</span>
            </button>
            <button
              type="button"
              aria-label="View quote route and distance"
              onClick={(event) => inspect(event, "overview")}
              className={cn(tapAreaClass, "-mx-1 flex min-h-11 items-center gap-1.5 px-1 text-sm text-[var(--mp-muted)]")}
            >
              <Gauge className="size-3.5" aria-hidden="true" />
              <span className={cn(previewStyles.mono, "text-[var(--mp-ink)]")}>{quote.miles.toLocaleString()} mi</span>
            </button>
          </div>
        </div>

        <div
          className="mt-2 flex items-center justify-between border-t border-[var(--mp-hairline)] pt-2"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Edit quote"
              title="Edit quote"
              onClick={() => setEditOpen(true)}
              disabled={isDeleting}
              className={iconButtonClass}
            >
              <Edit3 className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Delete quote"
              title="Delete quote"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(iconButtonClass, "hover:text-[var(--mp-danger)]")}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onInspect(quote, "overview")}
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
        initialIndex={0}
      />

      <EditQuoteModal
        quote={quote}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={async (updatedQuote) => {
          await onUpdate(quote._id, updatedQuote);
          showAlert({
            type: "success",
            title: "Quote Updated",
            message: "The quote has been successfully updated.",
          });
        }}
      />
    </>
  );
}
