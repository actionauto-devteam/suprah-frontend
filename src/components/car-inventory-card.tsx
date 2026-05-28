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
  TrendingUp,
} from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";

const CARD_FALLBACK =
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop";

interface CarInventoryCardProps {
  vehicle: Vehicle;
  shippingPrice?: number;
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
    icon: React.FC<{ className?: string }>;
  }
> = {
  "Ready for Sale": {
    label: "Ready",
    accent: "sm:border-l-green-500",
    pill: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25",
    icon: CheckCircle2,
  },
  "In Recon": {
    label: "Recon",
    accent: "sm:border-l-amber-500",
    pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
    icon: Wrench,
  },
  Sold: {
    label: "Sold",
    accent: "sm:border-l-red-500",
    pill: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25",
    icon: AlertCircle,
  },
  "In Transit": {
    label: "Transit",
    accent: "sm:border-l-blue-500",
    pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
    icon: TruckIcon,
  },
};

export function CarInventoryCard({
  vehicle,
  onGetQuote,
  onVehicleClick,
  onCheckAvailability,
  onCreateLoad,
}: CarInventoryCardProps) {
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

  const handleImgError = () => {
    if (imgIdx < imgCandidates.length - 1) {
      setImgIdx((p) => p + 1);
      setImgLoaded(false);
    } else {
      setImgError(true);
      setImgLoaded(true);
    }
  };

  const statusCfg = vehicle.status ? STATUS_CONFIG[vehicle.status] : null;
  const StatusIcon = statusCfg?.icon ?? Clock;
  const profit = vehicle.cost && vehicle.price ? vehicle.price - vehicle.cost : null;
  const profitPct = profit && vehicle.cost ? Math.round((profit / vehicle.cost) * 100) : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-border/50 p-0 transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
        "sm:border-l-4",
        statusCfg ? statusCfg.accent : "sm:border-l-border/40",
        "flex flex-row sm:flex-col",
        "h-28 sm:h-auto",
      )}
    >
      {/* ── Image ── */}
      <div
        onClick={() => onVehicleClick?.(vehicle)}
        className={cn(
          "relative shrink-0 cursor-pointer overflow-hidden bg-muted dark:bg-zinc-900",
          "w-[36%] rounded-l-[calc(var(--radius)-1px)] sm:w-full sm:rounded-none",
          "h-full sm:h-40",
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
            onLoad={() => setImgLoaded(true)}
            onError={handleImgError}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105",
              imgLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-muted dark:bg-zinc-800">
            <TruckIcon className="h-6 w-6 text-muted-foreground/25" />
            <span className="text-[9px] font-medium text-muted-foreground/40">No image</span>
          </div>
        )}

        {/* Status badge */}
        {statusCfg && (
          <div
            className={cn(
              "absolute left-1.5 top-1.5 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-sm",
              statusCfg.pill,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {statusCfg.label}
          </div>
        )}

        {/* Days on lot */}
        {vehicle.daysOnLot !== undefined && vehicle.daysOnLot > 0 && (
          <div className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
            {vehicle.daysOnLot}d
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className={cn("flex min-w-0 flex-1 flex-col justify-between p-2.5 sm:p-3")}>

        {/* Title + identifiers */}
        <div
          onClick={() => onVehicleClick?.(vehicle)}
          className="cursor-pointer space-y-0.5"
        >
          <h3 className="truncate text-sm font-bold leading-tight text-foreground">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <div className="flex items-center gap-2">
            {vehicle.trim && (
              <span className="truncate text-[11px] text-muted-foreground">{vehicle.trim}</span>
            )}
            {vehicle.stockNumber && vehicle.stockNumber !== "N/A" && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                #{vehicle.stockNumber}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <GaugeIcon className="h-3 w-3 text-primary/60" />
            {vehicle.mileage.toLocaleString()} mi
          </span>
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" />
            {vehicle.location.split(",")[0]}
          </span>
        </div>

        {/* Desktop: badges */}
        <div className="hidden flex-wrap gap-1 sm:flex">
          {vehicle.bodyStyle && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              {vehicle.bodyStyle}
            </Badge>
          )}
          {vehicle.transmission && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              {vehicle.transmission.split(" ")[0]}
            </Badge>
          )}
          {vehicle.fuelType && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              {vehicle.fuelType}
            </Badge>
          )}
        </div>

        {/* Price + profit */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-primary sm:text-base">
            ${vehicle.price.toLocaleString()}
          </span>
          {profit !== null && profit > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-2.5 w-2.5" />
              ${profit.toLocaleString()}
              {profitPct !== null && <span className="opacity-60"> · {profitPct}%</span>}
            </span>
          )}
        </div>

        {/* Desktop: actions */}
        <div
          className="hidden sm:flex flex-col gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-border/60 text-xs font-medium"
              onClick={() => onVehicleClick?.(vehicle)}
            >
              <Eye className="h-3 w-3" /> Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-border/60 text-xs font-medium"
              onClick={() => onCheckAvailability?.(vehicle)}
            >
              <CheckCircle2 className="h-3 w-3 text-blue-500" /> Check
            </Button>
          </div>
          <Button
            size="sm"
            className="h-8 w-full gap-1.5 bg-primary text-xs font-bold text-primary-foreground"
            onClick={() => (onCreateLoad || onGetQuote)?.(vehicle)}
          >
            <Package className="h-3.5 w-3.5" />
            {onCreateLoad ? "Create Load" : "Get Quote"}
          </Button>
        </div>
      </div>

      {/* Mobile: full-card tap */}
      <button
        className="absolute inset-0 sm:hidden"
        onClick={() => onVehicleClick?.(vehicle)}
        aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      />
    </Card>
  );
}
