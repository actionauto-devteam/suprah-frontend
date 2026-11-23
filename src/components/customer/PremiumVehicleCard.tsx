"use client";

import { VehiclePhotoPlaceholder } from "@/components/inventory/VehiclePhotoPlaceholder";

import { rememberedPhotoIndex, rememberPhoto } from "@/lib/vehicle-photo-cache";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TruckIcon,
  GaugeIcon,
  MapPinIcon,
  Play,
  CheckCircle2,
  Clock3,
  CalendarClock,
} from "lucide-react";
import { Vehicle } from "@/types/inventory";
import { resolveImageUrl, cn } from "@/lib/utils";
import { VehiclePriceHistoryDialog } from "@/components/VehiclePriceHistoryDialog";

const FALLBACK_IMAGE = "/vehicle-placeholder.jpg";
/** Badges over the photo wrap onto more lines instead of running off the card. */
const WRAPPING_BADGE = "h-auto max-w-full shrink whitespace-normal text-left break-words [overflow-wrap:anywhere]";

const IMAGE_LOAD_TIMEOUT_MS = 7_000;

function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

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
  onVideo?: (vehicle: Vehicle) => void;
  onGetQuote?: (vehicle: Vehicle) => void;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onCreateLoad?: (vehicle: Vehicle) => void;
  /** Show internal All Inventory metadata without changing customer-facing card uses. */
  showInventoryMeta?: boolean;
  /**
   * Preserve the existing eager/high-priority behavior by default for callers
   * outside All Inventory. Inventory can opt lower rows into lazy loading.
   */
  imagePriority?: boolean;
}

function PremiumVehicleCardComponent({
  vehicle,
  shippingPrice,
  onCheckAvailability,
  onApplyNow,
  onVideo,
  onGetQuote,
  onVehicleClick,
  onCreateLoad,
  showInventoryMeta = false,
  imagePriority = true,
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

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [imageIndex, setImageIndex] = React.useState(() => rememberedPhotoIndex(imageCandidates));
  const [imgError, setImgError] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imageVisible, setImageVisible] = React.useState(imagePriority);
  const activeImageSrc = imageCandidates[imageIndex] || FALLBACK_IMAGE;

  // Reset before committing a new list; an old fallback index belongs to the old list.
  const [previousCandidates, setPreviousCandidates] = React.useState(imageCandidates);
  if (previousCandidates !== imageCandidates) {
    setPreviousCandidates(imageCandidates);
    setImageIndex(rememberedPhotoIndex(imageCandidates));
    setImgError(false);
    setImgLoaded(false);
  }

  React.useLayoutEffect(() => {
    const image = imgRef.current;
    const ready = Boolean(image?.complete && image.naturalWidth > 0);
    setImgLoaded(ready);
    if (ready) {
      rememberPhoto(imageCandidates, activeImageSrc);
    }
  }, [activeImageSrc, imageCandidates]);

  React.useEffect(() => {
    const image = imgRef.current;
    if (!image) return;

    if (imagePriority || !("IntersectionObserver" in window)) {
      setImageVisible(true);
      return;
    }

    setImageVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setImageVisible(true);
        observer.disconnect();
      },
      { rootMargin: "250px" },
    );

    observer.observe(image);
    return () => observer.disconnect();
  }, [activeImageSrc, imagePriority]);

  const advanceImageCandidate = React.useCallback(() => {
    if (imageIndex < imageCandidates.length - 1) {
      // An error event and the deadline can fire before React commits either.
      // Advance this attempt only once, so the next usable photo is not skipped.
      setImageIndex((prev) => prev === imageIndex ? prev + 1 : prev);
      setImgLoaded(false);
      return;
    }

    setImgError(true);
    setImgLoaded(true);
  }, [imageCandidates.length, imageIndex]);



  React.useEffect(() => {
    if (!activeImageSrc || !imageVisible || imgLoaded || imgError) return;

    const timeout = window.setTimeout(
      advanceImageCandidate,
      IMAGE_LOAD_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [
    activeImageSrc,
    advanceImageCandidate,
    imageVisible,
    imgError,
    imgLoaded,
  ]);

  const handleImageLoad = () => {
    rememberPhoto(imageCandidates, activeImageSrc);
    setImgLoaded(true);
  };

  const safeEngine = vehicle.engine?.trim() || "Unknown";
  const safeLocation = vehicle.location?.split(",")?.[0]?.trim() || "Unknown";
  const safeMileage = Number.isFinite(vehicle.mileage) ? vehicle.mileage : 0;
  const daysOnLot = Math.max(
    0,
    Number.isFinite(vehicle.daysOnLot) ? Number(vehicle.daysOnLot) : 0,
  );
  const priceUpdatedLabel = React.useMemo(() => {
    if (!vehicle.priceUpdatedAt) return "Not recorded";
    const date = new Date(vehicle.priceUpdatedAt);
    if (Number.isNaN(date.getTime())) return "Not recorded";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Denver",
    }).format(date);
  }, [vehicle.priceUpdatedAt]);

  const hasPrice = Number.isFinite(vehicle.price) && vehicle.price > 0;
  // Preserve the existing retail/member presentation only after a real price exists.
  const retailPrice = vehicle.price + 0;
  const memberPrice = vehicle.price;

  return (
    <Card
      className="group relative row-span-8 grid grid-rows-subgrid gap-0 overflow-hidden rounded-2xl py-0 bg-card border border-border/60 hover:border-primary/50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer"
      onClick={() => onVehicleClick?.(vehicle)}
    >
      {/* The card can't be a size container (@container): that would stop it
          being a subgrid. Container queries live on the header and the
          one-time payment line instead (2026-11-17). */}
      {/* Premium Image Header. The photo keeps its 16:10 shape; when a long
          name or badge wraps onto more lines, the header grows taller instead
          of cutting the words off (2026-11-17). */}
      <div className="@container relative grid min-h-min grid-cols-1 overflow-hidden bg-zinc-950">
        <div className="col-start-1 row-start-1 aspect-16/10" aria-hidden="true" />
        {imgError ? (
          /* ── Unified fallback: single flex layout, no absolute layer conflicts ── */
          <div className="col-start-1 row-start-1 flex min-w-0 flex-col bg-zinc-300 dark:bg-zinc-800">
            {/* Top badges row */}
            <div className="flex flex-wrap gap-2 p-4">
              <Badge className={cn(WRAPPING_BADGE, "bg-white/70 text-zinc-900 border-zinc-400/40 font-semibold px-3 py-1 dark:bg-black/30 dark:text-zinc-200 dark:border-zinc-600/30")}>
                Stock #{vehicle.stockNumber}
              </Badge>
              {vehicle.featured && (
                <Badge className={cn(WRAPPING_BADGE, "bg-primary/90 text-primary-foreground border-none font-medium px-3 py-1")}>
                  Member Exclusive
                </Badge>
              )}
            </div>

            {/* Centred unavailable indicator */}
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-1">
              <TruckIcon className="w-10 h-10 text-zinc-500/50 dark:text-zinc-400/60" />
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Image unavailable
              </span>
            </div>

            {/* Bottom: title + monthly badge — dark strip for contrast in both modes */}
            <div className="flex flex-wrap items-end justify-between gap-2 px-4 py-3 bg-black/20 dark:bg-black/40">
              <div className="min-w-32 flex-1">
                <h3 className="text-lg @min-[20rem]:text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight drop-shadow-sm break-words [overflow-wrap:anywhere]">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-zinc-800 dark:text-zinc-300 font-semibold text-sm capitalize tracking-wide break-words [overflow-wrap:anywhere]">
                  {vehicle.model}
                  {vehicle.trim && ` - ${vehicle.trim}`}
                </p>
              </div>
              <div className="shrink-0 bg-white/60 dark:bg-black/40 rounded-xl px-3 py-2 border border-zinc-400/30 dark:border-white/10 text-right">
                <p className="text-xs text-zinc-700 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  {hasPrice ? "Est. Monthly" : "Price"}
                </p>
                {hasPrice ? (
                  <p className="text-lg font-extrabold text-primary">
                    ${Math.floor(memberPrice / 60)}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      /mo
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-extrabold text-primary">Price Pending</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <VehiclePhotoPlaceholder loading={!imgLoaded} />

            <img
              ref={imgRef}
              key={`${vehicle.id}-${activeImageSrc}`}
              src={activeImageSrc}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              loading={imagePriority ? "eager" : "lazy"}
              fetchPriority={imagePriority ? "high" : "auto"}
              decoding={imagePriority ? "sync" : "async"}
              onLoad={handleImageLoad}
              onError={advanceImageCandidate}
              className={cn("absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none group-hover:scale-105", imgLoaded ? "opacity-100" : "opacity-0")}
            />

            {/* Sleek Overlay Gradient */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />

            <div className="relative z-10 col-start-1 row-start-1 flex min-w-0 flex-col justify-between">
              {/* Top Badges */}
              <div className="flex flex-wrap gap-2 px-4 pt-4">
                <Badge className={cn(WRAPPING_BADGE, "bg-black/65 hover:bg-black/75 text-white backdrop-blur-md border-white/20 font-semibold px-3 py-1")}>
                  Stock #{vehicle.stockNumber}
                </Badge>
                {vehicle.featured && (
                  <Badge className={cn(WRAPPING_BADGE, "bg-primary/90 text-primary-foreground backdrop-blur-md border-none font-medium px-3 py-1")}>
                    Member Exclusive
                  </Badge>
                )}
              </div>

              {/* Bottom Image Overlay Details */}
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 bg-linear-to-t from-black/95 via-black/60 via-60% to-transparent px-4 pb-3.5 pt-10">
                <div className="min-w-32 flex-1">
                  <h3 className="text-xl @min-[20rem]:text-2xl font-bold text-white tracking-tight drop-shadow-md leading-tight break-words [overflow-wrap:anywhere]">
                    {vehicle.year} {vehicle.make}
                  </h3>
                  <p className="text-zinc-100/95 font-semibold text-base @min-[20rem]:text-lg capitalize tracking-wide break-words [overflow-wrap:anywhere]">
                    {vehicle.model}
                    {vehicle.trim && ` - ${vehicle.trim}`}
                  </p>
                </div>
                <div className="shrink-0 bg-black/40 backdrop-blur-md rounded-xl p-2 border border-white/10 text-right">
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                    {hasPrice ? "Est. Monthly" : "Price"}
                  </p>
                  {hasPrice ? (
                    <p className="text-xl font-bold text-primary">
                      ${Math.floor(memberPrice / 60)}
                      <span className="text-sm font-medium text-zinc-300">/mo</span>
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-primary">Price Pending</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Below the photo, one row per piece of information (2026-11-17). The
          card is a subgrid of the Inventory grid, so each row is shared with
          the other cards in the same grid row: mileage, engine, location, the
          prices and the buttons start on the same line on every card, and a
          longer engine name moves that row down on all of them together. The
          card spans 8 rows; the Inventory page adds a 9th for the shipping tag. */}

      {/* Row 2: mileage and days on lot */}
      <div
        className={cn(
          "mx-4 mt-4 grid border-b border-border/50 pb-3 sm:mx-5",
          showInventoryMeta ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <div className={cn("flex min-w-0 flex-col items-center px-1", showInventoryMeta && "border-r border-border/50")}>
          <GaugeIcon className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="max-w-full text-center text-xs sm:text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere]">
            {safeMileage.toLocaleString()} mi
          </span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide text-center leading-tight">
            Mileage
          </span>
        </div>

        {showInventoryMeta && (
          <div className="flex min-w-0 flex-col items-center px-1">
            <Clock3 className="w-4 h-4 text-primary/70 mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {daysOnLot}d
            </span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide text-center leading-tight">
              Days on lot
            </span>
          </div>
        )}
      </div>

      {/* Row 3: engine */}
      <div className="mx-4 flex min-w-0 items-start justify-between gap-3 border-b border-border/50 py-2.5 sm:mx-5">
        <span className="shrink-0 pt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Engine
        </span>
        <span className="min-w-0 text-right text-xs sm:text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere]">
          {safeEngine}
        </span>
      </div>

      {/* Row 4: location */}
      <div className="mx-4 flex min-w-0 items-start justify-between gap-3 py-2.5 sm:mx-5">
        <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Location
        </span>
        <span className="min-w-0 text-right text-xs sm:text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere]">
          {safeLocation}
        </span>
      </div>

      {/* Rows 5–7: the price box (retail price, one-time payment, price updated) */}
      <div className="mx-4 mt-1 row-span-3 grid grid-rows-subgrid gap-0 rounded-xl border border-border/50 bg-muted/40 px-4 py-3 sm:mx-5">
        {hasPrice ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-2 pb-2">
              <span className="text-muted-foreground font-medium">
                Retail Price:
              </span>
              <span className="ml-auto text-muted-foreground/70 font-bold line-through decoration-2 text-lg tabular-nums">
                ${retailPrice.toLocaleString()}
              </span>
            </div>
            <div className="@container flex flex-wrap justify-between items-center gap-x-2 bg-primary/8 dark:bg-primary/12 -mx-2 px-2 py-2 rounded-lg border-l-4 border-primary">
              <span className="text-foreground font-bold tracking-tight">
                One Time Payment:
              </span>
              <span className="ml-auto text-xl @min-[16rem]:text-2xl font-extrabold text-primary tabular-nums">
                ${memberPrice.toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <div className="row-span-2 rounded-lg border-l-4 border-primary bg-primary/8 px-3 py-3 dark:bg-primary/12">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price</p>
            <p className="mt-0.5 text-xl font-extrabold text-primary">Price Pending</p>
            <p className="mt-1 text-xs text-muted-foreground">Pricing is being finalized.</p>
          </div>
        )}

        {showInventoryMeta ? (
          <div
            className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="flex items-center gap-1 font-medium">
              <CalendarClock className="h-3.5 w-3.5 text-primary/70" />
              {hasPrice ? "Price updated" : "Pricing pending"}
            </span>
            <VehiclePriceHistoryDialog
              vehicle={vehicle}
              triggerLabel={priceUpdatedLabel}
              triggerClassName="ml-auto font-semibold text-foreground/80 tabular-nums"
            />
          </div>
        ) : (
          <div aria-hidden="true" />
        )}
      </div>

      {/* Row 8: the buttons */}
      <div
        className="mx-4 mb-4 mt-4 flex flex-col gap-2 sm:mx-5 sm:mb-5 sm:gap-2.5"
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

        <Button
          onClick={() => onApplyNow?.(vehicle)}
          className="w-full text-xs sm:text-sm h-11 font-semibold shadow-md"
        >
          Apply Now
        </Button>

        <Button
          onClick={() => (onCreateLoad || onGetQuote)?.(vehicle)}
          className="w-full shadow-md active:scale-[0.99] transition-all"
        >
          <TruckIcon className="w-4 h-4 mr-2" /> Create Managed Load
        </Button>
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
      prev.imagePriority === next.imagePriority &&
      prev.shippingPrice === next.shippingPrice &&
      prev.onCheckAvailability === next.onCheckAvailability &&
      prev.onApplyNow === next.onApplyNow &&
      prev.onVideo === next.onVideo &&
      prev.onGetQuote === next.onGetQuote &&
      prev.onVehicleClick === next.onVehicleClick &&
      prev.onCreateLoad === next.onCreateLoad
    );
  },
);