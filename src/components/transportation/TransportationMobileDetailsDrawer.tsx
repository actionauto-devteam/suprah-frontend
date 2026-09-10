"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Car,
  Check,
  Clock,
  DollarSign,
  ExternalLink,
  Gauge,
  Globe,
  GripVertical,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  Truck,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAlert, AlertDialog } from "@/components/AlertDialog";
import { QuoteLoadRouteCompletionDialog } from "@/components/QuoteLoadRouteCompletionDialog";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { Load } from "@/types/load";
import {
  getQuoteLoadRouteDraft,
  type Quote,
  type QuoteLoadRouteDetails,
} from "@/types/transportation";
import {
  TransportationMobileLoadFinancials,
  TransportationMobileLoadOverview,
  TransportationMobileLoadVehicles,
  type TransportationMobileLoadTab,
} from "@/components/transportation/TransportationMobileLoadDetailSections";
import type { TransportationMobileQuoteTab } from "@/components/transportation/TransportationMobileQuoteCard";
import {
  VehicleImageLightbox,
  type VehicleImageLightboxItem,
} from "@/components/transportation/VehicleImageLightbox";

interface TransportationMobileDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  load?: Load | null;
  quote?: Quote | null;
  initialLoadTab?: TransportationMobileLoadTab;
  initialQuoteTab?: TransportationMobileQuoteTab;
  onViewLoadDetails?: (load: Load) => void;
  onConvertQuoteToLoad?: (
    id: string,
    routeDetails?: QuoteLoadRouteDetails,
  ) => Promise<boolean | void>;
}

const MOBILE_BREAKPOINT = 768;
const RESIZABLE_MIN_VIEWPORT = 430;
const MIN_DRAWER_WIDTH = 320;
const DRAWER_EDGE_GAP = 8;
const DRAWER_WIDTH_STORAGE_KEY = "transportation:mobile-inspector-width:v1";

function formatQuoteStatus(status?: string) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "accepted") return "Accepted";
  if (normalized === "booked") return "Booked";
  if (normalized === "rejected") return "Rejected";
  return "Pending";
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/55 bg-background/45 px-3 py-2.5">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 min-w-0 break-words text-xs font-bold leading-relaxed text-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

function RouteBlock({
  label,
  city,
  state,
  address,
  contact,
  tone,
}: {
  label: "Origin" | "Destination";
  city?: string;
  state?: string;
  address?: string;
  contact?: string;
  tone: "emerald" | "cyan";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/55 bg-background/45 p-3">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em]",
          tone === "emerald" ? "text-emerald-500" : "text-cyan-500",
        )}
      >
        <MapPin className="size-3 shrink-0" /> {label}
      </div>
      <p className="mt-1 break-words text-sm font-black leading-snug text-foreground">
        {[city, state].filter(Boolean).join(", ") || "—"}
      </p>
      {address ? (
        <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">
          {address}
        </p>
      ) : null}
      {contact ? (
        <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <User className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-words">{contact}</span>
        </p>
      ) : null}
    </div>
  );
}

function getDrawerBounds(viewportWidth: number) {
  const maxWidth = Math.max(0, viewportWidth - DRAWER_EDGE_GAP);
  const minWidth = Math.min(MIN_DRAWER_WIDTH, maxWidth);

  if (viewportWidth < RESIZABLE_MIN_VIEWPORT) {
    return {
      minWidth: maxWidth,
      maxWidth,
      defaultWidth: maxWidth,
      canResize: false,
    };
  }

  const defaultWidth = Math.min(
    maxWidth,
    520,
    Math.max(minWidth, Math.round(viewportWidth * 0.72)),
  );

  return {
    minWidth,
    maxWidth,
    defaultWidth,
    canResize: viewportWidth < MOBILE_BREAKPOINT,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function TransportationMobileDetailsDrawer({
  open,
  onClose,
  load,
  quote,
  initialLoadTab = "overview",
  initialQuoteTab = "overview",
  onViewLoadDetails,
  onConvertQuoteToLoad,
}: TransportationMobileDetailsDrawerProps) {
  const [loadTab, setLoadTab] = React.useState<TransportationMobileLoadTab>(initialLoadTab);
  const [quoteTab, setQuoteTab] = React.useState<TransportationMobileQuoteTab>(initialQuoteTab);
  const [quoteRouteOpen, setQuoteRouteOpen] = React.useState(false);
  const [quoteImageViewerOpen, setQuoteImageViewerOpen] = React.useState(false);
  const [isConvertingQuote, setIsConvertingQuote] = React.useState(false);
  const [quoteConvertedThisSession, setQuoteConvertedThisSession] = React.useState(false);
  const { showAlert, alert, hideAlert } = useAlert();
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [drawerWidth, setDrawerWidth] = React.useState<number | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);

  const bounds = React.useMemo(
    () => getDrawerBounds(viewportWidth || (typeof window !== "undefined" ? window.innerWidth : 0)),
    [viewportWidth],
  );

  React.useEffect(() => {
    if (!open) return;
    setLoadTab(initialLoadTab);
    setQuoteTab(initialQuoteTab);
    setQuoteRouteOpen(false);
    setQuoteConvertedThisSession(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, load?._id, quote?._id, initialLoadTab, initialQuoteTab, onClose]);

  React.useEffect(() => {
    if (!open) return;

    const syncViewport = () => {
      const width = window.innerWidth;
      setViewportWidth(width);

      if (width >= MOBILE_BREAKPOINT) {
        onClose();
        return;
      }

      const nextBounds = getDrawerBounds(width);
      setDrawerWidth((current) => {
        if (current == null) {
          let remembered: number | null = null;
          try {
            const stored = Number(window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY));
            if (Number.isFinite(stored) && stored > 0) remembered = stored;
          } catch {
            // Storage preferences are optional; fall back to the natural width.
          }
          return clamp(
            remembered ?? nextBounds.defaultWidth,
            nextBounds.minWidth,
            nextBounds.maxWidth,
          );
        }
        return clamp(current, nextBounds.minWidth, nextBounds.maxWidth);
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, [open, onClose]);

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("transportation:inspector-state", {
        detail: { active: open },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("transportation:inspector-state", {
          detail: { active: false },
        }),
      );
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !bounds.canResize) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      event.preventDefault();
      const nextWidth = resize.startWidth + (resize.startX - event.clientX);
      setDrawerWidth(clamp(nextWidth, bounds.minWidth, bounds.maxWidth));
    };

    const finishResize = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setDrawerWidth((current) => {
        if (current != null) {
          try {
            window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(Math.round(current)));
          } catch {
            // Width persistence is a convenience only.
          }
        }
        return current;
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [open, bounds.canResize, bounds.minWidth, bounds.maxWidth]);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!bounds.canResize) return;
    event.preventDefault();
    event.stopPropagation();
    const currentWidth = drawerWidth ?? bounds.defaultWidth;
    resizeRef.current = {
      startX: event.clientX,
      startWidth: currentWidth,
    };
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const quoteVehicleName = quote
    ? quote.vehicleName ||
      (quote.vehicleId
        ? `${quote.vehicleId.year} ${quote.vehicleId.make} ${quote.vehicleId.modelName}`
        : "Vehicle not linked")
    : "Vehicle";

  const quoteVehicleImage = quote
    ? resolveImageUrl(quote.vehicleImage)
    : undefined;

  const quoteImageViewerItems: VehicleImageLightboxItem[] = quote
    ? [
        {
          id: String(quote.vehicleId?._id ?? quote.vin ?? quote._id),
          src: quoteVehicleImage,
          label: quoteVehicleName,
          subtitle:
            quote.vin || quote.vehicleId?.vin
              ? `VIN ${quote.vin || quote.vehicleId?.vin}`
              : undefined,
        },
      ]
    : [];

  const quoteRouteDraft = React.useMemo(() => {
    if (!quote) return null;
    return getQuoteLoadRouteDraft({
      fromAddress: quote.fromAddress,
      fromZip: quote.fromZip,
      toAddress: quote.toAddress,
      toZip: quote.toZip,
      fromLocation: quote.fromLocation,
      toLocation: quote.toLocation,
    });
  }, [
    quote?.fromAddress,
    quote?.fromZip,
    quote?.toAddress,
    quote?.toZip,
    quote?.fromLocation,
    quote?.toLocation,
  ]);

  const normalizedQuoteStatus = String(quote?.status || "pending").toLowerCase();
  const quoteAlreadyConverted =
    quoteConvertedThisSession || normalizedQuoteStatus === "booked";
  const quoteRejected = normalizedQuoteStatus === "rejected";

  const performQuoteConversion = async (routeDetails: QuoteLoadRouteDetails) => {
    if (!quote || !onConvertQuoteToLoad) return;
    setIsConvertingQuote(true);
    try {
      await onConvertQuoteToLoad(quote._id, routeDetails);
      setQuoteConvertedThisSession(true);
      setQuoteRouteOpen(false);
      hideAlert();
    } catch (error) {
      console.error("Error converting quote to load:", error);
      showAlert({
        type: "error",
        title: "Conversion Failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not convert this quote into a load. Please try again.",
      });
      throw error;
    } finally {
      setIsConvertingQuote(false);
    }
  };

  const handleQuoteConversion = () => {
    if (!quote || !onConvertQuoteToLoad || !quoteRouteDraft) return;

    if (quoteAlreadyConverted) {
      showAlert({
        type: "success",
        title: "Already Converted",
        message: "This quote has already been converted into a load.",
      });
      return;
    }

    if (quoteRejected) {
      showAlert({
        type: "error",
        title: "Rejected Quote",
        message: "Rejected quotes cannot be converted into loads.",
      });
      return;
    }

    if (quoteRouteDraft.needsCompletion) {
      setQuoteRouteOpen(true);
      return;
    }

    showAlert({
      type: "confirm",
      title: "Convert to Load",
      message: `Convert this quote for ${quote.firstName} ${quote.lastName} into a dispatchable load? The quote will remain in your history.`,
      confirmText: "Yes, Convert to Load",
      cancelText: "No, Cancel",
      onConfirm: async () => {
        await performQuoteConversion(quoteRouteDraft.routeDetails);
      },
    });
  };

  if (!open || (!load && !quote) || typeof document === "undefined") return null;

  const isLoad = Boolean(load);
  const title = isLoad ? "Load Details" : "Quote Details";
  const resolvedWidth = drawerWidth ?? bounds.defaultWidth;

  return createPortal(
    <>
      <AlertDialog {...alert} onOpenChange={hideAlert} />
      <aside
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className={cn(
        "fixed right-0 z-[46] flex min-w-0 flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border/70 bg-card/97 shadow-2xl backdrop-blur-xl md:hidden",
        "top-16 bottom-[var(--mobile-bottom-nav-offset,6.25rem)]",
        !isResizing && "transition-[width] duration-150 ease-out",
      )}
      style={{ width: `${Math.max(0, resolvedWidth)}px` }}
    >
      {bounds.canResize ? (
        <button
          type="button"
          onPointerDown={startResize}
          aria-label={`Resize ${isLoad ? "load" : "quote"} details`}
          title="Drag to resize"
          className={cn(
            "absolute inset-y-0 left-0 z-20 w-4 touch-none cursor-col-resize",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50",
          )}
        >
          <span className="absolute left-0 top-1/2 flex h-14 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/95 shadow-md">
            <GripVertical className="size-3 text-muted-foreground" />
          </span>
        </button>
      ) : null}

      <div className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary/80">
            {title}
          </p>
          {load ? (
            <>
              <h2 className="mt-1 break-all font-mono text-base font-black leading-snug text-foreground">
                {load.loadNumber}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="max-w-full px-2 py-0.5 text-[10px] font-black uppercase">
                  {load.status}
                </Badge>
                <span className="inline-flex min-w-0 items-center gap-1 break-words text-[11px] font-bold uppercase text-muted-foreground">
                  {load.additionalInfo?.visibility !== "private" ? (
                    <Globe className="size-3 shrink-0 text-cyan-500" />
                  ) : (
                    <Lock className="size-3 shrink-0" />
                  )}
                  {load.additionalInfo?.visibility !== "private" ? "Public" : "Private"}
                </span>
              </div>
            </>
          ) : quote ? (
            <>
              <h2 className="mt-1 break-words text-base font-black leading-snug text-foreground">
                {quote.firstName} {quote.lastName}
              </h2>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-black uppercase">
                  {formatQuoteStatus(quote.status)}
                </Badge>
                <span className="min-w-0 break-words text-[11px] text-muted-foreground">
                  {quote.vehicleName ||
                    (quote.vehicleId
                      ? `${quote.vehicleId.year} ${quote.vehicleId.make} ${quote.vehicleId.modelName}`
                      : "")}
                </span>
              </div>
            </>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-11 shrink-0 rounded-full touch-manipulation"
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
      </div>

      {load || quote ? (
        <div className="min-w-0 shrink-0 border-b border-border/60 bg-background/35 px-3 py-2">
          <div className="grid min-w-0 grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1">
            {load
              ? (
                  [
                    ["overview", "Overview"],
                    ["vehicles", "Vehicles"],
                    ["financials", "Financials"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLoadTab(key)}
                    className={cn(
                      "min-h-11 min-w-0 rounded-lg px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.05em] transition-colors touch-manipulation",
                      "whitespace-normal break-words leading-tight",
                      loadTab === key
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))
              : (
                  [
                    ["overview", "Overview"],
                    ["vehicle", "Vehicle"],
                    ["financials", "Financials"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuoteTab(key)}
                    className={cn(
                      "min-h-11 min-w-0 rounded-lg px-2 py-2.5 text-[11px] font-black uppercase tracking-[0.05em] transition-colors touch-manipulation",
                      "whitespace-normal break-words leading-tight",
                      quoteTab === key
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 custom-scrollbar">
        {load && loadTab === "overview" ? (
          <TransportationMobileLoadOverview load={load} />
        ) : null}

        {load && loadTab === "vehicles" ? (
          <TransportationMobileLoadVehicles load={load} />
        ) : null}

        {load && loadTab === "financials" ? (
          <TransportationMobileLoadFinancials load={load} />
        ) : null}

        {quote && quoteTab === "overview" ? (
          <div className="min-w-0 space-y-3.5">
            <div className="grid grid-cols-1 gap-2">
              <RouteBlock
                label="Origin"
                city={quote.fromLocation?.city}
                state={quote.fromLocation?.state}
                address={quote.fromAddress}
                tone="emerald"
              />
              <RouteBlock
                label="Destination"
                city={quote.toLocation?.city}
                state={quote.toLocation?.state}
                address={quote.toAddress}
                tone="cyan"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-cyan-500/40 bg-linear-to-br from-cyan-500/9 via-background to-blue-500/2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Estimated Transit
                </span>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-black uppercase">
                  {formatQuoteStatus(quote.status)}
                </Badge>
              </div>

              <div className="mt-3 flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10">
                  <Clock className="size-4.5 text-cyan-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-cyan-600 dark:text-cyan-400">
                    ETA
                  </p>
                  <p className="mt-1 break-words text-xl font-black leading-tight tracking-tight text-foreground">
                    {quote.eta.min}–{quote.eta.max} DAYS
                  </p>
                  <p className="mt-1.5 break-words text-[11px] leading-relaxed text-muted-foreground">
                    Current estimated transit window for this quote.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <DetailField
                label="Distance"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Gauge className="size-3.5 text-amber-500" />
                    {quote.miles.toLocaleString()} MI
                  </span>
                }
              />
              <DetailField
                label="Transport Type"
                value={quote.enclosedTrailer ? "Enclosed" : "Open"}
              />
            </div>

            <section className="rounded-xl border border-border/60 bg-background/45 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                Customer
              </p>
              <p className="mt-1 break-words text-sm font-black text-foreground">
                {quote.firstName} {quote.lastName}
              </p>
              <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                {quote.phone ? (
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-primary/70" />
                    <span className="break-all">{quote.phone}</span>
                  </p>
                ) : null}
                {quote.email ? (
                  <p className="flex min-w-0 items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0 text-primary/70" />
                    <span className="break-all">{quote.email}</span>
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {quote && quoteTab === "vehicle" ? (
          <div className="min-w-0 space-y-3.5">
            <section className="overflow-hidden rounded-2xl border border-emerald-500/35 bg-linear-to-br from-emerald-500/8 via-background to-background">
              <button
                type="button"
                onClick={() => setQuoteImageViewerOpen(true)}
                aria-label="View full quote vehicle image"
                className="group/image relative block w-full overflow-hidden border-b border-border/50 bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
              >
                {quoteVehicleImage ? (
                  <img
                    src={quoteVehicleImage}
                    alt={quoteVehicleName}
                    loading="lazy"
                    className="h-44 w-full object-contain object-center transition-transform duration-300 group-hover/image:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 bg-linear-to-br from-emerald-950/20 via-muted/20 to-cyan-950/20">
                    <Car className="size-8 text-muted-foreground/45" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      No photo on file
                    </span>
                  </div>
                )}
                <span className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur-sm">
                  <Maximize2 className="size-4" />
                </span>
              </button>

              <div className="flex items-center gap-3 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                  <Car className="size-5 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    Quote Vehicle
                  </p>
                  <p className="mt-1 break-words text-base font-black leading-snug text-foreground">
                    {quoteVehicleName}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Units" value={`${quote.units ?? 1}`} />
              <DetailField
                label="Vehicle Status"
                value={quote.vehicleInoperable ? "Inoperable" : "Operable"}
              />
              <DetailField
                label="Stock Number"
                value={quote.stockNumber || quote.vehicleId?.stockNumber || "—"}
              />
              <DetailField
                label="Trailer"
                value={quote.enclosedTrailer ? "Enclosed" : "Open"}
              />
            </div>

            {quote.vin || quote.vehicleId?.vin ? (
              <section className="rounded-xl border border-border/60 bg-background/45 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                  VIN
                </p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-foreground">
                  {quote.vin || quote.vehicleId?.vin}
                </p>
              </section>
            ) : null}
          </div>
        ) : null}

        {quote && quoteTab === "financials" ? (
          <div className="min-w-0 space-y-3.5">
            <section className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-linear-to-br from-emerald-500/9 via-background to-emerald-500/2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Quote Financials
                </span>
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-black uppercase">
                  {formatQuoteStatus(quote.status)}
                </Badge>
              </div>

              <div className="mt-3 flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                  <DollarSign className="size-4.5 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                    Quote Rate
                  </p>
                  <p className="mt-1 break-words text-2xl font-black leading-tight tracking-tight text-emerald-600 dark:text-emerald-400">
                    ${quote.rate.toLocaleString()}
                  </p>
                  <p className="mt-1.5 break-words text-[11px] leading-relaxed text-muted-foreground">
                    Current quoted transportation amount.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Units" value={`${quote.units ?? 1}`} />
              <DetailField label="Distance" value={`${quote.miles.toLocaleString()} MI`} />
              <DetailField
                label="Transport Type"
                value={quote.enclosedTrailer ? "Enclosed" : "Open"}
              />
              <DetailField
                label="Status"
                value={formatQuoteStatus(quote.status)}
              />
            </div>

            <section className="rounded-xl border border-border/60 bg-background/45 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
                Customer
              </p>
              <p className="mt-1 break-words text-sm font-black text-foreground">
                {quote.firstName} {quote.lastName}
              </p>
              {quote.organization?.name ? (
                <p className="mt-1 break-words text-[11px] text-muted-foreground">
                  {quote.organization.name}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>

      {load && onViewLoadDetails ? (
        <div className="min-w-0 shrink-0 border-t border-border/60 bg-card p-3">
          <Button
            type="button"
            onClick={() => onViewLoadDetails(load)}
            className="h-11 w-full gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 touch-manipulation"
          >
            <ExternalLink className="size-4 shrink-0" />
            <span className="min-w-0 break-words">View Details</span>
          </Button>
        </div>
      ) : quote && onConvertQuoteToLoad ? (
        <div className="min-w-0 shrink-0 border-t border-border/60 bg-card p-3">
          <Button
            type="button"
            onClick={handleQuoteConversion}
            disabled={isConvertingQuote || quoteAlreadyConverted || quoteRejected}
            className={cn(
              "h-11 w-full gap-2 rounded-xl font-bold touch-manipulation",
              quoteAlreadyConverted || quoteRejected
                ? "bg-muted text-muted-foreground hover:bg-muted"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {isConvertingQuote ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : quoteAlreadyConverted ? (
              <Check className="size-4 shrink-0" />
            ) : (
              <Truck className="size-4 shrink-0" />
            )}
            <span className="min-w-0 break-words">
              {quoteAlreadyConverted
                ? "Converted to Load"
                : quoteRejected
                  ? "Rejected Quote"
                  : isConvertingQuote
                    ? "Converting…"
                    : "Convert to Load"}
            </span>
          </Button>
        </div>
      ) : null}
      </aside>

      <VehicleImageLightbox
        open={quoteImageViewerOpen}
        onOpenChange={setQuoteImageViewerOpen}
        items={quoteImageViewerItems}
        initialIndex={0}
      />

      {quote ? (
        <QuoteLoadRouteCompletionDialog
          open={quoteRouteOpen}
          onOpenChange={setQuoteRouteOpen}
          quote={quote}
          isSubmitting={isConvertingQuote}
          onConfirm={performQuoteConversion}
        />
      ) : null}
    </>,
    document.body,
  );
}

export type { TransportationMobileLoadTab };