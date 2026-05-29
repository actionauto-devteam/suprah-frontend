"use client";

import * as React from "react";
import {
  Share2,
  Gauge,
  FileText,
  Fuel,
  MapPin,
  X,
  Copy,
  Check,
  Lock,
  ClipboardList,
  History,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Vehicle } from "@/types/inventory";
import { useOrg } from "@/hooks/useOrg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolveImageUrl } from "@/lib/utils";

interface VehicleDetailViewProps {
  vehicle: Vehicle;
  onInquiryClick?: (vehicle: Vehicle) => void;
  onApplyNow?: (vehicle: Vehicle) => void;
  onQuoteClick?: () => void;
  shippingQuote?: number | null;
  isPublic?: boolean;
}

// Helper to standardise comment formatting dynamically
function cleanVehicleDescription(
  text: string,
  vehicleInfo?: {
    year?: number;
    make?: string;
    model?: string;
    modelName?: string;
  },
) {
  if (!text) return "";

  let cleaned = text
    // Remove known system placeholders
    .replace(/\{Equipment Bulleted\}/gi, "")
    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    // Ensure sentence endings have proper breaks if followed by a starting capital
    .replace(/([.!?])\s+([A-Z][a-z])/g, "$1\n\n$2")
    // Detect "Label: Value" or Headers and ensure they start on new lines
    // e.g. "LEHI: 123 St" -> "\n\nLEHI: 123 St"
    .replace(/(^|\s)([A-Z]{2,}(?:\s[A-Z]{2,})*:)/g, "\n\n$2")
    // Detect common transition phrases even if not in all caps
    .replace(
      /(Disclaimer:|Pre-owned vehicle pricing|ALL PRICES ARE FINAL|PLEASE CALL TO SCHEDULE|View the Carketa)/gi,
      "\n\n$1",
    )
    // Normalize various bullet symbols to a standard dash
    .replace(/^\s*[-•*]\s*/gm, "\n- ")
    // Fix cases where bullets were smashed into text: "end.- Next" -> "end.\n- Next"
    .replace(/([a-z0-9])([.!?])\s?-\s?([A-Z])/g, "$1$2\n- $3")
    // Collapse excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Redundancy check: If the comment is just the vehicle name again
  const vYear = vehicleInfo?.year;
  const vMake = vehicleInfo?.make;
  const vModel = vehicleInfo?.model || vehicleInfo?.modelName;

  if (vYear && vMake && vModel) {
    const namePattern = new RegExp(
      `^${vYear}\\s+${vMake}\\s+${vModel}(\\s+with)?$`,
      "i",
    );
    if (namePattern.test(cleaned)) {
      return "";
    }
  }

  return cleaned.length < 5 ? "" : cleaned;
}

// Sub-component for truncation and formatting
function ExpandableText({
  text,
  limit = 400,
  vehicle,
}: {
  text: string;
  limit?: number;
  vehicle?: Vehicle;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const cleanedText = React.useMemo(
    () => cleanVehicleDescription(text, vehicle),
    [text, vehicle],
  );

  if (!cleanedText) return null;

  const needsTruncation = cleanedText.length > limit;
  const rawDisplayText = isExpanded ? cleanedText : cleanedText.slice(0, limit);

  // Split into paragraphs/blocks based on double newlines
  const blocks = rawDisplayText
    .split(/\n\n+/)
    .filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground leading-relaxed text-left space-y-4">
        {blocks.map((block, bIdx) => {
          const lines = block.split("\n").filter((l) => l.trim().length > 0);
          const isLastBlock = bIdx === blocks.length - 1;

          // If a block contains lines starting with a bullet, render it as a list
          if (lines.some((l) => l.trim().startsWith("-"))) {
            return (
              <div key={bIdx} className="space-y-1.5">
                {lines.map((line, lIdx) => {
                  const isLastLine = isLastBlock && lIdx === lines.length - 1;
                  return (
                    <div key={lIdx} className="flex gap-2 ml-1">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <div className="flex-1">
                        {line.trim().replace(/^- \s*/, "")}
                        {isLastLine && !isExpanded && needsTruncation && "..."}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={bIdx} className="whitespace-pre-wrap">
              {block.trim()}
              {isLastBlock && !isExpanded && needsTruncation && "..."}
            </p>
          );
        })}
      </div>

      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 mt-1"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
}

export function VehicleDetailView({
  vehicle,
  onInquiryClick,
  onApplyNow,
  onQuoteClick,
  shippingQuote,
  isPublic = false,
}: VehicleDetailViewProps) {
  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=2636&auto=format&fit=crop";
  const { userRole, isSuperAdmin } = useOrg();
  const isAdmin =
    userRole === "admin" || userRole === "super_admin" || isSuperAdmin;
  const allImages = React.useMemo(() => {
    const rawCandidates = [vehicle.image, ...(vehicle.images || [])]
      .map((source) => resolveImageUrl(source)?.trim())
      .filter((source): source is string =>
        Boolean(source && source.length > 0),
      );

    const uniqueCandidates = Array.from(new Set(rawCandidates));
    return uniqueCandidates.length > 0 ? uniqueCandidates : [FALLBACK_IMAGE];
  }, [vehicle.image, vehicle.images]);

  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [mainImageLoaded, setMainImageLoaded] = React.useState(false);
  const [mainImageError, setMainImageError] = React.useState(false);
  const [loadedThumbIndexes, setLoadedThumbIndexes] = React.useState<
    Record<number, boolean>
  >({});
  const [failedThumbIndexes, setFailedThumbIndexes] = React.useState<
    Record<number, boolean>
  >({});
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    console.log("[DEBUG] Vehicle Detail View Data:", {
      id: vehicle.id,
      vin: vehicle.vin,
      hasComments: !!vehicle.comments,
      commentsLength: vehicle.comments?.length,
      comments: vehicle.comments,
      allKeys: Object.keys(vehicle),
    });
  }, [vehicle]);

  React.useEffect(() => {
    setActiveImageIndex(0);
    setMainImageLoaded(false);
    setMainImageError(false);
    setLoadedThumbIndexes({});
    setFailedThumbIndexes({});
  }, [vehicle.id, allImages]);

  const activeImage = allImages[activeImageIndex] || FALLBACK_IMAGE;
  const locationFromApi = (vehicle.location || "").trim();
  const dealerCity = ((vehicle as any).dealerCity || "").trim();
  const dealerState = ((vehicle as any).dealerState || "").trim();
  const dealerZip = ((vehicle as any).dealerZip || "").trim();
  const fallbackDealerLocation = [dealerCity, dealerState, dealerZip]
    .filter(Boolean)
    .join(", ");
  const hasKnownLocation =
    Boolean(locationFromApi) && !/^unknown$/i.test(locationFromApi);
  const displayLocation =
    (hasKnownLocation ? locationFromApi : "") ||
    fallbackDealerLocation ||
    "Orem, UT";
  const locationMapQuery = `Action Auto Utah ${displayLocation}`;

  const handleMainImageError = () => {
    if (activeImageIndex < allImages.length - 1) {
      setActiveImageIndex((prev) => prev + 1);
      setMainImageLoaded(false);
      return;
    }

    setMainImageError(true);
    setMainImageLoaded(true);
  };

  const handleThumbnailError = (index: number) => {
    setFailedThumbIndexes((prev) => ({ ...prev, [index]: true }));
  };

  // Share modal state
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareRecipients, setShareRecipients] = React.useState("");
  const [sharePermission, setSharePermission] = React.useState<
    "view" | "manage"
  >("view");
  const [shareNote, setShareNote] = React.useState("");
  const [shareLinkCopied, setShareLinkCopied] = React.useState(false);

  const handleShare = () => setShareOpen(true);

  const handleCopyVehicleLink = async () => {
    const url = `${window.location.origin}/vehicle/${vehicle.id}`;
    await navigator.clipboard.writeText(url);
    setShareLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  const handleShareAccess = () => {
    if (!shareRecipients.trim()) {
      toast.error("Please enter at least one recipient email.");
      return;
    }
    toast.success("Share invitation sent!");
    setShareOpen(false);
    setShareRecipients("");
    setShareNote("");
    setSharePermission("view");
  };

  const handleDirections = () => {
    const destination = encodeURIComponent(locationMapQuery);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank",
    );
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-muted/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full">
          {/* LEFT COLUMN: Gallery & Core Details (8 cols) */}
          <div className="lg:col-span-8 p-6 lg:p-8 space-y-6 flex flex-col">
            {/* Gallery Section */}
            <div className="space-y-3">
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border border-border/50 relative group">
                {!mainImageLoaded && !mainImageError && (
                  <div className="absolute inset-0 z-10 bg-zinc-900/40 animate-pulse" />
                )}
                {!mainImageError ? (
                  <img
                    key={`${vehicle.id}-${activeImageIndex}`}
                    src={activeImage}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setMainImageLoaded(true)}
                    onError={handleMainImageError}
                    className={`h-full w-full object-contain transition-opacity duration-300 ${mainImageLoaded ? "opacity-100" : "opacity-0"}`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80 bg-zinc-900/60">
                    Main image unavailable
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                  Action Auto Utah
                </div>
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 snap-x">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setMainImageLoaded(false);
                        setMainImageError(false);
                      }}
                      className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md border transition-all snap-start ${
                        activeImageIndex === idx
                          ? "border-primary ring-2 ring-primary/20 opacity-100"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      {!loadedThumbIndexes[idx] && !failedThumbIndexes[idx] && (
                        <div className="absolute inset-0 bg-muted animate-pulse" />
                      )}
                      {!failedThumbIndexes[idx] ? (
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          onLoad={() =>
                            setLoadedThumbIndexes((prev) => ({
                              ...prev,
                              [idx]: true,
                            }))
                          }
                          onError={() => handleThumbnailError(idx)}
                          className={`h-full w-full object-cover transition-opacity duration-200 ${loadedThumbIndexes[idx] ? "opacity-100" : "opacity-0"}`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
                          No image
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Key Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-background p-3 rounded-lg border shadow-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Gauge className="w-3 h-3" /> Mileage
                </div>
                <div className="font-semibold text-sm">
                  {vehicle.mileage !== undefined && vehicle.mileage !== null
                    ? `${vehicle.mileage.toLocaleString()} mi`
                    : "N/A"}
                </div>
              </div>
              <div className="bg-background p-3 rounded-lg border shadow-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Fuel className="w-3 h-3" /> Engine
                </div>
                <div
                  className="font-semibold text-sm truncate"
                  title={vehicle.fuelType || (vehicle as any).engine}
                >
                  {vehicle.fuelType || (vehicle as any).engine || "Standard"}
                </div>
              </div>
              <div className="bg-background p-3 rounded-lg border shadow-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText className="w-3 h-3" /> Transmission
                </div>
                <div
                  className="font-semibold text-sm truncate"
                  title={vehicle.transmission}
                >
                  {vehicle.transmission || "Standard"}
                </div>
              </div>
              <div className="bg-background p-3 rounded-lg border shadow-sm">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 mb-1">
                  <Share2 className="w-3 h-3" /> Drivetrain
                </div>
                <div className="font-semibold text-sm truncate">
                  {vehicle.driveTrain ||
                    ([
                      "HARLEY DAVIDSON",
                      "INDIAN",
                      "DUCATI",
                      "HONDA MOTORCYCLE",
                    ].includes(vehicle.make?.toUpperCase() || "")
                      ? "RWD"
                      : "Standard")}
                </div>
              </div>
            </div>

            {/* Description / Additional Info */}
            <div className="bg-background p-5 rounded-xl border shadow-sm space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Vehicle Overview
              </h3>
              {vehicle.comments &&
              cleanVehicleDescription(vehicle.comments, vehicle).length > 0 ? (
                <ExpandableText text={vehicle.comments} vehicle={vehicle} />
              ) : (
                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    This {vehicle.year} {vehicle.make} {vehicle.model}
                    {vehicle.trim ? ` ${vehicle.trim}` : ""} is finished in a{" "}
                    {vehicle.exteriorColor || vehicle.color || "stunning"}{" "}
                    exterior.
                  </p>
                  <p>
                    {hasKnownLocation
                      ? `Currently located at our ${displayLocation} dealership, this vehicle `
                      : "This vehicle "}
                    is professionally inspected and{" "}
                    {vehicle.status?.toLowerCase() === "ready"
                      ? "ready for immediate delivery"
                      : "is currently available"}
                    .
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-y-2 gap-x-8 pt-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b pb-1">
                  <span>VIN</span>
                  <span className="font-mono text-foreground">
                    {vehicle.vin}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Stock #</span>
                  <span className="font-mono text-foreground">
                    {vehicle.stockNumber}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Interior</span>
                  <span className="text-foreground">
                    {vehicle.interiorColor || "Standard"}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>Exterior</span>
                  <span className="text-foreground">
                    {vehicle.exteriorColor || vehicle.color}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Specific: Internal Notes Section */}
            {isAdmin && vehicle.notes && vehicle.notes.length > 0 && (
              <div className="bg-background/50 p-5 rounded-xl border border-primary/20 shadow-sm space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                  <ClipboardList className="w-4 h-4" /> Internal Staff Notes
                </h3>
                <div className="space-y-3">
                  {vehicle.notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/20 p-3 rounded-lg text-xs space-y-1 border border-border/50"
                    >
                      <div className="flex justify-between items-center opacity-70">
                        <span className="font-bold">
                          {note.author?.name || "Staff Member"}
                        </span>
                        <span>
                          {note.date
                            ? new Date(note.date).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed italic">
                        "{note.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) - Sticky on Desktop */}
          <div className="lg:col-span-4 bg-background border-l shadow-sm lg:min-h-full">
            <div className="p-6 space-y-6 lg:sticky lg:top-0">
              {/* Pricing Block */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Our Price
                </p>
                <div className="text-4xl font-black text-primary tracking-tight">
                  ${vehicle.price?.toLocaleString()}
                </div>
                {shippingQuote && (
                  <div className="mt-2 text-sm font-medium text-green-600 flex items-center gap-1.5 animate-in slide-in-from-top-2 fade-in">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                    Shipping:{" "}
                    <span className="font-bold">
                      ${shippingQuote.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Admin Specific: Internal Cost Dashboard */}
              {isAdmin && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-right-2 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-tighter flex items-center gap-1.5 text-primary">
                      <Lock className="w-3.5 h-3.5" /> Staff Financials
                    </span>
                    <Badge
                      variant="default"
                      className="text-[9px] h-4 bg-primary/20 text-primary border-transparent"
                    >
                      Admin Eyes Only
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">
                        Dealer Cost
                      </p>
                      <p className="text-lg font-black tracking-tight">
                        ${vehicle.cost?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">
                        Potential Profit
                      </p>
                      <p className="text-lg font-black tracking-tight text-green-600">
                        $
                        {(
                          (vehicle.price || 0) - (vehicle.cost || 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <History className="w-3 h-3" /> Recon Stage
                      </span>
                      <span className="text-primary">
                        {vehicle.currentStep || "Ready"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-1000"
                        style={{ width: "75%" }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-tight italic">
                      {vehicle.status === "In Recon"
                        ? "Vehicle is currently moving through the reconditioning pipeline."
                        : "Vehicle completed recon and is live."}
                    </p>
                  </div>
                </div>
              )}

              {/* Public Status Card (Simplified for Customers) */}
              {!isAdmin && (
                <div className="bg-muted/10 border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" /> Status
                    </span>
                    {vehicle.status && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 h-5 bg-background"
                      >
                        {vehicle.status}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Availability
                      </span>
                      <span className="font-medium">
                        {vehicle.status || "Checking..."}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>Listed Locally</span>
                      <span>Ready for Sale</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {onQuoteClick && (
                  <Button
                    size="lg"
                    className="w-full text-sm font-bold shadow-md h-11"
                    onClick={onQuoteClick}
                  >
                    Calculate Shipping
                  </Button>
                )}
                {onInquiryClick && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-11 border-2 font-semibold text-sm"
                    onClick={() => onInquiryClick(vehicle)}
                  >
                    Check Availability
                  </Button>
                )}
                {onApplyNow && (
                  <Button
                    size="lg"
                    className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-bold text-sm shadow-lg"
                    onClick={() => onApplyNow(vehicle)}
                  >
                    Apply For Financing
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground hover:text-foreground border"
                    onClick={handleDirections}
                  >
                    <MapPin className="w-3 h-3 mr-1.5" /> Directions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground hover:text-foreground border flex items-center justify-center gap-1.5"
                    onClick={handleShare}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Location Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Location
                </h4>
                <div className="rounded-xl overflow-hidden border border-border/50 shadow-sm bg-muted/20 hover:shadow-md transition-shadow group">
                  <iframe
                    title="Vehicle Location"
                    width="100%"
                    height="180"
                    style={{
                      filter: "grayscale(20%) contrast(1.2) opacity(0.9)",
                    }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(locationMapQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    className="w-full h-[180px] object-cover"
                  />
                  <div className="p-3 bg-background flex items-center justify-between border-t border-border/50">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">Action Auto Utah</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {displayLocation}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2 gap-1.5"
                      onClick={handleDirections}
                    >
                      <MapPin className="h-3 w-3" /> Open Maps
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share Vehicle Modal ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-primary" />
              Share Vehicle
            </DialogTitle>
            <DialogDescription>
              Invite team members or customers to view the {vehicle.year}{" "}
              {vehicle.make} {vehicle.model} and choose their permission level.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="share-recipients"
                className="text-xs font-semibold uppercase text-muted-foreground"
              >
                Recipient Emails
              </label>
              <Textarea
                id="share-recipients"
                value={shareRecipients}
                onChange={(e) => setShareRecipients(e.target.value)}
                placeholder="manager@actionauto.com, saleslead@actionauto.com"
                className="min-h-20"
              />
              <p className="text-xs text-muted-foreground">
                Use commas, spaces, or new lines to add multiple recipients.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="share-permission"
                className="text-xs font-semibold uppercase text-muted-foreground"
              >
                Permission
              </label>
              <select
                id="share-permission"
                value={sharePermission}
                onChange={(e) =>
                  setSharePermission(e.target.value as "view" | "manage")
                }
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="view">View only</option>
                <option value="manage">Can share and manage</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="share-note"
                className="text-xs font-semibold uppercase text-muted-foreground"
              >
                Optional Message
              </label>
              <Input
                id="share-note"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                placeholder="Check out this vehicle listing!"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyVehicleLink}
              className="gap-2"
            >
              {shareLinkCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              Copy Link
            </Button>
            <Button
              type="button"
              onClick={handleShareAccess}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Share2 className="size-4" />
              Share Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
