"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  ChevronRight,
  DollarSign,
  Edit3,
  FileText,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/lib/utils";
import { generateLoadPDF } from "@/utils/pdfGenerator";
import { useOrg } from "@/hooks/useOrg";
import type { Load, LoadStatus } from "@/types/load";
import {
  formatMobileLoadCurrency,
  getMobileLoadSchedulePresentation,
  type TransportationMobileLoadTab,
} from "@/components/transportation/TransportationMobileLoadDetailSections";

interface TransportationMobileLoadCardProps {
  load: Load;
  onDelete?: (loadId: string) => void;
  isDeleting?: boolean;
  onInspect: (load: Load, tab?: TransportationMobileLoadTab) => void;
}

const JOURNEY_STATUSES = [
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
  "Delivered",
] as const;

type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

const STATUS_THEME: Record<
  LoadStatus,
  { badge: string; dot: string; bar: string }
> = {
  Draft: {
    badge: "border-slate-500/30 bg-slate-500/12 text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
    bar: "bg-slate-500",
  },
  Posted: {
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  Assigned: {
    badge: "border-blue-500/30 bg-blue-500/12 text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  Accepted: {
    badge: "border-violet-500/30 bg-violet-500/12 text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
  "Picked Up": {
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  "In-Transit": {
    badge: "border-cyan-500/30 bg-cyan-500/12 text-cyan-600 dark:text-cyan-300",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
  Delivered: {
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  Cancelled: {
    badge: "border-red-500/30 bg-red-500/12 text-red-600 dark:text-red-300",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
};

const HERO_STATUS_BADGE: Record<LoadStatus, string> = {
  Draft: "border-white/25 bg-slate-600/95 text-white",
  Posted: "border-emerald-100/60 bg-emerald-400/95 text-emerald-950",
  Assigned: "border-blue-100/50 bg-blue-500/95 text-white",
  Accepted: "border-violet-100/50 bg-violet-500/95 text-white",
  "Picked Up": "border-amber-100/60 bg-amber-400/95 text-amber-950",
  "In-Transit": "border-cyan-100/60 bg-cyan-400/95 text-cyan-950",
  Delivered: "border-emerald-100/50 bg-emerald-500/95 text-white",
  Cancelled: "border-red-100/50 bg-red-500/95 text-white",
};

function normalizeJourney(status: string): JourneyStatus | null {
  return JOURNEY_STATUSES.includes(status as JourneyStatus)
    ? (status as JourneyStatus)
    : null;
}

function MobileStatTile({
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
  ariaLabel?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const content = (
    <span className="relative block min-w-0 pl-5 pr-3">
      <span className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
        {icon}
      </span>

      <span
        className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] sm:text-xs font-black uppercase tracking-[0.04em] leading-none text-muted-foreground/80"
        title={title}
      >
        {title}
      </span>

      <span
        className={cn(
          "mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-[13px] font-black leading-none text-foreground",
          valueClassName,
        )}
      >
        {value}
      </span>

      {onClick ? (
        <ChevronRight className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 text-muted-foreground/60 transition-transform group-active/stat:translate-x-0.5" />
      ) : null}
    </span>
  );

  if (!onClick) {
    return (
      <div className="min-w-0 min-h-14 rounded-xl bg-muted/25 px-2.5 py-2.5 text-left">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      className="group/stat min-w-0 min-h-14 rounded-xl border border-transparent bg-muted/25 px-2.5 py-2.5 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/6 active:border-emerald-500/40 active:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      {content}
    </button>
  );
}

export function TransportationMobileLoadCard({
  load,
  onDelete,
  isDeleting = false,
  onInspect,
}: TransportationMobileLoadCardProps) {
  const router = useRouter();
  const { organization } = useOrg();
  const [isExporting, setIsExporting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeMobileOnlyOverlays = () => {
      if (!media.matches) return;
      setDeleteOpen(false);
    };
    closeMobileOnlyOverlays();
    media.addEventListener("change", closeMobileOnlyOverlays);
    return () => media.removeEventListener("change", closeMobileOnlyOverlays);
  }, []);

  const theme = STATUS_THEME[load.status];
  const vehicles = load.vehicles ?? [];
  const firstVehicle = vehicles.find((vehicle) => Boolean(vehicle.imageUrl)) ?? vehicles[0];
  const heroImage = !imageFailed ? firstVehicle?.imageUrl : undefined;
  const isPublic = load.additionalInfo?.visibility !== "private";
  const isLoadBoard = load.postType === "load-board";
  const schedule = getMobileLoadSchedulePresentation(load);
  const currentJourney = normalizeJourney(load.status);
  const deleteBlocked = load.status === "In-Transit";

  const stop = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const openInspectorSection = (
    event: React.MouseEvent<HTMLButtonElement>,
    tab: TransportationMobileLoadTab,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    onInspect(load, tab);
  };

  const handleExport = (event: React.MouseEvent) => {
    stop(event);
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
        onClick={() => onInspect(load, "overview")}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onInspect(load, "overview");
          }
        }}
        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/55 shadow-sm transition-all hover:border-primary/35 hover:bg-card/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex min-w-0 items-stretch">
          {/* Keep the mobile hero framed like the existing web LoadCard: a
              wider portrait panel with object-cover, scaled down rather than
              squeezed into a narrow strip. This preserves the same visible
              portion of the vehicle much more closely on phones. */}
          <div className="relative w-[30%] min-w-24 max-w-36 shrink-0 overflow-hidden bg-muted/40">
            {heroImage ? (
              <img
                src={heroImage}
                alt="Load vehicle"
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
            <div className="absolute left-2 top-2 z-10">
              <Badge
                className={cn(
                  "border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
                  "shadow-[0_2px_10px_rgba(0,0,0,0.48)] ring-1 ring-black/10 backdrop-blur-sm",
                  HERO_STATUS_BADGE[load.status],
                )}
              >
                {load.status}
              </Badge>
            </div>
          </div>

          <div className="min-w-0 flex-1 p-3.5 sm:p-4">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("size-1.5 shrink-0 rounded-full", theme.dot)} />
                  <span className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                    {isLoadBoard ? (isPublic ? "Public" : "Private") : "Assigned Shipment"}
                  </span>
                </div>
                <h3 className="mt-1 truncate font-mono text-[15px] font-black tracking-tight text-foreground sm:text-base" title={load.loadNumber}>
                  {load.loadNumber}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-0.5" onClick={stop}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary touch-manipulation"
                      onClick={(event) => {
                        stop(event);
                        router.push(`/transportation/load/${load._id}/edit`);
                      }}
                      aria-label="Edit load"
                    >
                      <Edit3 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 rounded-xl text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-500 touch-manipulation"
                      onClick={handleExport}
                      disabled={isExporting}
                      aria-label="View document"
                    >
                      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Document</TooltipContent>
                </Tooltip>

                {onDelete ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 touch-manipulation"
                        onClick={(event) => {
                          stop(event);
                          setDeleteOpen(true);
                        }}
                        disabled={isDeleting || deleteBlocked}
                        aria-label={deleteBlocked ? "In-Transit loads can't be deleted" : "Delete load"}
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {deleteBlocked ? "In-Transit loads can't be deleted" : "Delete"}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="min-w-0">
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-emerald-500">
                  <MapPin className="size-3" /> Origin
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {load.pickupLocation.city}, {load.pickupLocation.state}
                </p>
              </div>
              <div className="rounded-full bg-muted/60 px-2 py-1 text-[11px] font-mono font-bold text-muted-foreground">
                {load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} MI` : "— MI"}
              </div>
              <div className="min-w-0 text-right">
                <span className="flex items-center justify-end gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-cyan-500">
                  Destination <MapPin className="size-3" />
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {load.deliveryLocation.city}, {load.deliveryLocation.state}
                </p>
              </div>
            </div>

            {/* Preserve all four operational values and inspector targets while
                reducing equal-weight boxing so route and pay scan faster. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MobileStatTile
                title="Vehicles"
                ariaLabel="View vehicle information"
                onClick={(event) => openInspectorSection(event, "vehicles")}
                icon={<Car className="size-2.5 shrink-0 text-emerald-500" />}
                value={`${vehicles.length} UNIT${vehicles.length !== 1 ? "S" : ""}`}
              />

              <MobileStatTile
                title="Carrier Pay"
                ariaLabel="View financial information"
                onClick={(event) => openInspectorSection(event, "financials")}
                icon={<DollarSign className="size-2.5 shrink-0 text-emerald-500" />}
                value={formatMobileLoadCurrency(load.pricing?.carrierPayAmount)}
                valueClassName="text-emerald-600 dark:text-emerald-400"
              />

              <MobileStatTile
                title={schedule.tileLabel}
                ariaLabel="View current schedule milestone"
                onClick={(event) => openInspectorSection(event, "overview")}
                icon={
                  <Calendar
                    className={cn(
                      "size-2.5 shrink-0",
                      schedule.tone === "emerald"
                        ? "text-emerald-500"
                        : schedule.tone === "cyan"
                          ? "text-cyan-500"
                          : "text-amber-500",
                    )}
                  />
                }
                value={schedule.displayValue}
              />

              <MobileStatTile
                title="Visibility"
                icon={
                  isPublic ? (
                    <Globe className="size-2.5 shrink-0 text-cyan-500" />
                  ) : (
                    <Lock className="size-2.5 shrink-0 text-muted-foreground" />
                  )
                }
                value={isPublic ? "PUBLIC" : "PRIVATE"}
              />
            </div>

            {load.assignedDriverId &&
            typeof load.assignedDriverId === "object" &&
            load.assignedDriverId.name ? (
              <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <User className="size-3 shrink-0" />
                <span className="truncate font-medium">
                  {load.assignedDriverId.name}
                </span>
              </div>
            ) : null}

            {currentJourney ? (
              <div className="mt-2.5 border-t border-border/35 pt-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.06em] text-muted-foreground">
                    Journey Progress
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      STATUS_THEME[currentJourney].badge,
                    )}
                  >
                    {load.status}
                  </span>
                </div>
                <div
                  className="grid w-full grid-cols-5 gap-1"
                  aria-label={`Journey Progress: current status ${load.status}`}
                >
                  {JOURNEY_STATUSES.map((status) => (
                    <span
                      key={status}
                      title={status === currentJourney ? `${status} — Current` : status}
                      className={cn(
                        "h-1.5 rounded-full",
                        status === currentJourney ? STATUS_THEME[status].bar : "bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>

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