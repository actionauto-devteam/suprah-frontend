"use client";

import * as React from "react";
import { Vehicle } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TruckIcon,
  GaugeIcon,
  MapPinIcon,
  Wrench,
  Eye,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  Fuel,
  Settings2,
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";

const CARD_FALLBACK =
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop";

function getOriginalPrice(vehicleId: string, price: number): number {
  const hash = vehicleId
    .split("")
    .reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const pct = 1.08 + (hash % 12) * 0.01;
  return Math.round((price * pct) / 500) * 500;
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
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    accent: string;
    pill: string;
    dotColor: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  "Ready for Sale": {
    label: "Ready",
    accent: "border-l-green-500",
    pill: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
    dotColor: "bg-green-500",
    icon: CheckCircle2,
  },
  "In Recon": {
    label: "In Recon",
    accent: "border-l-amber-500",
    pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-500",
    icon: Wrench,
  },
  Sold: {
    label: "Sold",
    accent: "border-l-red-500",
    pill: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
    dotColor: "bg-red-500",
    icon: AlertCircle,
  },
  "In Transit": {
    label: "In Transit",
    accent: "border-l-blue-500",
    pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    dotColor: "bg-blue-500",
    icon: TruckIcon,
  },
};

type StatusCfg = (typeof STATUS_CONFIG)[string];

function VehicleImage({
  vehicle,
  className,
  onClick,
  statusCfg,
  showStatusBadge,
  showStatusDot,
  showDaysOnLot,
}: {
  vehicle: Vehicle;
  className?: string;
  onClick?: () => void;
  statusCfg: StatusCfg | null;
  showStatusBadge?: boolean;
  showStatusDot?: boolean;
  showDaysOnLot?: boolean;
}) {
  const imgCandidates = React.useMemo(() => {
    const raw = [vehicle.image, ...(vehicle.images || []), CARD_FALLBACK]
      .map((s) => resolveImageUrl(s)?.trim())
      .filter((s): s is string => Boolean(s));
    return Array.from(new Set(raw));
  }, [vehicle.image, vehicle.images]);

  const [imgIdx, setImgIdx] = React.useState(0);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const activeSrc = imgCandidates[imgIdx] || CARD_FALLBACK;

  const StatusIcon = statusCfg?.icon ?? Clock;

  const handleImgError = () => {
    if (imgIdx < imgCandidates.length - 1) {
      setImgIdx((p) => p + 1);
      setImgLoaded(false);
    } else {
      setImgError(true);
      setImgLoaded(true);
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden bg-muted dark:bg-zinc-900 group/img",
        className,
      )}
    >
      {!imgLoaded && (
        <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-muted dark:bg-zinc-800">
          <TruckIcon className="h-6 w-6 text-muted-foreground/20" />
        </div>
      )}
      {!imgError ? (
        <img
          key={`${vehicle.id}-${imgIdx}`}
          src={activeSrc}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => setImgLoaded(true)}
          onError={handleImgError}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover/img:scale-105",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted dark:bg-zinc-800">
          <TruckIcon className="h-7 w-7 text-muted-foreground/25" />
          <span className="text-[10px] font-medium text-muted-foreground/40">
            No image
          </span>
        </div>
      )}

      {/* Status badge (grid mode: top-left) */}
      {showStatusBadge && statusCfg && (
        <div
          className={cn(
            "absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold backdrop-blur-sm",
            statusCfg.pill,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusCfg.label}
        </div>
      )}

      {/* Status dot (list mode: minimal indicator) */}
      {showStatusDot && statusCfg && (
        <span
          className={cn(
            "absolute left-1.5 top-1.5 z-10 h-2 w-2 rounded-full ring-1 ring-black/20",
            statusCfg.dotColor,
          )}
        />
      )}

      {/* Days on lot */}
      {showDaysOnLot &&
        vehicle.daysOnLot !== undefined &&
        vehicle.daysOnLot > 0 && (
          <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {vehicle.daysOnLot}d
          </div>
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
}: CarInventoryCardProps) {
  const statusCfg = vehicle.status
    ? (STATUS_CONFIG[vehicle.status] ?? null)
    : null;
  const safeLocation = vehicle.location?.split(",")?.[0]?.trim() || "Unknown";
  const safeMileage = Number.isFinite(vehicle.mileage) ? vehicle.mileage : 0;
  const originalPrice =
    vehicle.marketPrice && vehicle.marketPrice > vehicle.price
      ? vehicle.marketPrice
      : getOriginalPrice(vehicle.id, vehicle.price);
  const savingsAmt = originalPrice - vehicle.price;
  const savingsPct = Math.round((savingsAmt / originalPrice) * 100);

  if (viewMode === "list") {
    return (
      <Card
        className={cn(
          "group relative overflow-hidden border border-border/50 p-0 transition-all duration-200",
          "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
          "flex flex-row",
          "h-22 sm:h-25",
        )}
      >
        <VehicleImage
          vehicle={vehicle}
          statusCfg={statusCfg}
          showStatusDot
          showDaysOnLot
          onClick={() => onVehicleClick?.(vehicle)}
          className="shrink-0 w-30 sm:w-40 h-full rounded-l-[calc(var(--radius)-1px)]"
        />

        {/* Main info */}
        <div className="flex flex-1 min-w-0 flex-col justify-center px-3 py-2 gap-0.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className="font-bold text-sm sm:text-base leading-tight text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => onVehicleClick?.(vehicle)}
              >
                {vehicle.year} {vehicle.make} {vehicle.model}
                {vehicle.trim && (
                  <span className="font-normal text-muted-foreground ml-1.5 text-[13px]">
                    {vehicle.trim}
                  </span>
                )}
              </h3>
              {vehicle.stockNumber && vehicle.stockNumber !== "N/A" && (
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  #{vehicle.stockNumber}
                </span>
              )}
            </div>
            {statusCfg && (
              <Badge
                className={cn(
                  "shrink-0 hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 border font-semibold h-5",
                  statusCfg.pill,
                )}
              >
                <statusCfg.icon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GaugeIcon className="h-3 w-3 text-primary/50" />
              {safeMileage.toLocaleString()} mi
            </span>
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {safeLocation}
            </span>
            {vehicle.bodyStyle && (
              <span className="hidden sm:inline">{vehicle.bodyStyle}</span>
            )}
            {vehicle.transmission && (
              <span className="hidden sm:inline">
                {vehicle.transmission.split(" ")[0]}
              </span>
            )}
            {vehicle.fuelType && (
              <span className="hidden sm:inline">{vehicle.fuelType}</span>
            )}
          </div>
        </div>

        {/* Price + action — desktop */}
        <div className="hidden sm:flex flex-col items-end justify-center gap-1 pr-4 pl-2 py-2 shrink-0 border-l border-border/40 min-w-[160px]">
          <span className="text-[11px] text-muted-foreground line-through tabular-nums">
            ${originalPrice.toLocaleString()}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-primary tabular-nums">
              ${vehicle.price.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              -{savingsPct}%
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 w-full justify-center mt-1"
            onClick={() => onVehicleClick?.(vehicle)}
          >
            <Eye className="h-3.5 w-3.5" /> View Details
          </Button>
        </div>

        {/* Price — mobile */}
        <div className="sm:hidden flex flex-col items-end justify-center pr-3 pl-1 py-2 shrink-0">
          <span className="text-[10px] text-muted-foreground line-through tabular-nums">
            ${originalPrice.toLocaleString()}
          </span>
          <span className="text-sm font-black text-primary tabular-nums">
            ${vehicle.price.toLocaleString()}
          </span>
        </div>

        {/* Mobile: full-card tap */}
        <button
          className="absolute inset-0 sm:hidden z-[1]"
          onClick={() => onVehicleClick?.(vehicle)}
          aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        />
      </Card>
    );
  }

  // Grid mode
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-border/50 p-0 transition-all duration-200",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        "border-l-4",
        statusCfg ? statusCfg.accent : "border-l-border/40",
        "flex flex-row sm:flex-col",
        "h-22 sm:h-auto",
      )}
    >
      <VehicleImage
        vehicle={vehicle}
        statusCfg={statusCfg}
        showStatusBadge
        showDaysOnLot
        onClick={() => onVehicleClick?.(vehicle)}
        className={cn(
          "shrink-0",
          "w-[36%] rounded-l-[calc(var(--radius)-1px)] sm:w-full sm:rounded-none",
          "h-full sm:h-52",
        )}
      />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4 gap-2">
        {/* Title block */}
        <div
          onClick={() => onVehicleClick?.(vehicle)}
          className="cursor-pointer"
        >
          <h3 className="text-sm sm:text-base font-bold leading-snug text-foreground line-clamp-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            {vehicle.trim && (
              <span className="text-xs text-muted-foreground truncate">
                {vehicle.trim}
              </span>
            )}
            {vehicle.stockNumber && vehicle.stockNumber !== "N/A" && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                #{vehicle.stockNumber}
              </span>
            )}
          </div>
        </div>

        {/* Key specs */}
        <div className="relative z-[2] flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground/80">
          <span className="flex items-center gap-1">
            <GaugeIcon className="h-3.5 w-3.5 text-primary/60" />
            {safeMileage.toLocaleString()} mi
          </span>
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" />
            {safeLocation}
          </span>
        </div>

        {/* Attribute badges — desktop only */}
        <div className="hidden sm:flex flex-wrap gap-1.5">
          {vehicle.bodyStyle && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium"
            >
              {vehicle.bodyStyle}
            </Badge>
          )}
          {vehicle.transmission && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium gap-1"
            >
              <Settings2 className="h-2.5 w-2.5" />
              {vehicle.transmission.split(" ")[0]}
            </Badge>
          )}
          {vehicle.fuelType && (
            <Badge
              variant="secondary"
              className="h-5 px-2 text-[10px] font-medium gap-1"
            >
              <Fuel className="h-2.5 w-2.5" />
              {vehicle.fuelType}
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground line-through tabular-nums hidden sm:block">
            ${originalPrice.toLocaleString()}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-xl font-black text-primary tabular-nums">
              ${vehicle.price.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded hidden sm:inline">
              -{savingsPct}%
            </span>
            {vehicle.daysOnLot !== undefined &&
              vehicle.daysOnLot <= 7 &&
              vehicle.daysOnLot > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:hidden">
                  New
                </span>
              )}
          </div>
        </div>

        {/* Actions — desktop only */}
        <div
          className="relative z-[3] hidden sm:flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border/60 text-xs font-medium"
              onClick={() => onVehicleClick?.(vehicle)}
            >
              <Eye className="h-3.5 w-3.5" /> Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border/60 text-xs font-medium"
              onClick={() => onCheckAvailability?.(vehicle)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Inquire
            </Button>
          </div>
          <Button
            size="sm"
            className="h-8 w-full gap-1.5 text-xs font-bold"
            onClick={() => (onCreateLoad || onGetQuote)?.(vehicle)}
          >
            <Package className="h-3.5 w-3.5" />
            {onCreateLoad ? "Create Load" : "Get Shipping Quote"}
          </Button>
        </div>
      </div>

      {/* Mobile: full-card tap */}
      <button
        className="absolute inset-0 sm:hidden z-[1]"
        onClick={() => onVehicleClick?.(vehicle)}
        aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      />
    </Card>
  );
}
