"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  ChevronRight,
  Maximize2,
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
import {
  VehicleImageLightbox,
  type VehicleImageLightboxItem,
} from "@/components/transportation/VehicleImageLightbox";

interface TransportationMobileLoadCardProps {
  load: Load;
  presentation: "shipments" | "load-board";
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

function MobilePrimaryReadout({
  eyebrow,
  title,
  icon,
  value,
  valueClassName,
  tone = "emerald",
  ariaLabel,
  onClick,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  tone?: "emerald" | "cyan" | "amber" | "neutral";
  ariaLabel: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const toneClass =
    tone === "neutral"
      ? "border-border/30 bg-muted/16 hover:border-slate-400/85 hover:bg-slate-100/85 hover:shadow-[0_0_0_2px_rgba(100,116,139,0.12)] active:border-slate-500 active:bg-slate-200/80 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] dark:active:border-white/40 dark:active:bg-white/14"
      : tone === "cyan"
        ? "border-cyan-500/45 bg-linear-to-r from-cyan-500/14 via-cyan-500/7 to-background shadow-[0_8px_24px_rgba(6,182,212,0.08)] hover:border-cyan-500/90 hover:bg-cyan-50/95 hover:shadow-[0_0_0_2px_rgba(6,182,212,0.16),0_10px_28px_rgba(6,182,212,0.14)] active:border-cyan-600 active:bg-cyan-100/90 dark:hover:border-cyan-300/70 dark:hover:bg-cyan-500/18 dark:hover:shadow-[0_0_0_2px_rgba(34,211,238,0.10),0_10px_28px_rgba(6,182,212,0.16)] dark:active:border-cyan-300 dark:active:bg-cyan-500/24"
        : tone === "amber"
          ? "border-amber-500/45 bg-linear-to-r from-amber-500/14 via-amber-500/7 to-background shadow-[0_8px_24px_rgba(245,158,11,0.08)] hover:border-amber-500/90 hover:bg-amber-50/95 hover:shadow-[0_0_0_2px_rgba(245,158,11,0.16),0_10px_28px_rgba(245,158,11,0.14)] active:border-amber-600 active:bg-amber-100/90 dark:hover:border-amber-300/70 dark:hover:bg-amber-500/18 dark:hover:shadow-[0_0_0_2px_rgba(251,191,36,0.10),0_10px_28px_rgba(245,158,11,0.16)] dark:active:border-amber-300 dark:active:bg-amber-500/24"
          : "border-emerald-500/45 bg-linear-to-r from-emerald-500/14 via-emerald-500/7 to-cyan-500/5 shadow-[0_8px_24px_rgba(16,185,129,0.08)] hover:border-emerald-500/90 hover:bg-emerald-50/95 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.16),0_10px_28px_rgba(16,185,129,0.14)] active:border-emerald-600 active:bg-emerald-100/90 dark:hover:border-emerald-300/70 dark:hover:bg-emerald-500/18 dark:hover:shadow-[0_0_0_2px_rgba(52,211,153,0.10),0_10px_28px_rgba(16,185,129,0.16)] dark:active:border-emerald-300 dark:active:bg-emerald-500/24";

  const accentClass =
    tone === "neutral"
      ? "bg-border/60"
      : tone === "cyan"
        ? "bg-cyan-400"
        : tone === "amber"
          ? "bg-amber-400"
          : "bg-emerald-400";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      className={cn(
        "group/focus relative min-h-[66px] w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all",
        "active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
        toneClass,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-0.5", accentClass)} />

      <span className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground/70">
          {eyebrow}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/65 transition-transform group-active/focus:translate-x-0.5" />
      </span>

      <span className="mt-1.5 flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-background/45">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[10px] font-black uppercase tracking-[0.07em] text-muted-foreground"
            title={title}
          >
            {title}
          </span>
          <span
            className={cn(
              "mt-0.5 block break-words text-[15px] font-black leading-tight tracking-tight text-foreground",
              valueClassName,
            )}
          >
            {value}
          </span>
        </span>
      </span>
    </button>
  );
}

function MobileSupportMetric({
  title,
  icon,
  value,
  valueClassName,
  ariaLabel,
  onClick,
  className,
  tone = "neutral",
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  valueClassName?: string;
  ariaLabel?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  tone?: "neutral" | "emerald" | "cyan" | "amber";
}) {
  const interactionClass =
    tone === "emerald"
      ? "hover:border-emerald-500/85 hover:bg-emerald-50 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.12)] active:border-emerald-600 active:bg-emerald-100/90 dark:hover:border-emerald-300/65 dark:hover:bg-emerald-500/16 dark:hover:shadow-[0_0_0_2px_rgba(52,211,153,0.08)] dark:active:border-emerald-300 dark:active:bg-emerald-500/24 focus-visible:ring-emerald-500/50"
      : tone === "cyan"
        ? "hover:border-cyan-500/85 hover:bg-cyan-50 hover:shadow-[0_0_0_2px_rgba(6,182,212,0.12)] active:border-cyan-600 active:bg-cyan-100/90 dark:hover:border-cyan-300/65 dark:hover:bg-cyan-500/16 dark:hover:shadow-[0_0_0_2px_rgba(34,211,238,0.08)] dark:active:border-cyan-300 dark:active:bg-cyan-500/24 focus-visible:ring-cyan-500/50"
        : tone === "amber"
          ? "hover:border-amber-500/85 hover:bg-amber-50 hover:shadow-[0_0_0_2px_rgba(245,158,11,0.12)] active:border-amber-600 active:bg-amber-100/90 dark:hover:border-amber-300/65 dark:hover:bg-amber-500/16 dark:hover:shadow-[0_0_0_2px_rgba(251,191,36,0.08)] dark:active:border-amber-300 dark:active:bg-amber-500/24 focus-visible:ring-amber-500/50"
          : "hover:border-slate-400/85 hover:bg-slate-100/90 hover:shadow-[0_0_0_2px_rgba(100,116,139,0.10)] active:border-slate-500 active:bg-slate-200/90 dark:hover:border-white/28 dark:hover:bg-white/10 dark:hover:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] dark:active:border-white/40 dark:active:bg-white/14 focus-visible:ring-primary/45";
  const content = (
    <>
      <span className="flex min-w-0 items-center justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1">
          {icon}
          <span
            className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-muted-foreground/75"
            title={title}
          >
            {title}
          </span>
        </span>
        {onClick ? (
          <ChevronRight className="size-2.5 shrink-0 text-muted-foreground/45" />
        ) : null}
      </span>

      <span
        className={cn(
          "mt-1.5 block break-words text-[11px] font-black leading-[1.08] text-foreground",
          valueClassName,
        )}
      >
        {value}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "min-w-0 min-h-[58px] rounded-lg border border-border/20 bg-muted/14 px-2 py-2",
          className,
        )}
      >
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
      className={cn(
        "min-w-0 min-h-[58px] rounded-lg border border-border/20 bg-muted/14 px-2 py-2 text-left transition-[background-color,border-color,box-shadow,transform] duration-150",
        "active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2",
        interactionClass,
        className,
      )}
    >
      {content}
    </button>
  );
}

export function TransportationMobileLoadCard({
  load,
  presentation,
  onDelete,
  isDeleting = false,
  onInspect,
}: TransportationMobileLoadCardProps) {
  const router = useRouter();
  const { organization } = useOrg();
  const [isExporting, setIsExporting] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const [imageViewerOpen, setImageViewerOpen] = React.useState(false);
  const [imageViewerIndex, setImageViewerIndex] = React.useState(0);

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
  // Presentation must follow the workspace the user is currently viewing,
  // not each load record's historical postType. Otherwise cards inside the
  // same Board can render different metric order/hierarchy.
  const isLoadBoard = presentation === "load-board";
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

        <div className="min-w-0">
          {/* Mobile-first vehicle hero:
              keep the image above the data so the entire vehicle can be shown
              without the narrow side-rail crop. */}
          <div className="relative h-44 w-full overflow-hidden border-b border-border/50 bg-muted/40 sm:h-52">
            <button
              type="button"
              aria-label="View full vehicle image"
              className="group/image block h-full w-full text-left transition-[box-shadow,filter] duration-150 hover:ring-2 hover:ring-inset hover:ring-emerald-500/70 hover:brightness-[1.06] active:ring-emerald-600 active:brightness-[0.97] dark:hover:ring-emerald-300/55 dark:hover:brightness-[1.10] dark:active:ring-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setImageViewerIndex(firstVehicleIndex);
                setImageViewerOpen(true);
              }}
            >
              {heroImage ? (
                <img
                  src={heroImage}
                  alt="Load vehicle"
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className="h-full w-full bg-black/10 object-contain object-center p-2 transition-transform duration-300 group-hover/image:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-linear-to-br from-emerald-950/25 via-card to-cyan-950/20 px-2 text-center">
                  <Car className="size-6 text-primary/65" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    No photo on file
                  </span>
                </div>
              )}
              <span className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors group-hover/image:bg-black/75">
                <Maximize2 className="size-3.5" />
              </span>
            </button>

            <div className="pointer-events-none absolute left-2 top-2 z-10">
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

            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2">
              <button
                type="button"
                aria-label="View origin details"
                onClick={(event) => openInspectorSection(event, "overview")}
                className="min-w-0 rounded-xl border border-transparent px-2 py-1.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-emerald-500/85 hover:bg-emerald-50 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.12)] active:scale-[0.985] active:border-emerald-600 active:bg-emerald-100/90 dark:hover:border-emerald-300/65 dark:hover:bg-emerald-500/16 dark:hover:shadow-[0_0_0_2px_rgba(52,211,153,0.08)] dark:active:border-emerald-300 dark:active:bg-emerald-500/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-emerald-500">
                  <MapPin className="size-3" /> Origin
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {load.pickupLocation.city}, {load.pickupLocation.state}
                </p>
              </button>

              <button
                type="button"
                aria-label="View route distance"
                onClick={(event) => openInspectorSection(event, "overview")}
                className="self-center rounded-full border border-transparent bg-muted/60 px-2 py-1 text-[11px] font-mono font-bold text-muted-foreground transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-amber-500/80 hover:bg-amber-50 hover:text-amber-700 hover:shadow-[0_0_0_2px_rgba(245,158,11,0.10)] active:scale-[0.96] active:border-amber-600 active:bg-amber-100/90 dark:hover:border-amber-300/60 dark:hover:bg-amber-500/16 dark:hover:text-amber-200 dark:hover:shadow-[0_0_0_2px_rgba(251,191,36,0.07)] dark:active:border-amber-300 dark:active:bg-amber-500/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35 dark:hover:text-amber-300"
              >
                {load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} MI` : "— MI"}
              </button>

              <button
                type="button"
                aria-label="View destination details"
                onClick={(event) => openInspectorSection(event, "overview")}
                className="min-w-0 rounded-xl border border-transparent px-2 py-1.5 text-right transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-cyan-500/85 hover:bg-cyan-50 hover:shadow-[0_0_0_2px_rgba(6,182,212,0.12)] active:scale-[0.985] active:border-cyan-600 active:bg-cyan-100/90 dark:hover:border-cyan-300/65 dark:hover:bg-cyan-500/16 dark:hover:shadow-[0_0_0_2px_rgba(34,211,238,0.08)] dark:active:border-cyan-300 dark:active:bg-cyan-500/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                <span className="flex items-center justify-end gap-1 text-[11px] font-black uppercase tracking-[0.06em] text-cyan-500">
                  Destination <MapPin className="size-3" />
                </span>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {load.deliveryLocation.city}, {load.deliveryLocation.state}
                </p>
              </button>
            </div>

            {/* Fixed 2x2 metric grid shared by My Loads and Board.
                Keeping the same positions in both workspaces avoids visual
                re-learning when the user switches views:
                  Vehicles      | Carrier Pay
                  Schedule      | Visibility */}
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <MobileSupportMetric
                title="Vehicles"
                ariaLabel="View vehicle information"
                onClick={(event) => openInspectorSection(event, "vehicles")}
                icon={<Car className="size-2.5 shrink-0 text-emerald-500" />}
                value={`${vehicles.length} UNIT${vehicles.length !== 1 ? "S" : ""}`}
                tone="emerald"
              />

              <MobileSupportMetric
                title="Carrier Pay"
                ariaLabel="View financial information"
                onClick={(event) => openInspectorSection(event, "financials")}
                icon={<DollarSign className="size-2.5 shrink-0 text-muted-foreground" />}
                value={formatMobileLoadCurrency(load.pricing?.carrierPayAmount)}
                valueClassName="text-foreground"
                tone="neutral"
              />

              <MobileSupportMetric
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
                tone={schedule.tone}
                className={
                  schedule.tone === "cyan"
                    ? "border-cyan-500/20 bg-cyan-500/4"
                    : schedule.tone === "amber"
                      ? "border-amber-500/20 bg-amber-500/4"
                      : "border-emerald-500/20 bg-emerald-500/4"
                }
              />

              <MobileSupportMetric
                title="Visibility"
                icon={
                  isPublic ? (
                    <Globe className="size-2.5 shrink-0 text-cyan-500" />
                  ) : (
                    <Lock className="size-2.5 shrink-0 text-muted-foreground" />
                  )
                }
                value={isPublic ? "PUBLIC" : "PRIVATE"}
                tone={isPublic ? "cyan" : "neutral"}
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
              <div className="mt-2.5 border-t border-border/20 pt-2.5">
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