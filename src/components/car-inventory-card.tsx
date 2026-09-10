"use client";

import * as React from "react";
import { Vehicle } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TruckIcon,
  GaugeIcon,
  MapPinIcon,
  Wrench,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Fuel,
  Settings2,
  Heart,
  GitCompareArrows,
  ArrowRight,
  MessageSquare,
  CalendarClock,
  Clock3,
  DollarSign,
  MoreHorizontal,
  Phone,
  Play,
  Loader2,
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import { VehiclePriceHistoryDialog } from "@/components/VehiclePriceHistoryDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CARD_FALLBACK = "/vehicle-placeholder.jpg";
const IMAGE_LOAD_TIMEOUT_MS = 12_000;

// Set to false in production to silence per-image console logging.
const DEBUG_IMAGES = false;

/**
 * Normalize a raw image value into a usable <img> src.
 * - Full http(s) URLs (e.g. DealersCloud CDN links) are passed through UNTOUCHED.
 *   This is important: resolveImageUrl() is meant for our own R2/relative paths,
 *   and must never rewrite an already-complete external URL.
 * - Everything else is handed to resolveImageUrl() as before.
 */
function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed; // already a full URL
  return resolveImageUrl(trimmed)?.trim() || undefined;
}

function getMemberPricing(vehicle: Vehicle) {
  const price = vehicle.price || 0;
  const hasPrice = Number.isFinite(price) && price > 0;
  const memberPrice = vehicle.memberPrice ?? price;
  const discountPct = vehicle.memberDiscountPercent ?? 0;
  const hasDiscount = hasPrice && discountPct > 0 && memberPrice < price;
  return { price, memberPrice, discountPct, hasDiscount, hasPrice, tierName: vehicle.tierName };
}

interface CarInventoryCardProps {
  vehicle: Vehicle;
  shippingPrice?: number;
  viewMode?: "grid" | "list";
  onGetQuote: (vehicle: Vehicle) => void;
  onVehicleClick?: (vehicle: Vehicle) => void;
  onCheckAvailability?: (vehicle: Vehicle) => void;
  onApplyNow?: (vehicle: Vehicle) => void;
  onCallUs?: (vehicle: Vehicle) => void;
  onVideo?: (vehicle: Vehicle) => void;
  onCreateLoad?: (vehicle: Vehicle) => void;
  isSaved?: boolean;
  onToggleSave?: (vehicle: Vehicle, newState: boolean) => void;
  isComparing?: boolean;
  onToggleCompare?: (vehicleId: string) => void;
  canCompareMore?: boolean;
  /** Show internal All Inventory metadata without changing other card uses. */
  showInventoryMeta?: boolean;
  /** Compact mobile presentation used only when an Inventory/Shop page opts in. */
  mobileOptimized?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; pill: string; dot: string; icon: React.FC<{ className?: string }> }
> = {
  "Ready for Sale": {
    label: "Ready",
    pill: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  "In Recon": {
    label: "In Recon",
    pill: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    dot: "bg-amber-500",
    icon: Wrench,
  },
  Sold: {
    label: "Sold",
    pill: "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30",
    dot: "bg-red-500",
    icon: AlertCircle,
  },
  "In Transit": {
    label: "In Transit",
    pill: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30",
    dot: "bg-blue-500",
    icon: TruckIcon,
  },
};

interface VehicleImageProps {
  vehicle: Vehicle;
  className?: string;
  onClick?: () => void;
  statusCfg: (typeof STATUS_CONFIG)[string] | null;
  showStatusBadge?: boolean;
  showStatusDot?: boolean;
  showDaysOnLot?: boolean;
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
  isComparing?: boolean;
  onToggleCompare?: (e: React.MouseEvent) => void;
  canCompareMore?: boolean;
}

function VehicleImage({
  vehicle,
  className,
  onClick,
  statusCfg,
  showStatusBadge,
  showStatusDot,
  showDaysOnLot,
  isSaved,
  onToggleSave,
  isComparing,
  onToggleCompare,
  canCompareMore,
}: VehicleImageProps) {
  // Build the list of REAL image candidates (no fallback yet). The fallback is
  // only appended when there are zero real images, so a car with photos never
  // shows the generic placeholder.
  const { realCandidates, hasRealImage } = React.useMemo(() => {
    const rawFields = [vehicle.image, ...(vehicle.images || [])];
    const resolved = rawFields.map((s) => normalizeImageSrc(s));
    const valid = resolved.filter((s): s is string => Boolean(s));
    const deduped = Array.from(new Set(valid));

    if (DEBUG_IMAGES) {
      // eslint-disable-next-line no-console
      console.log(
        `[VehicleImage] ${vehicle.year} ${vehicle.make} ${vehicle.model} (id: ${vehicle.id})`,
        {
          "raw vehicle.image": vehicle.image,
          "raw vehicle.images": vehicle.images,
          "normalized output": resolved,
          "real candidates": deduped,
        },
      );
    }

    return { realCandidates: deduped, hasRealImage: deduped.length > 0 };
  }, [vehicle.id, vehicle.year, vehicle.make, vehicle.model, vehicle.image, vehicle.images]);

  // Full candidate list = real images, then the generic fallback ONLY if there
  // were real images to try (so a broken CDN link still degrades to the
  // placeholder). If there are zero real images, we go straight to the
  // "no image" empty state below rather than showing the stock cover.
  const candidates = React.useMemo(
    () => (hasRealImage ? [...realCandidates, CARD_FALLBACK] : []),
    [realCandidates, hasRealImage],
  );

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [imgIdx, setImgIdx] = React.useState(0);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const [imageVisible, setImageVisible] = React.useState(false);
  const candidateKey = candidates.join("\u0001");

  React.useEffect(() => {
    setImgIdx(0);
    setImgLoaded(false);
    setImgError(false);
  }, [candidateKey]);

  const activeSrc = candidates[imgIdx];

  React.useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [activeSrc]);

  React.useEffect(() => {
    const image = imgRef.current;
    if (!image || !activeSrc) return;
    if (!("IntersectionObserver" in window)) {
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
      { rootMargin: "200px" },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [activeSrc]);

  const StatusIcon = statusCfg?.icon ?? Clock;

  const advanceCandidate = React.useCallback(() => {
    if (DEBUG_IMAGES) {
      // eslint-disable-next-line no-console
      console.warn(
        `[VehicleImage] FAILED to load "${activeSrc}" for ${vehicle.year} ${vehicle.make} ${vehicle.model} (id: ${vehicle.id}).`,
      );
    }
    if (imgIdx < candidates.length - 1) {
      setImgIdx((p) => p + 1);
      setImgLoaded(false);
    } else {
      setImgError(true);
      setImgLoaded(true);
    }
  }, [activeSrc, candidates.length, imgIdx, vehicle.id, vehicle.make, vehicle.model, vehicle.year]);

  React.useEffect(() => {
    if (!activeSrc || !imageVisible || imgLoaded || imgError) return;
    const timeoutId = window.setTimeout(advanceCandidate, IMAGE_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [activeSrc, advanceCandidate, imageVisible, imgError, imgLoaded]);

  const handleImgError = advanceCandidate;

  const handleImgLoad = () => setImgLoaded(true);

  // "No image" empty state: shown when a car has zero real photos, OR when every
  // real photo AND the fallback failed to load.
  const showEmptyState = !hasRealImage || imgError || !activeSrc;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden bg-muted dark:bg-zinc-900 group/img",
        className,
      )}
    >
      {!showEmptyState && !imgLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted dark:bg-zinc-800">
          <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Loading photo
          </span>
        </div>
      )}

      {!showEmptyState ? (
        <img
          ref={imgRef}
          key={`${vehicle.id}-${imgIdx}`}
          src={activeSrc}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted dark:bg-zinc-800">
          <TruckIcon className="h-8 w-8 text-muted-foreground/20" />
          <span className="text-[10px] font-medium text-muted-foreground/40 tracking-wide">
            No image
          </span>
        </div>
      )}

      {showStatusBadge && statusCfg && (
        <div
          className={cn(
            "absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md shadow-sm",
            statusCfg.pill,
          )}
        >
          <StatusIcon className="h-2.5 w-2.5" />
          {statusCfg.label}
        </div>
      )}

      {showStatusDot && statusCfg && (
        <span
          className={cn(
            "absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-black/20 shadow",
            statusCfg.dot,
          )}
        />
      )}

      {showDaysOnLot && vehicle.daysOnLot !== undefined && vehicle.daysOnLot > 0 && (
        <div className="absolute bottom-2.5 right-2.5 z-10 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {vehicle.daysOnLot}d on lot
        </div>
      )}

      {onToggleSave && (
        <button
          onClick={onToggleSave}
          aria-label={isSaved ? "Remove from saved" : "Save vehicle"}
          className={cn(
            "absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-sm",
            isSaved
              ? "bg-rose-500/90 hover:bg-rose-500"
              : "bg-black/40 hover:bg-black/60",
          )}
        >
          <Heart
            className={cn(
              "h-3.5 w-3.5 transition-all duration-200",
              isSaved ? "fill-white text-white scale-110" : "fill-transparent text-white",
            )}
          />
        </button>
      )}

      {onToggleCompare && (
        <button
          onClick={onToggleCompare}
          disabled={!isComparing && canCompareMore === false}
          aria-label={isComparing ? "Remove from comparison" : "Add to comparison"}
          className={cn(
            "absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold backdrop-blur-md transition-all duration-200 shadow-sm",
            isComparing
              ? "bg-primary text-primary-foreground"
              : "bg-black/45 text-white hover:bg-black/65",
            !isComparing && canCompareMore === false && "opacity-40 cursor-not-allowed",
          )}
        >
          <GitCompareArrows className="h-3 w-3" />
          {isComparing ? "Added" : "Compare"}
        </button>
      )}
    </div>
  );
}

export function CarInventoryCard({
  vehicle,
  viewMode = "grid",
  onGetQuote,
  onVehicleClick,
  onCheckAvailability,
  onApplyNow,
  onCallUs,
  onVideo,
  onCreateLoad,
  isSaved,
  onToggleSave,
  isComparing,
  onToggleCompare,
  canCompareMore,
  showInventoryMeta = false,
  mobileOptimized = false,
}: CarInventoryCardProps) {
  const statusCfg = vehicle.status
    ? (STATUS_CONFIG[vehicle.status] ?? null)
    : null;
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
  const { price, memberPrice, discountPct, hasDiscount, hasPrice, tierName } = getMemberPricing(vehicle);

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group relative flex overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
          mobileOptimized ? "min-h-28 sm:h-30" : "h-26 sm:h-30",
          "transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        )}
      >
        <VehicleImage
          vehicle={vehicle}
          statusCfg={statusCfg}
          showStatusDot
          showDaysOnLot
          onClick={() => onVehicleClick?.(vehicle)}
          className={cn("shrink-0 rounded-l-2xl", mobileOptimized ? "w-24 xs:w-28 sm:w-44" : "w-28 sm:w-44")} 
          isSaved={isSaved}
          onToggleSave={
            onToggleSave
              ? (e) => { e.stopPropagation(); onToggleSave(vehicle, !isSaved); }
              : undefined
          }
          isComparing={isComparing}
          onToggleCompare={
            onToggleCompare
              ? (e) => { e.stopPropagation(); onToggleCompare(vehicle.id); }
              : undefined
          }
          canCompareMore={canCompareMore}
        />

        <div className={cn("flex min-w-0 flex-1 flex-col justify-center py-2 gap-1", mobileOptimized ? "px-3 sm:px-4" : "px-4")}>
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-bold text-base sm:text-lg leading-tight text-foreground cursor-pointer hover:text-primary transition-colors",
                mobileOptimized ? "line-clamp-2 sm:line-clamp-1" : "line-clamp-1",
              )}
              onClick={() => onVehicleClick?.(vehicle)}
            >
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim && (
                <span
                  className={cn(
                    "font-normal text-muted-foreground ml-1.5 text-sm",
                    mobileOptimized && "hidden sm:inline",
                  )}
                >
                  {vehicle.trim}
                </span>
              )}
            </h3>
            {statusCfg && (
              <Badge
                className={cn(
                  "hidden sm:flex shrink-0 items-center gap-1 h-6 px-2.5 text-xs font-bold rounded-full",
                  statusCfg.pill,
                )}
              >
                <statusCfg.icon className="h-3 w-3" />
                {statusCfg.label}
              </Badge>
            )}
          </div>
          {mobileOptimized && vehicle.trim && (
            <p className="line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground sm:hidden">
              {vehicle.trim}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GaugeIcon className="h-4 w-4 text-primary/50" />
              {safeMileage.toLocaleString()} mi
            </span>
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4" />
              {safeLocation}
            </span>
            {showInventoryMeta && (
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-primary/60" />
                Days on lot {daysOnLot}d
              </span>
            )}
            {showInventoryMeta && (
              <span
                className="relative z-10 hidden lg:flex items-center gap-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                <CalendarClock className="h-3.5 w-3.5 text-primary/60" />
                <span>Price</span>
                <VehiclePriceHistoryDialog
                  vehicle={vehicle}
                  triggerLabel={priceUpdatedLabel}
                  triggerClassName="font-medium"
                />
              </span>
            )}
            {vehicle.bodyStyle && <span className="hidden md:inline">{vehicle.bodyStyle}</span>}
            {vehicle.fuelType && <span className="hidden md:inline">{vehicle.fuelType}</span>}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end justify-center gap-1 pr-5 pl-3 py-2 shrink-0 border-l border-border/30 min-w-40">
          {!hasPrice ? (
            <span className="text-xl font-black text-primary">Price Pending</span>
          ) : hasDiscount ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground/60 line-through tabular-nums">
                  ${price.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  {tierName} -{discountPct}%
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${memberPrice.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-2xl font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-sm gap-1.5 w-full mt-1 rounded-lg border-border/50"
            onClick={() => onVehicleClick?.(vehicle)}
          >
            <Eye className="h-3.5 w-3.5" /> Details
          </Button>
        </div>

        <div className="sm:hidden flex flex-col items-end justify-center pr-3 pl-1 py-2 shrink-0 gap-1">
          {!hasPrice ? (
            <span className="max-w-24 text-right text-xs font-black leading-tight text-primary">
              Price Pending
            </span>
          ) : hasDiscount ? (
            <>
              <span className="text-xs text-muted-foreground/60 line-through tabular-nums">
                ${price.toLocaleString()}
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${memberPrice.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-base font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
          )}

          {statusCfg && (
            <Badge
              className={cn(
                "mt-0.5 flex h-6 max-w-full items-center gap-1 rounded-full px-2 text-[11px] font-bold leading-none whitespace-nowrap",
                statusCfg.pill,
              )}
            >
              <statusCfg.icon className="h-2.5 w-2.5 shrink-0" />
              <span>{statusCfg.label}</span>
            </Badge>
          )}
        </div>

        <button
          className="absolute inset-0 sm:hidden z-1"
          onClick={() => onVehicleClick?.(vehicle)}
          aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card",
        "transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-0.5",
      )}
    >
      <VehicleImage
        vehicle={vehicle}
        statusCfg={statusCfg}
        showStatusBadge
        showDaysOnLot
        onClick={() => onVehicleClick?.(vehicle)}
        className={cn("w-full", mobileOptimized ? "aspect-[16/9] sm:aspect-5/3" : "aspect-5/3")}
        isSaved={isSaved}
        onToggleSave={
          onToggleSave
            ? (e) => { e.stopPropagation(); onToggleSave(vehicle, !isSaved); }
            : undefined
        }
        isComparing={isComparing}
        onToggleCompare={
          onToggleCompare
            ? (e) => { e.stopPropagation(); onToggleCompare(vehicle.id); }
            : undefined
        }
        canCompareMore={canCompareMore}
      />

      <div
        className={cn(
          "flex flex-1 flex-col cursor-pointer",
          mobileOptimized ? "gap-2.5 p-3 sm:gap-3 sm:p-4" : "gap-3 p-4",
        )}
        onClick={() => onVehicleClick?.(vehicle)}
      >
        <div>
          <h3
            className={cn(
              "font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors",
              mobileOptimized ? "line-clamp-2 sm:line-clamp-1" : "line-clamp-1",
            )}
          >
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.trim && (
            <p className={cn("mt-0.5 text-xs text-muted-foreground", mobileOptimized ? "line-clamp-2 sm:line-clamp-1" : "truncate")}>{vehicle.trim}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GaugeIcon className="h-3.5 w-3.5 text-primary/50 shrink-0" />
            {safeMileage.toLocaleString()} mi
          </span>
          <span className="h-3 w-px bg-border/60" />
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{safeLocation}</span>
          </span>
          {showInventoryMeta && mobileOptimized && (
            <>
              <span className="h-3 w-px bg-border/60 sm:hidden" />
              <span className="flex shrink-0 items-center gap-1 sm:hidden">
                <Clock3 className="h-3.5 w-3.5 text-primary/60" />
                {daysOnLot}d
              </span>
            </>
          )}
        </div>

        <div className={cn("flex flex-wrap gap-1", mobileOptimized && "hidden sm:flex")}>
          {vehicle.bodyStyle && (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium rounded-full">
              {vehicle.bodyStyle}
            </Badge>
          )}
          {vehicle.transmission && (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium gap-1 rounded-full">
              <Settings2 className="h-2.5 w-2.5" />
              {vehicle.transmission.split(" ")[0]}
            </Badge>
          )}
          {vehicle.fuelType && (
            <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium gap-1 rounded-full">
              <Fuel className="h-2.5 w-2.5" />
              {vehicle.fuelType}
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-1 border-t border-border/30">
          {!hasPrice ? (
            <span className="text-lg font-black text-primary">Price Pending</span>
          ) : hasDiscount ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ${memberPrice.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  {tierName} -{discountPct}%
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground/60 line-through tabular-nums">
                ${price.toLocaleString()} retail
              </span>
            </>
          ) : (
            <span className="text-2xl font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
          )}
        </div>

        {showInventoryMeta && mobileOptimized && (
          <div
            className="flex items-center justify-between gap-2 border-t border-border/30 pt-2.5 text-[11px] text-muted-foreground sm:hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="flex items-center gap-1 font-semibold">
              <CalendarClock className="h-3 w-3 text-primary/70" />
              Price updated
            </span>
            <VehiclePriceHistoryDialog
              vehicle={vehicle}
              triggerLabel={priceUpdatedLabel}
              triggerClassName="max-w-32 truncate font-bold text-foreground/80 tabular-nums"
            />
          </div>
        )}
      </div>

      {mobileOptimized && (
        <div
          className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto] gap-2 px-3 pb-3 sm:hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-11 min-w-0 rounded-xl border-border/50 text-[11px] font-bold whitespace-nowrap xxs:text-xs touch-manipulation"
            onClick={() =>
              onCheckAvailability
                ? onCheckAvailability(vehicle)
                : onVehicleClick?.(vehicle)
            }
          >
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            {onCheckAvailability ? "Availability" : "Details"}
          </Button>

          <Button
            size="sm"
            className="h-11 min-w-0 rounded-xl px-2 text-[11px] font-black whitespace-nowrap xxs:px-3 xxs:text-xs touch-manipulation"
            onClick={() =>
              onCreateLoad ? onCreateLoad(vehicle) : onVehicleClick?.(vehicle)
            }
          >
            {onCreateLoad ? (
              <>
                <TruckIcon className="mr-1.5 h-3.5 w-3.5" />
                Create Load
              </>
            ) : (
              <>
                View <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl border-border/50 touch-manipulation"
                aria-label="More vehicle actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onSelect={() => onVehicleClick?.(vehicle)}>
                <Eye className="h-4 w-4" />
                Vehicle details
              </DropdownMenuItem>
              {onApplyNow && (
                <DropdownMenuItem onSelect={() => onApplyNow(vehicle)}>
                  <DollarSign className="h-4 w-4" />
                  Apply now
                </DropdownMenuItem>
              )}
              {onCallUs && (
                <DropdownMenuItem onSelect={() => onCallUs(vehicle)}>
                  <Phone className="h-4 w-4" />
                  Call us
                </DropdownMenuItem>
              )}
              {onVideo && (
                <DropdownMenuItem onSelect={() => onVideo(vehicle)}>
                  <Play className="h-4 w-4" />
                  Video
                </DropdownMenuItem>
              )}
              {!onCreateLoad && onGetQuote && (
                <DropdownMenuItem onSelect={() => onGetQuote(vehicle)}>
                  <TruckIcon className="h-4 w-4" />
                  Shipping quote
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-2 gap-2 px-4 pb-4",
          mobileOptimized && "hidden sm:grid",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/50 hover:border-primary/40"
          onClick={() => onCheckAvailability?.(vehicle)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {mobileOptimized ? "Availability" : "Inquire"}
        </Button>
        <Button
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl"
          onClick={() =>
            mobileOptimized && onCreateLoad
              ? onCreateLoad(vehicle)
              : onVehicleClick?.(vehicle)
          }
        >
          {mobileOptimized && onCreateLoad ? (
            <>
              <TruckIcon className="h-3.5 w-3.5" />
              Create Managed Load
            </>
          ) : (
            <>
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
