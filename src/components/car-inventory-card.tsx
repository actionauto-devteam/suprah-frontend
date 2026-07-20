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
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";

const CARD_FALLBACK = "/vehicle-placeholder.jpg";

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
  const memberPrice = vehicle.memberPrice ?? price;
  const discountPct = vehicle.memberDiscountPercent ?? 0;
  const hasDiscount = discountPct > 0 && memberPrice < price;
  return { price, memberPrice, discountPct, hasDiscount, tierName: vehicle.tierName };
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

  // Reset when the candidate set changes (e.g. list re-renders with new vehicle)
  React.useEffect(() => {
    setImgIdx(0);
    setImgLoaded(false);
    setImgError(false);
  }, [vehicle.id]);

  const activeSrc = candidates[imgIdx];

  React.useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [activeSrc]);
  const StatusIcon = statusCfg?.icon ?? Clock;

  const handleImgError = () => {
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
  };

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
        <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-muted dark:bg-zinc-800">
          <TruckIcon className="h-8 w-8 text-muted-foreground/15" />
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
  onCreateLoad,
  isSaved,
  onToggleSave,
  isComparing,
  onToggleCompare,
  canCompareMore,
}: CarInventoryCardProps) {
  const statusCfg = vehicle.status
    ? (STATUS_CONFIG[vehicle.status] ?? null)
    : null;
  const safeLocation = vehicle.location?.split(",")?.[0]?.trim() || "Unknown";
  const safeMileage = Number.isFinite(vehicle.mileage) ? vehicle.mileage : 0;
  const { price, memberPrice, discountPct, hasDiscount, tierName } = getMemberPricing(vehicle);

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group relative flex h-22 sm:h-25 overflow-hidden rounded-2xl border border-border/40 bg-card",
          "transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        )}
      >
        <VehicleImage
          vehicle={vehicle}
          statusCfg={statusCfg}
          showStatusDot
          showDaysOnLot
          onClick={() => onVehicleClick?.(vehicle)}
          className="w-28 sm:w-40 shrink-0 rounded-l-2xl"
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

        <div className="flex flex-1 min-w-0 flex-col justify-center px-3 py-2 gap-0.5">
          <div className="flex items-start justify-between gap-1.5">
            <h3
              className="font-bold text-sm leading-tight text-foreground cursor-pointer hover:text-primary transition-colors line-clamp-1"
              onClick={() => onVehicleClick?.(vehicle)}
            >
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim && (
                <span className="font-normal text-muted-foreground ml-1 text-xs">{vehicle.trim}</span>
              )}
            </h3>
            {statusCfg && (
              <Badge
                className={cn(
                  "hidden sm:flex shrink-0 items-center gap-1 h-5 px-2 text-[10px] font-bold rounded-full",
                  statusCfg.pill,
                )}
              >
                <statusCfg.icon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GaugeIcon className="h-3 w-3 text-primary/50" />
              {safeMileage.toLocaleString()} mi
            </span>
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {safeLocation}
            </span>
            {vehicle.bodyStyle && <span className="hidden md:inline">{vehicle.bodyStyle}</span>}
            {vehicle.fuelType && <span className="hidden md:inline">{vehicle.fuelType}</span>}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end justify-center gap-0.5 pr-4 pl-2 py-2 shrink-0 border-l border-border/30 min-w-35">
          {hasDiscount ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/60 line-through tabular-nums">
                  ${price.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  {tierName} -{discountPct}%
                </span>
              </div>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${memberPrice.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-lg font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 w-full mt-1 rounded-lg border-border/50"
            onClick={() => onVehicleClick?.(vehicle)}
          >
            <Eye className="h-3 w-3" /> Details
          </Button>
        </div>

        <div className="sm:hidden flex flex-col items-end justify-center pr-3 pl-1 py-2 shrink-0 gap-0.5">
          {hasDiscount ? (
            <>
              <span className="text-[10px] text-muted-foreground/60 line-through tabular-nums">
                ${price.toLocaleString()}
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                ${memberPrice.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="text-sm font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
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
        className="w-full aspect-5/3"
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
        className="flex flex-1 flex-col p-4 gap-3 cursor-pointer"
        onClick={() => onVehicleClick?.(vehicle)}
      >
        <div>
          <h3 className="font-bold text-[15px] leading-snug text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.trim && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{vehicle.trim}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GaugeIcon className="h-3.5 w-3.5 text-primary/50 shrink-0" />
            {safeMileage.toLocaleString()} mi
          </span>
          <span className="h-3 w-px bg-border/60" />
          <span className="flex items-center gap-1.5 truncate">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            {safeLocation}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
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
          {hasDiscount ? (
            <>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
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
            <span className="text-xl font-black text-foreground tabular-nums">
              ${price.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/50 hover:border-primary/40"
          onClick={() => onCheckAvailability?.(vehicle)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Inquire
        </Button>
        <Button
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 rounded-xl"
          onClick={() => onVehicleClick?.(vehicle)}
        >
          View
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}