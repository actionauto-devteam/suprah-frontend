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
} from "lucide-react";
import { Vehicle } from "@/types/inventory";
import { resolveImageUrl } from "@/lib/utils";

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
}: PremiumVehicleCardProps) {
  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=2636&auto=format&fit=crop";

  const imageCandidates = React.useMemo(() => {
    const rawCandidates = [vehicle.image, ...(vehicle.images || [])]
      .map((source) => resolveImageUrl(source)?.trim())
      .filter((source): source is string =>
        Boolean(source && source.length > 0),
      );

    const uniqueCandidates = Array.from(new Set(rawCandidates));
    return uniqueCandidates.length > 0 ? uniqueCandidates : [FALLBACK_IMAGE];
  }, [vehicle.image, vehicle.images]);

  const [imageIndex, setImageIndex] = React.useState(0);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImageIndex(0);
    setImgLoaded(false);
    setImgError(false);
  }, [vehicle.id, imageCandidates]);

  const activeImageSrc = imageCandidates[imageIndex] || FALLBACK_IMAGE;

  const handleImageError = () => {
    if (imageIndex < imageCandidates.length - 1) {
      setImageIndex((prev) => prev + 1);
      setImgLoaded(false);
      return;
    }

    setImgError(true);
    setImgLoaded(true);
  };

  // Mocking "Retail Price" vs "One Time Payment" for the UI showcase
  const retailPrice = vehicle.price + 0; // Mock markup
  const memberPrice = vehicle.price;

  return (
    <Card
      className="group relative overflow-hidden rounded-2xl py-0 bg-white dark:bg-zinc-950 border border-border/40 hover:border-green-500/50 shadow-sm hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 flex flex-col h-full cursor-pointer"
      onClick={() => onVehicleClick?.(vehicle)}
    >
      {/* Premium Image Header */}
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {imgError ? (
          /* ── Unified fallback: single flex layout, no absolute layer conflicts ── */
          <div className="absolute inset-0 flex flex-col bg-zinc-300 dark:bg-zinc-800">
            {/* Top badges row */}
            <div className="flex gap-2 p-4">
              <Badge className="bg-white/70 text-zinc-900 border-zinc-400/40 font-semibold px-3 py-1 dark:bg-black/30 dark:text-zinc-200 dark:border-zinc-600/30">
                Stock #{vehicle.stockNumber}
              </Badge>
              {vehicle.featured && (
                <Badge className="bg-green-500/90 text-white border-none font-medium px-3 py-1">
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
              <div className="min-w-0">
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight drop-shadow-sm">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-zinc-800 dark:text-zinc-300 font-semibold text-sm capitalize tracking-wide truncate">
                  {vehicle.model}
                  {vehicle.trim && ` - ${vehicle.trim}`}
                </p>
              </div>
              <div className="flex-shrink-0 bg-white/60 dark:bg-black/40 rounded-xl px-3 py-2 border border-zinc-400/30 dark:border-white/10 text-right">
                <p className="text-xs text-zinc-700 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                  Est. Monthly
                </p>
                <p className="text-lg font-extrabold text-green-700 dark:text-green-400">
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
            {/* Loading skeleton */}
            {!imgLoaded && (
              <div className="absolute inset-0 z-10 bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse flex items-center justify-center">
                <TruckIcon className="w-10 h-10 text-zinc-500/40" />
              </div>
            )}

            <img
              key={`${vehicle.id}-${imageIndex}`}
              src={activeImageSrc}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={handleImageError}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />

            {/* Sleek Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <Badge className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-white/10 font-medium px-3 py-1">
                Stock #{vehicle.stockNumber}
              </Badge>
              {vehicle.featured && (
                <Badge className="bg-green-500/90 text-white backdrop-blur-md border-none font-medium px-3 py-1">
                  Member Exclusive
                </Badge>
              )}
            </div>

            {/* Bottom Image Overlay Details */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md leading-tight">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-zinc-300 font-medium text-lg capitalize tracking-wide truncate">
                  {vehicle.model}
                  {vehicle.trim && ` - ${vehicle.trim}`}
                </p>
              </div>
              <div className="flex-shrink-0 bg-black/40 backdrop-blur-md rounded-xl p-2 border border-white/10 text-right">
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                  Est. Monthly
                </p>
                <p className="text-xl font-bold text-green-400">
                  ${Math.floor(memberPrice / 60)}
                  <span className="text-sm font-medium text-zinc-300">/mo</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1 bg-gradient-to-b from-transparent to-zinc-50/50 dark:to-zinc-900/20">
        {/* Core Specs Grid */}
        <div className="flex items-center justify-between py-4 border-b border-border/50 mb-4">
          <div className="flex flex-col items-center flex-1 border-r border-border/50">
            <GaugeIcon className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-sm font-semibold text-foreground">
              {vehicle.mileage.toLocaleString()} mi
            </span>
          </div>
          <div className="flex flex-col items-center flex-1 border-r border-border/50">
            <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-1">
              Eng
            </div>
            <span className="text-sm font-semibold text-foreground truncate max-w-[100px]">
              {vehicle.engine || "V6"}
            </span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <MapPinIcon className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-sm font-semibold text-foreground">
              {vehicle.location.split(",")[0]}
            </span>
          </div>
        </div>

        {/* Financials Box (Inspired by the provided image) */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground font-medium">
              Retail Price:
            </span>
            <span className="text-red-500 font-bold line-through decoration-red-500/50 decoration-2 text-lg">
              ${retailPrice.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center bg-green-50 dark:bg-green-500/10 -mx-2 px-2 py-2 rounded-lg border-l-4 border-green-500">
            <span className="text-foreground font-bold tracking-tight">
              One Time Payment:
            </span>
            <span className="text-2xl font-extrabold text-green-600 dark:text-green-400">
              ${memberPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="mt-auto flex flex-col gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={() => onCheckAvailability?.(vehicle)}
              variant="outline"
              className="w-full text-sm h-11 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" />{" "}
              Availability
            </Button>
            <Button
              onClick={() => onVideo?.(vehicle)}
              variant="outline"
              className="w-full text-sm h-11 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
            >
              <Play className="w-4 h-4 mr-2 text-red-500" /> Video
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={() => onApplyNow?.(vehicle)}
              className="w-full text-sm h-11 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold shadow-md"
            >
              Apply Now
            </Button>
            <Button
              onClick={() => onCallUs?.(vehicle)}
              variant="outline"
              className="w-full text-sm h-11 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold"
            >
              <Phone className="w-4 h-4 mr-2 text-emerald-500" /> Call Us
            </Button>
          </div>

          <Button
            onClick={() => (onCreateLoad || onGetQuote)?.(vehicle)}
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-[0.99] transition-all"
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
    const prevVehicle = prev.vehicle;
    const nextVehicle = next.vehicle;

    if (prevVehicle === nextVehicle) {
      return (
        prev.shippingPrice === next.shippingPrice &&
        prev.onCheckAvailability === next.onCheckAvailability &&
        prev.onApplyNow === next.onApplyNow &&
        prev.onCallUs === next.onCallUs &&
        prev.onVideo === next.onVideo &&
        prev.onGetQuote === next.onGetQuote &&
        prev.onVehicleClick === next.onVehicleClick &&
        prev.onCreateLoad === next.onCreateLoad
      );
    }

    return (
      prevVehicle.id === nextVehicle.id &&
      prevVehicle.price === nextVehicle.price &&
      prevVehicle.mileage === nextVehicle.mileage &&
      prevVehicle.location === nextVehicle.location &&
      prevVehicle.status === nextVehicle.status &&
      prevVehicle.image === nextVehicle.image &&
      prevVehicle.stockNumber === nextVehicle.stockNumber &&
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
