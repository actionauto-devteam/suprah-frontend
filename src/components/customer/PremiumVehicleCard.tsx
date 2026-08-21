"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TruckIcon,
  GaugeIcon,
  MapPinIcon,
  Phone,
  Play,
  CheckCircle2,
  Clock3,
  CalendarClock,
} from "lucide-react";
import { Vehicle } from "@/types/inventory";
import { resolveImageUrl, cn } from "@/lib/utils";
import { VehiclePriceHistoryDialog } from "@/components/VehiclePriceHistoryDialog";

const FALLBACK_IMAGE = "/vehicle-placeholder.jpg";

function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return resolveImageUrl(trimmed)?.trim() || undefined;
}

function rawImageSignature(vehicle: Vehicle) {
  return [vehicle.image, ...(vehicle.images || [])]
    .filter((value): value is string => Boolean(value))
    .join("\u001f");
}

interface PremiumVehicleCardProps {
  vehicle: Vehicle;
  shippingPrice?: number;
  onCheckAvailability?: (vehicle: Vehicle) => void;
  onApplyNow?: (vehicle: Vehicle) => void;
  onCallUs?: (vehicle: Vehicle) => void;
  onVideo?: (vehicle: Vehicle) => void;
  onGetQuote?: (vehicle: Vehicle) => void;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onCreateLoad?: (vehicle: Vehicle) => void;
  /** Show internal All Inventory metadata without changing customer-facing card uses. */
  showInventoryMeta?: boolean;
}

function PremiumVehicleCardComponent({
  vehicle,
  shippingPrice,
  onCheckAvailability,
  onApplyNow,
  onCallUs,
  onVideo,
  onGetQuote,
  onVehicleClick,
  onCreateLoad,
  showInventoryMeta = false,
}: PremiumVehicleCardProps) {
  const imageSignature = rawImageSignature(vehicle);

  const imageCandidates = React.useMemo(() => {
    const realCandidates = [vehicle.image, ...(vehicle.images || [])]
      .map((source) => normalizeImageSrc(source))
      .filter((source): source is string => Boolean(source));

    const uniqueCandidates = Array.from(new Set(realCandidates));
    return uniqueCandidates.length > 0
      ? [...uniqueCandidates, FALLBACK_IMAGE]
      : [FALLBACK_IMAGE];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSignature]);

  const [imageIndex, setImageIndex] = React.useState(0);
  const [imgError, setImgError] = React.useState(false);
  const activeImageSrc = imageCandidates[imageIndex] || FALLBACK_IMAGE;

  React.useEffect(() => {
    setImageIndex(0);
    setImgError(false);
  }, [imageSignature]);

  const handleImageError = () => {
    if (imageIndex < imageCandidates.length - 1) {
      setImageIndex((prev) => prev + 1);
      return;
    }

    setImgError(true);
  };

  const safeEngine = vehicle.engine?.trim() || "Unknown";
  const safeLocation = vehicle.location?.split(",")?.[0]?.trim() || "Unknown";
  const safeMileage = Number.isFinite(vehicle.mileage) ? vehicle.mileage : 0;
  const daysOnLot = Math.max(
    0,
    Number.isFinite(vehicle.daysOnLot) ? Number(vehicle.daysOnLot) : 0,
  );
  const priceUpdatedLabel = React.useMemo(() => {
    if (!vehicle.priceUpdatedAt) return "No price update recorded";
    const date = new Date(vehicle.priceUpdatedAt);
    if (Number.isNaN(date.getTime())) return "No price update recorded";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Denver",
    }).format(date);
  }, [vehicle.priceUpdatedAt]);

  // Mocking "Retail Price" vs "One Time Payment" for the UI showcase
  const retailPrice = vehicle.price + 0; // Mock markup
  const memberPrice = vehicle.price;

  return (
    <Card
      className="group relative overflow-hidden rounded-2xl py-0 bg-card border border-border/60 hover:border-primary/50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 flex flex-col h-full cursor-pointer"
      onClick={() => onVehicleClick?.(vehicle)}
    >
      {/* Premium Image Header */}
      <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
        {imgError ? (
          /* ── Unified fallback: single flex layout, no absolute layer conflicts ── */
          <div className="absolute inset-0 flex flex-col bg-zinc-300 dark:bg-zinc-800">
            {/* Top badges row */}
            <div className="flex gap-2 p-4">
              <Badge className="bg-white/70 text-zinc-900 border-zinc-400/40 font-semibold px-3 py-1 dark:bg-black/30 dark:text-zinc-200 dark:border-zinc-600/30">
                Stock #{vehicle.stockNumber}
              </Badge>
              {vehicle.featured && (
                <Badge className="bg-primary/90 text-primary-foreground border-none font-medium px-3 py-1">
                  Member Exclusive
                </Badge>
              )}
            </div>

            {/* Centred unavailable indicator */}
            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              <TruckIcon className="w-10 h-10 text-zinc-500/50 dark:text-zinc-400/60" />
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Image unavailable
              </span>
            </div>

            {/* Bottom: title + monthly badge — dark strip for contrast in both modes */}
            <div className="flex items-end justify-between gap-2 px-4 py-3 bg-black/20 dark:bg-black/40">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight drop-shadow-sm truncate">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-zinc-800 dark:text-zinc-300 font-semibold text-sm capitalize tracking-wide truncate">
                  {vehicle.model}
                  {vehicle.trim && ` - ${vehicle.trim}`}
                </p>
              </div>
              <div className="shrink-0 bg-white/60 dark:bg-black/40 rounded-xl px-3 py-2 border border-zinc-400/30 dark:border-white/10 text-right">
                <p className="text-xs text-zinc-700 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Est. Monthly
                </p>
                <p className="text-lg font-extrabold text-primary">
                  ${Math.floor(memberPrice / 60)}
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    /mo
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <img
              key={`${vehicle.id}-${imageIndex}`}
              src={activeImageSrc}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={handleImageError}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Sleek Overlay Gradient */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <Badge className="bg-black/65 hover:bg-black/75 text-white backdrop-blur-md border-white/20 font-semibold px-3 py-1">
                Stock #{vehicle.stockNumber}
              </Badge>
              {vehicle.featured && (
                <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-md border-none font-medium px-3 py-1">
                  Member Exclusive
                </Badge>
              )}
            </div>

            {/* Bottom Image Overlay Details */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-linear-to-t from-black/95 via-black/60 via-60% to-transparent px-4 pb-3.5 pt-10">
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md leading-tight truncate">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-zinc-100/95 font-semibold text-lg capitalize tracking-wide truncate">
                  {vehicle.model}
                  {vehicle.trim && ` - ${vehicle.trim}`}
                </p>
              </div>
              <div className="shrink-0 bg-black/40 backdrop-blur-md rounded-xl p-2 border border-white/10 text-right">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Est. Monthly
                </p>
                <p className="text-xl font-bold text-primary">
                  ${Math.floor(memberPrice / 60)}
                  <span className="text-sm font-medium text-zinc-300">/mo</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 bg-linear-to-b from-transparent to-muted/30">
        {/* Core Specs Grid */}
        <div
          className={cn(
            "grid items-stretch py-4 border-b border-border/50 mb-4",
            showInventoryMeta ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          <div className="flex min-w-0 flex-col items-center border-r border-border/50 px-1">
            <GaugeIcon className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-full">
              {safeMileage.toLocaleString()} mi
            </span>
          </div>

          {showInventoryMeta && (
            <div className="flex min-w-0 flex-col items-center border-r border-border/50 px-1">
              <Clock3 className="w-4 h-4 text-primary/70 mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                {daysOnLot}d
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wide text-center leading-tight">
                Days on lot
              </span>
            </div>
          )}

          <div className="flex min-w-0 flex-col items-center border-r border-border/50 px-1">
            <div className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider mb-1">
              Eng
            </div>
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-full">
              {safeEngine}
            </span>
          </div>

          <div className="flex min-w-0 flex-col items-center px-1">
            <MapPinIcon className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-full">
              {safeLocation}
            </span>
          </div>
        </div>

        {/* Financials Box */}
        <div className="bg-muted/40 rounded-xl p-4 mb-6 border border-border/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground font-medium">
              Retail Price:
            </span>
            <span className="text-muted-foreground/70 font-bold line-through decoration-2 text-lg">
              ${retailPrice.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center bg-primary/8 dark:bg-primary/12 -mx-2 px-2 py-2 rounded-lg border-l-4 border-primary">
            <span className="text-foreground font-bold tracking-tight">
              One Time Payment:
            </span>
            <span className="text-2xl font-extrabold text-primary">
              ${memberPrice.toLocaleString()}
            </span>
          </div>

          {showInventoryMeta && (
            <div
              className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="flex items-center gap-1 font-medium">
                <CalendarClock className="h-3.5 w-3.5 text-primary/70" />
                Price update recorded
              </span>
              <VehiclePriceHistoryDialog
                vehicle={vehicle}
                triggerLabel={priceUpdatedLabel}
                triggerClassName="font-semibold text-foreground/80 tabular-nums"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className="mt-auto flex flex-col gap-2 sm:gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <Button
              onClick={() => onCheckAvailability?.(vehicle)}
              variant="outline"
              className="w-full text-xs sm:text-sm h-11 border-border/60 hover:bg-muted font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 sm:mr-2 text-blue-500 shrink-0" />
              Availability
            </Button>
            <Button
              onClick={() => onVideo?.(vehicle)}
              variant="outline"
              className="w-full text-xs sm:text-sm h-11 border-border/60 hover:bg-muted font-semibold"
            >
              <Play className="w-4 h-4 mr-1.5 sm:mr-2 text-red-500 shrink-0" /> Video
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <Button
              onClick={() => onApplyNow?.(vehicle)}
              className="w-full text-xs sm:text-sm h-11 font-semibold shadow-md"
            >
              Apply Now
            </Button>
            <Button
              onClick={() => onCallUs?.(vehicle)}
              variant="outline"
              className="w-full text-xs sm:text-sm h-11 border-border/60 hover:bg-muted font-semibold"
            >
              <Phone className="w-4 h-4 mr-1.5 sm:mr-2 text-primary shrink-0" /> Call Us
            </Button>
          </div>

          <Button
            onClick={() => (onCreateLoad || onGetQuote)?.(vehicle)}
            className="w-full shadow-md active:scale-[0.99] transition-all"
          >
            <TruckIcon className="w-4 h-4 mr-2" /> Create Managed Load
          </Button>
        </div>
      </div>
    </Card>
  );
}

export const PremiumVehicleCard = React.memo(
  PremiumVehicleCardComponent,
  (prev, next) => {
    const a = prev.vehicle;
    const b = next.vehicle;

    return (
      a.id === b.id &&
      a.year === b.year &&
      a.make === b.make &&
      a.model === b.model &&
      a.trim === b.trim &&
      a.price === b.price &&
      a.mileage === b.mileage &&
      a.engine === b.engine &&
      a.location === b.location &&
      a.status === b.status &&
      a.image === b.image &&
      rawImageSignature(a) === rawImageSignature(b) &&
      a.stockNumber === b.stockNumber &&
      a.featured === b.featured &&
      a.daysOnLot === b.daysOnLot &&
      a.priceUpdatedAt === b.priceUpdatedAt &&
      prev.showInventoryMeta === next.showInventoryMeta &&
      prev.shippingPrice === next.shippingPrice &&
      prev.onCheckAvailability === next.onCheckAvailability &&
      prev.onApplyNow === next.onApplyNow &&
      prev.onCallUs === next.onCallUs &&
      prev.onVideo === next.onVideo &&
      prev.onGetQuote === next.onGetQuote &&
      prev.onVehicleClick === next.onVehicleClick &&
      prev.onCreateLoad === next.onCreateLoad
    );
  },
);