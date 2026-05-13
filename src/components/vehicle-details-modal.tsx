"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VehicleDetailView } from "@/components/inventory/VehicleDetailView";
import type { Vehicle } from "@/types/inventory";
import { useIsMobile } from "@/hooks/use-mobile";

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onQuoteClick: () => void;
  onInquiryClick: (vehicle: Vehicle) => void;
  onApplyNow: (vehicle: Vehicle) => void;
  shippingQuote?: number | null;
}

export function VehicleDetailsModal({
  vehicle,
  isOpen,
  onClose,
  onQuoteClick,
  onInquiryClick,
  onApplyNow,
  shippingQuote,
}: VehicleDetailsModalProps) {
  const isMobile = useIsMobile();

  if (!vehicle) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      modal={!isMobile}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName={
          isMobile ? "z-30 bg-black/35 pointer-events-none" : undefined
        }
        className={cn(
          "w-full p-0 gap-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-3xl border-border/40 shadow-2xl",
          isMobile
            ? "z-40 !top-3 !bottom-[calc(5.75rem+env(safe-area-inset-bottom))] !left-1/2 !right-auto !w-[calc(100%-1rem)] !max-w-none !-translate-x-1/2 !translate-y-0 rounded-2xl h-auto"
            : "max-w-[95vw] lg:max-w-6xl h-[90vh]",
        )}
      >
        {/* Header - Compact & Clean */}
        <div
          className={cn(
            "flex items-center justify-between border-b bg-background/80 backdrop-blur-md z-20 shrink-0",
            isMobile ? "px-4 py-2" : "px-6 py-3",
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <DialogTitle
                className={cn(
                  "font-bold tracking-tight uppercase flex items-center gap-2",
                  isMobile ? "text-base" : "text-lg",
                )}
              >
                {vehicle.year} {vehicle.make} {vehicle.model}
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-muted-foreground/30"
                >
                  #{vehicle.stockNumber}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">
                {vehicle.trim}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close vehicle details"
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <VehicleDetailView
          vehicle={vehicle}
          onInquiryClick={onInquiryClick}
          onApplyNow={onApplyNow}
          onQuoteClick={onQuoteClick}
          shippingQuote={shippingQuote}
        />
      </DialogContent>
    </Dialog>
  );
}

function ThumbImage({
  src,
  idx,
  active,
  onClick,
}: {
  src: string;
  idx: number;
  active: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border transition-all snap-start bg-muted",
        "w-20 aspect-[4/3]",
        active
          ? "border-primary ring-2 ring-primary/20 opacity-100"
          : "border-transparent opacity-60 hover:opacity-100",
      )}
    >
      {/* Skeleton */}
      {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Thumbnail ${idx + 1}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}
