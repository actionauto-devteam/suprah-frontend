"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VehicleDetailView } from "@/components/inventory/VehicleDetailView";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Vehicle } from "@/types/inventory";

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onQuoteClick: () => void;
  onInquiryClick: (vehicle: Vehicle) => void;
  onApplyNow: (vehicle: Vehicle) => void;
  onCreateLoad?: (vehicle: Vehicle) => void;
  shippingQuote?: number | null;
  onBookTestDrive?: () => void;
  isComparing?: boolean;
  onToggleCompare?: (vehicleId: string) => void;
  /**
   * Defaults to the existing full-screen mobile detail surface. Inventory and
   * Shop opt into the non-blocking inspector; Saved Vehicles and other callers
   * keep their current behavior unless they explicitly request otherwise.
   */
  mobilePresentation?: "fullscreen" | "inspector";
}

const MOBILE_DRAWER_MIN_VISIBLE_PAGE = 44;
const MOBILE_DRAWER_MIN_CONTENT_WIDTH = 300;
const MOBILE_DRAWER_DEFAULT_RATIO = 0.78;
const MOBILE_DRAWER_COMPACT_RATIO = 0.7;
const MOBILE_DRAWER_WIDE_RATIO = 0.9;

function clampDrawerWidth(width: number, viewportWidth: number) {
  const maxWidth = Math.max(240, viewportWidth - MOBILE_DRAWER_MIN_VISIBLE_PAGE);
  const minWidth = Math.min(MOBILE_DRAWER_MIN_CONTENT_WIDTH, maxWidth);
  return Math.min(Math.max(width, minWidth), maxWidth);
}

export function VehicleDetailsModal({
  vehicle,
  isOpen,
  onClose,
  onQuoteClick,
  onInquiryClick,
  onApplyNow,
  onCreateLoad,
  shippingQuote,
  onBookTestDrive,
  isComparing,
  onToggleCompare,
  mobilePresentation = "fullscreen",
}: VehicleDetailsModalProps) {
  const isMobile = useIsMobile();
  const [drawerWidth, setDrawerWidth] = React.useState<number | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  const getViewportWidth = React.useCallback(
    () => (typeof window !== "undefined" ? window.innerWidth : 390),
    [],
  );

  const resetDrawerWidth = React.useCallback(() => {
    const viewportWidth = getViewportWidth();
    setDrawerWidth(
      clampDrawerWidth(viewportWidth * MOBILE_DRAWER_DEFAULT_RATIO, viewportWidth),
    );
  }, [getViewportWidth]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsResizing(false);
      resizeRef.current = null;
      return;
    }

    if (isMobile && mobilePresentation === "inspector") {
      resetDrawerWidth();
    }
  }, [isMobile, isOpen, mobilePresentation, resetDrawerWidth]);

  React.useEffect(() => {
    if (!isOpen || mobilePresentation !== "inspector") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mobilePresentation, onClose]);

  React.useEffect(() => {
    if (!isMobile || !isOpen || mobilePresentation !== "inspector") return;

    const notify = (active: boolean) => {
      window.dispatchEvent(
        new CustomEvent("inventory:inspector-state", { detail: { active } }),
      );
    };

    notify(true);
    return () => notify(false);
  }, [isMobile, isOpen, mobilePresentation]);

  React.useEffect(() => {
    if (!isMobile || mobilePresentation !== "inspector") return;

    const handleViewportResize = () => {
      const viewportWidth = getViewportWidth();
      setDrawerWidth((current) =>
        clampDrawerWidth(
          current ?? viewportWidth * MOBILE_DRAWER_DEFAULT_RATIO,
          viewportWidth,
        ),
      );
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [getViewportWidth, isMobile, mobilePresentation]);

  React.useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeRef.current;
      if (!resizeState) return;

      const viewportWidth = getViewportWidth();
      const nextWidth =
        resizeState.startWidth + (resizeState.startX - event.clientX);
      setDrawerWidth(clampDrawerWidth(nextWidth, viewportWidth));
    };

    const stopResize = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [getViewportWidth, isResizing]);

  const beginResize = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const viewportWidth = getViewportWidth();
      const currentWidth = clampDrawerWidth(
        drawerWidth ?? viewportWidth * MOBILE_DRAWER_DEFAULT_RATIO,
        viewportWidth,
      );
      resizeRef.current = {
        startX: event.clientX,
        startWidth: currentWidth,
      };
      setIsResizing(true);
    },
    [drawerWidth, getViewportWidth],
  );

  const toggleDrawerWidth = React.useCallback(() => {
    const viewportWidth = getViewportWidth();
    const currentWidth = clampDrawerWidth(
      drawerWidth ?? viewportWidth * MOBILE_DRAWER_DEFAULT_RATIO,
      viewportWidth,
    );
    const currentRatio = currentWidth / viewportWidth;
    const nextRatio =
      currentRatio > 0.8 ? MOBILE_DRAWER_COMPACT_RATIO : MOBILE_DRAWER_WIDE_RATIO;
    setDrawerWidth(clampDrawerWidth(viewportWidth * nextRatio, viewportWidth));
  }, [drawerWidth, getViewportWidth]);

  if (!vehicle || !isOpen) return null;

  if (
    isMobile &&
    mobilePresentation === "inspector" &&
    typeof document !== "undefined"
  ) {
    const viewportWidth = getViewportWidth();
    const resolvedWidth = clampDrawerWidth(
      drawerWidth ?? viewportWidth * MOBILE_DRAWER_DEFAULT_RATIO,
      viewportWidth,
    );
    const isWide = resolvedWidth / viewportWidth > 0.8;

    return createPortal(
      <section
        role="dialog"
        aria-modal="false"
        aria-label={`${vehicle.year} ${vehicle.make} ${vehicle.model} quick inspector`}
        data-mobile-vehicle-inspector="true"
        className={cn(
          "fixed right-0 z-[46] flex flex-col overflow-hidden rounded-l-3xl border border-r-0 border-border/60 bg-background",
          "shadow-[-18px_0_50px_rgba(0,0,0,0.30)]",
          !isResizing && "transition-[width] duration-250 ease-out",
        )}
        style={{
          top: "4rem",
          bottom: "var(--mobile-bottom-nav-offset, 6.25rem)",
          width: `${resolvedWidth}px`,
          maxWidth: `calc(100vw - ${MOBILE_DRAWER_MIN_VISIBLE_PAGE}px)`,
        }}
      >
        <button
          type="button"
          onPointerDown={beginResize}
          className={cn(
            "absolute inset-y-0 left-0 z-30 flex w-4 touch-none cursor-ew-resize items-center justify-center",
            "bg-transparent text-muted-foreground/45 transition-colors hover:bg-primary/5 hover:text-primary",
            isResizing && "bg-primary/8 text-primary",
          )}
          aria-label="Resize vehicle inspector"
          title="Drag to resize vehicle inspector"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="relative flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-background/95 pl-6 pr-2 py-1.5 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary/80">
              Vehicle Inspector
            </p>
            <p className="text-[9px] leading-tight text-muted-foreground">
              Resize · inventory stays available
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleDrawerWidth}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={isWide ? "Use compact vehicle inspector" : "Use wider vehicle inspector"}
            >
              {isWide ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close vehicle inspector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pl-1">
          <VehicleDetailView
            vehicle={vehicle}
            onInquiryClick={onInquiryClick}
            onApplyNow={onApplyNow}
            onCreateLoad={onCreateLoad}
            onQuoteClick={onQuoteClick}
            shippingQuote={shippingQuote}
            compactHeader
            onBookTestDrive={onBookTestDrive}
            isComparing={isComparing}
            onToggleCompare={onToggleCompare}
          />
        </div>
      </section>,
      document.body,
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex min-h-0 flex-col gap-0 overflow-hidden border-border/30 bg-background p-0 shadow-2xl",
          /* Mobile: preserve the existing true full-screen behavior by default. */
          "fixed inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none",
          /* Desktop: preserve the existing centered detail surface. */
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
          "lg:h-[90vh] lg:w-[90vw] lg:max-w-6xl lg:rounded-2xl",
        )}
      >
        <DialogTitle className="sr-only">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </DialogTitle>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close vehicle details"
          className={cn(
            "absolute z-50 flex items-center justify-center rounded-full",
            "bg-black/50 text-white backdrop-blur-md transition-all",
            "hover:bg-black/80 active:scale-95",
            "right-3 top-3 h-9 w-9",
            "lg:right-4 lg:top-4 lg:h-10 lg:w-10",
          )}
        >
          <X className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-hidden">
          <VehicleDetailView
            vehicle={vehicle}
            onInquiryClick={onInquiryClick}
            onApplyNow={onApplyNow}
            onCreateLoad={onCreateLoad}
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