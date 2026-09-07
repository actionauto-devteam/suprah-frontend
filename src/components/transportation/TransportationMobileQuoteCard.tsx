"use client";

import * as React from "react";
import {
  Car,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  Gauge,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useAlert, AlertDialog } from "@/components/AlertDialog";
import { EditQuoteModal } from "@/components/EditQuoteModal";
import type { Quote } from "@/types/transportation";

export type TransportationMobileQuoteTab = "overview" | "vehicle" | "financials";

interface TransportationMobileQuoteCardProps {
  quote: Quote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedQuote: Partial<Quote>) => Promise<void>;
  onInspect: (quote: Quote, tab?: TransportationMobileQuoteTab) => void;
}

const STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  pending: {
    label: "Pending",
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    badge: "border-violet-500/30 bg-violet-500/12 text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  booked: {
    label: "Booked",
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "border-red-500/30 bg-red-500/12 text-red-600 dark:text-red-300",
    dot: "bg-red-500",
  },
};

function QuoteStatTile({
  title,
  icon,
  value,
  valueClassName,
  ariaLabel,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  ariaLabel: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      className="group/stat min-w-0 min-h-14 rounded-xl border border-transparent bg-muted/25 px-2.5 py-2.5 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/6 active:border-emerald-500/40 active:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      <span className="relative block min-w-0 pl-5 pr-3">
        <span className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
          {icon}
        </span>

        <span
          className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-black uppercase tracking-[0.04em] leading-none text-muted-foreground/80 sm:text-xs"
          title={title}
        >
          {title}
        </span>

        <span
          className={cn(
            "mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-black leading-none text-foreground sm:text-[13px]",
            valueClassName,
          )}
        >
          {value}
        </span>

        <ChevronRight className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 text-muted-foreground/60 transition-transform group-active/stat:translate-x-0.5" />
      </span>
    </button>
  );
}

export function TransportationMobileQuoteCard({
  quote,
  onDelete,
  onUpdate,
  onInspect,
}: TransportationMobileQuoteCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const { showAlert, alert, hideAlert } = useAlert();

  const vehicle = quote.vehicleId;
  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.modelName}`
    : quote.vehicleName || "Vehicle not linked";
  const normalizedStatus = String(quote.status || "pending").toLowerCase();
  const statusMeta = STATUS_META[normalizedStatus] ?? STATUS_META.pending;
  const busy = isDeleting;
  const heroImage = !imageFailed ? resolveImageUrl(quote.vehicleImage) : undefined;
  const originSummary =
    [quote.fromLocation?.city, quote.fromLocation?.state].filter(Boolean).join(", ") ||
    quote.fromAddress;
  const destinationSummary =
    [quote.toLocation?.city, quote.toLocation?.state].filter(Boolean).join(", ") ||
    quote.toAddress;

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  const openInspectorSection = (
    event: React.MouseEvent<HTMLButtonElement>,
    tab: TransportationMobileQuoteTab,
  ) => {
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

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Denver",
    });

  return (
    <>
      <AlertDialog {...alert} onOpenChange={hideAlert} />

      <article
        role="button"
        tabIndex={0}
        onClick={() => onInspect(quote, "overview")}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onInspect(quote, "overview");
          }
        }}
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/55 shadow-sm transition-all hover:border-primary/35 hover:bg-card/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex min-w-0 items-stretch">
          <div className="relative w-[30%] min-w-24 max-w-36 shrink-0 overflow-hidden bg-muted/40">
            {heroImage ? (
              <img
                src={heroImage}
                alt={vehicleName}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="h-full min-h-32 w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03] sm:min-h-36"
              />
            ) : (
              <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1.5 bg-linear-to-br from-emerald-950/25 via-card to-cyan-950/20 px-2 text-center sm:min-h-36">
                <Car className="size-6 text-primary/65" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  No photo on file
                </span>
              </div>
            )}
            <div className="absolute left-2 top-2">
              <Badge
                className={cn(
                  "border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
                  "shadow-[0_2px_10px_rgba(0,0,0,0.48)] ring-1 ring-black/10 backdrop-blur-sm",
                  statusMeta.badge,
                )}
              >
                {statusMeta.label}
              </Badge>
            </div>
          </div>

          <div className="min-w-0 flex-1 p-3.5 sm:p-4">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", statusMeta.dot)} />
                  <span className="text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                    Transport Quote
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground/70 sm:inline">
                    · {formatDate(quote.createdAt)}
                  </span>
                </div>
                <h3 className="mt-1 truncate text-[15px] font-black tracking-tight text-foreground sm:text-base">
                  {vehicleName}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-0.5" onClick={stop}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Edit quote"
                  className="size-11 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary touch-manipulation"
                  onClick={(event) => {
                    stop(event);
                    setEditOpen(true);
                  }}
                  disabled={busy}
                >
                  <Edit3 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Delete quote"
                  className="size-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive touch-manipulation"
                  onClick={(event) => {
                    stop(event);
                    handleDelete();
                  }}
                  disabled={busy}
                >
                  {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-emerald-500">
                  <MapPin className="size-3" /> Origin
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {originSummary}
                </p>
              </div>
              <span className="rounded-full bg-muted/60 px-2 py-1 text-[11px] font-mono font-bold text-muted-foreground">
                {Math.round(quote.miles)} MI
              </span>
              <div className="min-w-0 text-right">
                <span className="flex items-center justify-end gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-cyan-500">
                  Destination <MapPin className="size-3" />
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {destinationSummary}
                </p>
              </div>
            </div>

            {/* Match the Load card's 2x2 operational tile language.
                Every quote value is an explicit inspector target. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <QuoteStatTile
                title="Vehicles"
                ariaLabel="View quote vehicle information"
                onClick={(event) => openInspectorSection(event, "vehicle")}
                icon={<Car className="size-2.5 shrink-0 text-emerald-500" />}
                value={`${quote.units ?? 1} UNIT${Number(quote.units ?? 1) !== 1 ? "S" : ""}`}
              />

              <QuoteStatTile
                title="Quote Rate"
                ariaLabel="View quote financial information"
                onClick={(event) => openInspectorSection(event, "financials")}
                icon={<DollarSign className="size-2.5 shrink-0 text-emerald-500" />}
                value={`$${quote.rate.toLocaleString()}`}
                valueClassName="text-emerald-600 dark:text-emerald-400"
              />

              <QuoteStatTile
                title="ETA"
                ariaLabel="View quote overview and transit estimate"
                onClick={(event) => openInspectorSection(event, "overview")}
                icon={<Clock className="size-2.5 shrink-0 text-cyan-500" />}
                value={`${quote.eta.min}–${quote.eta.max} DAYS`}
              />

              <QuoteStatTile
                title="Distance"
                ariaLabel="View quote route and distance"
                onClick={(event) => openInspectorSection(event, "overview")}
                icon={<Gauge className="size-2.5 shrink-0 text-amber-500" />}
                value={`${quote.miles.toLocaleString()} MI`}
              />
            </div>


          </div>
        </div>
      </article>

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