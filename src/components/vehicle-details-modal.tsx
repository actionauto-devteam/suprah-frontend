"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VehicleDetailView } from "@/components/inventory/VehicleDetailView";
import type { Vehicle } from "@/types/inventory";

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onQuoteClick: () => void;
  onInquiryClick: (vehicle: Vehicle) => void;
  onApplyNow: (vehicle: Vehicle) => void;
  shippingQuote?: number | null;
  onBookTestDrive?: () => void;
  isComparing?: boolean;
  onToggleCompare?: (vehicleId: string) => void;
}

export function VehicleDetailsModal({
  vehicle,
  isOpen,
  onClose,
  onQuoteClick,
  onInquiryClick,
  onApplyNow,
  shippingQuote,
  onBookTestDrive,
  isComparing,
  onToggleCompare,
}: VehicleDetailsModalProps) {
  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col bg-background border-border/30 shadow-2xl",
          /* Mobile: true full-screen */
          "fixed inset-0 h-dvh w-screen max-w-none rounded-none translate-x-0 translate-y-0 left-0 top-0",
          /* Desktop: large centered sheet with subtle rounding */
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
          "lg:w-[96vw] lg:max-w-7xl lg:h-[94vh] lg:rounded-2xl",
        )}
      >
        <DialogTitle className="sr-only">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </DialogTitle>

        {/* Floating close button — sits above gallery */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close vehicle details"
          className={cn(
            "absolute z-50 flex items-center justify-center rounded-full",
            "bg-black/50 text-white backdrop-blur-md transition-all",
            "hover:bg-black/80 active:scale-95",
            "h-9 w-9 right-3 top-3",
            "lg:h-10 lg:w-10 lg:right-4 lg:top-4",
          )}
        >
          <X className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>

        {/* Scrollable content — VehicleDetailView fills everything */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <VehicleDetailView
            vehicle={vehicle}
            onInquiryClick={onInquiryClick}
            onApplyNow={onApplyNow}
            onQuoteClick={onQuoteClick}
            shippingQuote={shippingQuote}
            compactHeader
            onBookTestDrive={onBookTestDrive}
            isComparing={isComparing}
            onToggleCompare={onToggleCompare}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
