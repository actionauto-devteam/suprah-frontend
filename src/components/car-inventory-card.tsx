"use client"

import * as React from "react"
import { Vehicle } from "@/types/inventory"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TruckIcon, GaugeIcon, MapPinIcon, Phone, Play } from "lucide-react"

interface CarInventoryCardProps {
  vehicle: Vehicle
  shippingPrice?: number
  onGetQuote: (vehicle: Vehicle) => void
  onVehicleClick?: (vehicle: Vehicle) => void
  onCheckAvailability?: (vehicle: Vehicle) => void
  onApplyNow?: (vehicle: Vehicle) => void
  onCallUs?: (vehicle: Vehicle) => void
  onVideo?: (vehicle: Vehicle) => void
  onCreateLoad?: (vehicle: Vehicle) => void
}

export function CarInventoryCard({
  vehicle,
  shippingPrice,
  onGetQuote,
  onVehicleClick,
  onCheckAvailability,
  onApplyNow,
  onCallUs,
  onVideo,
  onCreateLoad
}: CarInventoryCardProps) {
  const [imgLoaded, setImgLoaded] = React.useState(false)
  const [imgError, setImgError] = React.useState(false)

  return (
    <Card
      className="overflow-hidden transition-all duration-300 p-0 h-full flex flex-col group border border-emerald-500/30 hover:border-emerald-500/70"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >

      {/* ── Vehicle Image ─────────────────────────────────────────────────── */}
      <div
        onClick={() => onVehicleClick?.(vehicle)}
        className="relative h-64 w-full overflow-hidden bg-muted cursor-pointer rounded-t-xl shrink-0"
      >
        {/* Skeleton — hidden instantly once image loads */}
        {!imgLoaded && (
          <div className="absolute inset-0 z-10 bg-muted animate-pulse flex items-center justify-center">
            <TruckIcon className="w-10 h-10 text-muted-foreground/20" />
          </div>
        )}

        {/* Image */}
        {!imgError ? (
          /* eslint-disable-next-line @next/next/no-img-elements! */
          <img
            src={vehicle.image}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true) }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
            <TruckIcon className="w-10 h-10 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/50">No image</span>
          </div>
        )}

        {/* Shipping badge */}
        {shippingPrice !== undefined && (
          <div className="absolute top-3 right-3 z-20 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-2 duration-500 shadow-md">
            <TruckIcon className="w-3.5 h-3.5" />
            +${shippingPrice.toLocaleString()}
          </div>
        )}

        {/* Stock badge */}
        <div className="absolute bottom-3 left-3 z-20">
          <Badge className="bg-white/95 text-green-700 font-semibold shadow-sm backdrop-blur-sm">
            Stock #{vehicle.stockNumber}
          </Badge>
        </div>
      </div>

      {/* ── Vehicle Details ───────────────────────────────────────────────── */}
      <div className="p-3 md:p-5 flex flex-col flex-1 space-y-4">
        {/* Title */}
        <div className="text-center">
          <div
            onClick={() => onVehicleClick?.(vehicle)}
            className="inline-block group-hover:text-primary transition-colors cursor-pointer"
          >
            <h3 className="font-bold text-lg leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </div>
          {vehicle.trim && (
            <p className="text-sm text-muted-foreground mt-1">{vehicle.trim}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground bg-secondary/30 py-1.5 rounded-md">
            <GaugeIcon className="w-4 h-4" />
            {vehicle.mileage.toLocaleString()} mi
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground bg-secondary/30 py-1.5 rounded-md">
            <MapPinIcon className="w-4 h-4" />
            {vehicle.location.split(",")[0].toUpperCase()}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {vehicle.color && <Badge variant="secondary" className="font-normal text-xs">{vehicle.color}</Badge>}
          {vehicle.transmission && <Badge variant="secondary" className="font-normal text-xs">{vehicle.transmission}</Badge>}
          {vehicle.fuelType && <Badge variant="secondary" className="font-normal text-xs">{vehicle.fuelType}</Badge>}
        </div>

        {/* Pricing */}
        <div className="pt-2 border-t text-center">
          <div className="text-2xl font-bold text-green-600">${vehicle.price.toLocaleString()}</div>
          {shippingPrice !== undefined && (
            <div className="text-xs text-muted-foreground mt-1 font-medium">
              Total with Shipping: ${(vehicle.price + shippingPrice).toLocaleString()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex flex-col gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onCheckAvailability?.(vehicle)}
              variant="outline"
              size="sm"
              className="text-xs h-9 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200"
            >
              Check Availability
            </Button>
            <Button
              onClick={() => onApplyNow?.(vehicle)}
              variant="outline"
              size="sm"
              className="text-xs h-9 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200"
            >
              Apply Now
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onCallUs?.(vehicle)}
              variant="outline"
              size="sm"
              className="text-xs h-9 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200"
            >
              <Phone className="w-3 h-3 mr-1" /> Call Us
            </Button>
            <Button
              onClick={() => onVideo?.(vehicle)}
              variant="outline"
              size="sm"
              className="text-xs h-9 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200"
            >
              <Play className="w-3 h-3 mr-1" /> Video
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
  )
}
