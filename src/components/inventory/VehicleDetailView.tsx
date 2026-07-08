"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Expand,
  MapPin,
  Check,
  Lock,
  ClipboardList,
  DollarSign,
  Gauge,
  Fuel,
  Settings2,
  Layers,
  Car,
  Calendar,
  Hash,
  Palette,
  Cog,
  Phone,
  CheckCircle2,
  TruckIcon,
  Sparkles,
  Shield,
  RotateCcw,
  Grid3X3,
  Copy,
  TrendingUp,
  ArrowRight,
  GitCompareArrows,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Vehicle } from "@/types/inventory";
import { useOrg } from "@/hooks/useOrg";
import { resolveImageUrl, cn } from "@/lib/utils";

const FALLBACK = "/vehicle-placeholder.jpg";

type Tab = "overview" | "specs" | "features" | "internal";

interface VehicleDetailViewProps {
  vehicle: Vehicle;
  onInquiryClick?: (vehicle: Vehicle) => void;
  onApplyNow?: (vehicle: Vehicle) => void;
  onQuoteClick?: () => void;
  shippingQuote?: number | null;
  isPublic?: boolean;
  compactHeader?: boolean;
  onBookTestDrive?: () => void;
  isComparing?: boolean;
  onToggleCompare?: (vehicleId: string) => void;
}

function cleanDescription(text: string, v?: Vehicle): string {
  if (!text) return "";
  let t = text
    .replace(/\{Equipment Bulleted\}/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/([.!?])\s+([A-Z][a-z])/g, "$1\n\n$2")
    .replace(/(^|\s)([A-Z]{2,}(?:\s[A-Z]{2,})*:)/g, "\n\n$2")
    .replace(
      /(Disclaimer:|Pre-owned vehicle pricing|ALL PRICES ARE FINAL|PLEASE CALL TO SCHEDULE)/gi,
      "\n\n$1",
    )
    .replace(/^\s*[-•*]\s*/gm, "\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (v?.year && v?.make && v?.model) {
    const p = new RegExp(
      `^${v.year}\\s+${v.make}\\s+${v.model}(\\s+with)?$`,
      "i",
    );
    if (p.test(t)) return "";
  }
  return t.length < 5 ? "" : t;
}

function ExpandableText({
  text,
  vehicle,
}: {
  text: string;
  vehicle?: Vehicle;
}) {
  const [exp, setExp] = React.useState(false);
  const LIMIT = 480;
  const cleaned = React.useMemo(
    () => cleanDescription(text, vehicle),
    [text, vehicle],
  );
  if (!cleaned) return null;
  const needs = cleaned.length > LIMIT;
  const display = exp ? cleaned : cleaned.slice(0, LIMIT);
  const blocks = display.split(/\n\n+/).filter((b) => b.trim().length > 0);
  return (
    <div className="space-y-3">
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {blocks.map((block, i) => {
          const lines = block.split("\n").filter((l) => l.trim());
          if (lines.some((l) => l.trim().startsWith("-"))) {
            return (
              <ul key={i} className="space-y-1.5">
                {lines.map((line, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-0.5 text-primary">•</span>
                    <span>{line.trim().replace(/^-\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="whitespace-pre-wrap">
              {block.trim()}
              {i === blocks.length - 1 && !exp && needs && "…"}
            </p>
          );
        })}
      </div>
      {needs && (
        <button
          onClick={() => setExp(!exp)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {exp ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function SpecRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.FC<{ className?: string }>;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between border-b border-border/25 py-2.5 last:border-0">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && (
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        )}
        {label}
      </span>
      <span className="max-w-[55%] text-right text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = React.useState(startIndex);
  const [loaded, setLoaded] = React.useState(false);
  const touchStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    setLoaded(false);
  }, [idx]);
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIdx((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight")
        setIdx((p) => Math.min(images.length - 1, p + 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-black/97 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
          {idx + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-14"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const diff = touchStart.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            diff > 0
              ? setIdx((p) => Math.min(p + 1, images.length - 1))
              : setIdx((p) => Math.max(p - 1, 0));
          }
          touchStart.current = null;
        }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
        <img
          key={idx}
          src={images[idx]}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.endsWith(FALLBACK)) {
              target.src = FALLBACK;
            } else {
              setLoaded(true);
            }
          }}
          className={cn(
            "max-h-full max-w-full select-none object-contain transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
        {idx > 0 && (
          <button
            onClick={() => setIdx((p) => p - 1)}
            className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button
            onClick={() => setIdx((p) => p + 1)}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      <div
        className="shrink-0 overflow-x-auto p-3 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded border-2 transition-all",
                i === idx
                  ? "border-white opacity-100 ring-2 ring-white/20"
                  : "border-transparent opacity-40 hover:opacity-75",
              )}
            >
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Gallery({
  images,
  onOpenLightbox,
  vehicle,
  compact,
}: {
  images: string[];
  onOpenLightbox: (i: number) => void;
  vehicle: Vehicle;
  compact?: boolean;
}) {
  const [idx, setIdx] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [spinMode, setSpinMode] = React.useState(false);
  const spinRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStart = React.useRef<number | null>(null);
  const dragStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    setLoaded(false);
  }, [idx]);

  React.useEffect(() => {
    if (spinMode) {
      spinRef.current = setInterval(
        () => setIdx((p) => (p + 1) % images.length),
        90,
      );
    } else {
      if (spinRef.current) clearInterval(spinRef.current);
    }
    return () => {
      if (spinRef.current) clearInterval(spinRef.current);
    };
  }, [spinMode, images.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0
        ? setIdx((p) => Math.min(p + 1, images.length - 1))
        : setIdx((p) => Math.max(p - 1, 0));
    }
    touchStart.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (spinMode) dragStart.current = e.clientX;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!spinMode || dragStart.current === null) return;
    const diff = e.clientX - dragStart.current;
    if (Math.abs(diff) > 20) {
      if (spinRef.current) clearInterval(spinRef.current);
      diff < 0
        ? setIdx((p) => (p + 1) % images.length)
        : setIdx((p) => (p - 1 + images.length) % images.length);
      dragStart.current = e.clientX;
    }
  };
  const onMouseUp = () => {
    dragStart.current = null;
  };

  const realImageCount = images.filter((s) => s !== FALLBACK).length;
  const canSpin = images.length >= 6;

  return (
    <div className="select-none bg-zinc-950">
      <div
        className={cn(
          "relative overflow-hidden",
          compact
            ? "h-[42vw] max-h-82 min-h-44 sm:h-[34vw]"
            : "h-[56vw] max-h-115 min-h-55",
          spinMode && "cursor-grab active:cursor-grabbing",
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
          </div>
        )}

        <img
          key={idx}
          src={images[idx]}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.endsWith(FALLBACK)) {
              target.src = FALLBACK;
            } else {
              setLoaded(true);
            }
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-zinc-950/85 via-zinc-950/10 to-zinc-950/30" />

        {/* Top controls */}
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between sm:left-4 sm:right-4 sm:top-4">
          <div className="flex flex-col gap-1">
            {vehicle.certified && (
              <Badge className="w-fit border-none bg-blue-600/85 text-[10px] font-bold text-white backdrop-blur-sm">
                <Shield className="mr-1 h-2.5 w-2.5" /> CPO
              </Badge>
            )}
            {vehicle.isNewVehicle && (
              <Badge className="w-fit border-none bg-primary/85 text-[10px] font-bold text-white backdrop-blur-sm">
                <Sparkles className="mr-1 h-2.5 w-2.5" /> New
              </Badge>
            )}
          </div>
          {canSpin && (
            <button
              onClick={() => setSpinMode((p) => !p)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur-md transition-all",
                spinMode
                  ? "bg-primary text-white shadow-lg"
                  : "bg-black/50 text-white hover:bg-black/70",
              )}
            >
              <RotateCcw
                className={cn("h-3.5 w-3.5", spinMode && "animate-spin")}
              />
              360°
            </button>
          )}
        </div>

        {/* Bottom: vehicle name + controls */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-3 pb-3 sm:px-4 sm:pb-4">
          <div>
            <p className="text-xl font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-2xl">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            {vehicle.trim && (
              <p className="text-sm font-medium text-white/75">
                {vehicle.trim}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {realImageCount > 1 && (
              <button
                onClick={() => onOpenLightbox(idx)}
                className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              >
                <Grid3X3 className="h-3 w-3" />
                {realImageCount}
              </button>
            )}
            <button
              onClick={() => onOpenLightbox(idx)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            >
              <Expand className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Dot indicators — mobile */}
        {images.length > 1 && images.length <= 12 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
            {images.slice(0, 12).map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/35",
                )}
              />
            ))}
          </div>
        )}

        {/* Nav arrows */}
        {idx > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((p) => p - 1);
            }}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((p) => p + 1);
              setLoaded(false);
            }}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip — desktop */}
      {images.length > 1 && !compact && (
        <div className="hidden overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-3 py-2.5 sm:flex gap-1.5 no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setIdx(i);
                setLoaded(false);
              }}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-sm border-2 transition-all",
                i === idx
                  ? "border-primary ring-1 ring-primary/30 opacity-100"
                  : "border-transparent opacity-40 hover:opacity-70",
              )}
            >
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith(FALLBACK)) e.currentTarget.src = FALLBACK;
                }}
              />
            </button>
          ))}
        </div>
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
  compactHeader,
  onBookTestDrive,
  isComparing,
  onToggleCompare,
}: VehicleDetailViewProps) {
  const { userRole, isSuperAdmin } = useOrg();
  const isAdmin =
    userRole === "admin" || userRole === "super_admin" || isSuperAdmin;

  const allImages = React.useMemo(() => {
    const raw = [vehicle.image, ...(vehicle.images || [])]
      .map((s) => resolveImageUrl(s)?.trim())
      .filter((s): s is string => Boolean(s));
    return Array.from(new Set([...raw, FALLBACK]));
  }, [vehicle.image, vehicle.images]);

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxStart, setLightboxStart] = React.useState(0);
  const [tab, setTab] = React.useState<Tab>("overview");
  const [copied, setCopied] = React.useState(false);

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

  React.useEffect(() => {
    setTab("overview");
  }, [vehicle.id]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/vehicle/${vehicle.id}`,
    );
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirections = () => {
    const dest = encodeURIComponent(locationMapQuery);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
      "_blank",
    );
  };

  const memberPrice = vehicle.memberPrice ?? vehicle.price;
  const hasMemberDiscount =
    !isAdmin && (vehicle.memberDiscountPercent ?? 0) > 0 && memberPrice < vehicle.price;
  const monthly = Math.floor((hasMemberDiscount ? memberPrice : vehicle.price) / 60);
  const profit = isAdmin && vehicle.cost ? vehicle.price - vehicle.cost : null;
  const profitPct =
    profit && vehicle.cost ? Math.round((profit / vehicle.cost) * 100) : null;

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "specs", label: "Full Specs" },
    { id: "features", label: "Features" },
    ...(isAdmin ? [{ id: "internal" as Tab, label: "Staff" }] : []),
  ];

  const options = vehicle.options
    ? vehicle.options
      .split(/[,\n;]+/)
      .map((o) => o.trim())
      .filter(Boolean)
    : [];

  const statusColor =
    {
      "Ready for Sale":
        "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      "In Recon":
        "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/30",
      Sold: "bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/30",
      "In Transit":
        "bg-sky-500/12 text-sky-700 dark:text-sky-400 border-sky-500/30",
    }[vehicle.status || ""] ?? "bg-muted text-muted-foreground border-border";

  const QUICK_STATS = [
    {
      icon: Gauge,
      label: "Mileage",
      value: vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : "—",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      icon: Fuel,
      label: "Fuel",
      value: vehicle.fuelType || "—",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      icon: Settings2,
      label: "Trans.",
      value: vehicle.transmission?.split(" ")[0] || "—",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      icon: Layers,
      label: "Drive",
      value: vehicle.driveTrain?.split(" ")[0] || "—",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <>
      {lightboxOpen && (
        <Lightbox
          images={allImages}
          startIndex={lightboxStart}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden group">
        {/* ══ LEFT / MAIN ══════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-1 lg:overflow-y-auto">
          <Gallery
            images={allImages}
            onOpenLightbox={(i) => {
              setLightboxStart(i);
              setLightboxOpen(true);
            }}
            vehicle={vehicle}
            compact={compactHeader}
          />

          {/* Identity bar — sm+ */}
          <div className="hidden border-b bg-background px-5 py-4 sm:block lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-black tracking-tight text-foreground lg:text-2xl">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.trim && (
                    <span className="ml-2 text-base font-medium text-muted-foreground">
                      · {vehicle.trim}
                    </span>
                  )}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {vehicle.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px] font-semibold",
                        statusColor,
                      )}
                    >
                      {vehicle.status}
                    </Badge>
                  )}
                  {vehicle.certified && (
                    <Badge className="h-5 border-none bg-blue-500/12 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                      <Shield className="mr-1 h-3 w-3" /> CPO
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-muted-foreground/60">
                    #{vehicle.stockNumber}
                  </span>
                  {vehicle.vin && (
                    <span className="font-mono text-xs text-muted-foreground/50">
                      {vehicle.vin}
                    </span>
                  )}
                </div>
              </div>
              <div className="block text-right lg:hidden">
                {hasMemberDiscount && (
                  <p className="text-sm font-medium text-muted-foreground/60 line-through">
                    ${vehicle.price?.toLocaleString()}
                  </p>
                )}
                <p className={cn("text-3xl font-black", hasMemberDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
                  ${(hasMemberDiscount ? memberPrice : vehicle.price)?.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  ~${monthly.toLocaleString()}/mo
                </p>
              </div>
            </div>
          </div>

          {/* Mobile identity */}
          <div className="border-b bg-background px-4 py-3 sm:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-black text-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.trim && (
                  <p className="text-xs text-muted-foreground">
                    {vehicle.trim}
                  </p>
                )}
                {vehicle.status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1.5 h-5 text-[10px] font-semibold",
                      statusColor,
                    )}
                  >
                    {vehicle.status}
                  </Badge>
                )}
              </div>
              <div className="shrink-0 text-right">
                {hasMemberDiscount && (
                  <p className="text-[11px] font-medium text-muted-foreground/60 line-through">
                    ${vehicle.price?.toLocaleString()}
                  </p>
                )}
                <p className={cn("text-xl font-black", hasMemberDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
                  ${(hasMemberDiscount ? memberPrice : vehicle.price)?.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">~${monthly}/mo</p>
              </div>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-4 divide-x divide-border/40 border-b bg-muted/15 dark:bg-zinc-900/30">
            {QUICK_STATS.map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 px-2 py-3 text-center"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    color,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {label}
                  </p>
                  <p className="w-full truncate text-center text-xs font-bold text-foreground">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {compactHeader && (
            <div className="border-b bg-background px-4 py-3 sm:px-5 lg:px-6">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Key Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    VIN
                  </p>
                  <p className="truncate font-mono text-xs font-semibold text-foreground">
                    {vehicle.vin || "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Stock #
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {vehicle.stockNumber || "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Mileage
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {vehicle.mileage
                      ? `${vehicle.mileage.toLocaleString()} mi`
                      : "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Exterior
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {vehicle.exteriorColor || vehicle.color || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-0.5 border-b bg-background px-4 pt-2 sm:px-5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3.5 pb-2.5 pt-1.5 text-xs font-semibold transition-colors",
                  tab === t.id
                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-4 sm:p-5 lg:p-6">
            {tab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Car className="h-3.5 w-3.5" /> Description
                  </h3>
                  {vehicle.comments &&
                    cleanDescription(vehicle.comments, vehicle) ? (
                    <ExpandableText text={vehicle.comments} vehicle={vehicle} />
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      This {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.trim ? ` ${vehicle.trim}` : ""} comes in a{" "}
                      {vehicle.exteriorColor || vehicle.color || "stylish"}{" "}
                      exterior with {vehicle.interiorColor || "premium"}{" "}
                      interior.{" "}
                      {hasKnownLocation
                        ? `Located at our ${displayLocation} location.`
                        : ""}
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Quick Facts
                  </h3>
                  <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                    <SpecRow
                      icon={Calendar}
                      label="Year"
                      value={vehicle.year}
                    />
                    <SpecRow icon={Car} label="Make" value={vehicle.make} />
                    <SpecRow icon={Car} label="Model" value={vehicle.model} />
                    <SpecRow icon={Car} label="Trim" value={vehicle.trim} />
                    <SpecRow icon={Hash} label="VIN" value={vehicle.vin} />
                    <SpecRow
                      icon={Hash}
                      label="Stock #"
                      value={vehicle.stockNumber}
                    />
                    <SpecRow
                      icon={Gauge}
                      label="Mileage"
                      value={
                        vehicle.mileage
                          ? `${vehicle.mileage.toLocaleString()} mi`
                          : undefined
                      }
                    />
                    <SpecRow
                      icon={Car}
                      label="Body Style"
                      value={vehicle.bodyStyle}
                    />
                    <SpecRow
                      icon={Palette}
                      label="Exterior"
                      value={vehicle.exteriorColor || vehicle.color}
                    />
                    <SpecRow
                      icon={Palette}
                      label="Interior"
                      value={vehicle.interiorColor}
                    />
                    <SpecRow
                      icon={Layers}
                      label="Drivetrain"
                      value={vehicle.driveTrain}
                    />
                    <SpecRow
                      icon={Calendar}
                      label="Days on Lot"
                      value={
                        vehicle.daysOnLot
                          ? `${vehicle.daysOnLot} days`
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "specs" && (
              <div className="space-y-6">
                {[
                  {
                    icon: Car,
                    title: "Identity",
                    rows: [
                      { icon: Calendar, label: "Year", value: vehicle.year },
                      { icon: Car, label: "Make", value: vehicle.make },
                      { icon: Car, label: "Model", value: vehicle.model },
                      { icon: Car, label: "Trim", value: vehicle.trim },
                      {
                        icon: Car,
                        label: "Body Style",
                        value: vehicle.bodyStyle,
                      },
                      { icon: Car, label: "Type", value: vehicle.vehicleType },
                      { icon: Hash, label: "VIN", value: vehicle.vin },
                      {
                        icon: Hash,
                        label: "Stock Number",
                        value: vehicle.stockNumber,
                      },
                    ],
                  },
                  {
                    icon: Cog,
                    title: "Performance",
                    rows: [
                      { icon: Fuel, label: "Engine", value: vehicle.engine },
                      {
                        icon: Fuel,
                        label: "Cylinders",
                        value: vehicle.cylinders
                          ? `${vehicle.cylinders} cyl`
                          : undefined,
                      },
                      {
                        icon: Fuel,
                        label: "Fuel Type",
                        value: vehicle.fuelType,
                      },
                      {
                        icon: Settings2,
                        label: "Transmission",
                        value: vehicle.transmission,
                      },
                      {
                        icon: Layers,
                        label: "Drivetrain",
                        value: vehicle.driveTrain,
                      },
                      {
                        icon: Car,
                        label: "Doors",
                        value: vehicle.doors
                          ? `${vehicle.doors} doors`
                          : undefined,
                      },
                    ],
                  },
                  {
                    icon: Palette,
                    title: "Appearance",
                    rows: [
                      {
                        icon: Palette,
                        label: "Exterior Color",
                        value: vehicle.exteriorColor || vehicle.color,
                      },
                      {
                        icon: Palette,
                        label: "Interior Color",
                        value: vehicle.interiorColor,
                      },
                    ],
                  },
                  {
                    icon: Calendar,
                    title: "History",
                    rows: [
                      {
                        icon: Gauge,
                        label: "Mileage",
                        value: vehicle.mileage
                          ? `${vehicle.mileage.toLocaleString()} mi`
                          : undefined,
                      },
                      {
                        icon: Calendar,
                        label: "Days on Lot",
                        value: vehicle.daysOnLot
                          ? `${vehicle.daysOnLot} days`
                          : undefined,
                      },
                      {
                        icon: Calendar,
                        label: "Date Added",
                        value: vehicle.dateAdded
                          ? new Date(vehicle.dateAdded).toLocaleDateString('en-US', { timeZone: 'America/Denver' })
                          : undefined,
                      },
                      { icon: Car, label: "Status", value: vehicle.status },
                    ],
                  },
                ].map((section, si) => (
                  <div key={section.title}>
                    {si > 0 && <Separator className="mb-6" />}
                    <h4 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                      <section.icon className="h-3.5 w-3.5" />
                      {section.title}
                    </h4>
                    {section.rows.map((row) => (
                      <SpecRow
                        key={row.label}
                        icon={row.icon}
                        label={row.label}
                        value={row.value}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === "features" && (
              <div className="space-y-4">
                {options.length > 0 ? (
                  <>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Installed Options & Equipment
                    </h3>
                    <div className="columns-1 gap-x-8 sm:columns-2">
                      {options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 break-inside-avoid border-b border-border/25 py-2.5 last:border-0"
                        >
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          </span>
                          <span className="text-sm text-foreground">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Settings2 className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Feature list unavailable
                      </p>
                      <p className="mt-1 text-sm">
                        Contact our team for a full options rundown.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "internal" && isAdmin && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/8">
                  <div className="flex items-center justify-between border-b border-primary/15 px-5 py-3.5">
                    <h3 className="flex items-center gap-2 text-sm font-black text-primary">
                      <Lock className="h-4 w-4" /> Staff Financials
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-primary/25 text-[10px] font-bold text-primary"
                    >
                      Admin Only
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[
                      {
                        label: "Cost",
                        value: vehicle.cost,
                        color: "text-foreground",
                      },
                      {
                        label: "Sale Price",
                        value: vehicle.price,
                        color: "text-foreground",
                      },
                      {
                        label: "Profit",
                        value: profit ?? undefined,
                        color: "text-emerald-600 dark:text-emerald-400",
                        sub: profitPct ? `${profitPct}%` : undefined,
                      },
                    ].map(({ label, value, color, sub }: any) => (
                      <div
                        key={label}
                        className="rounded-xl border border-border/50 bg-background p-3 text-center dark:bg-zinc-900/60"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                          {label}
                        </p>
                        <p className={cn("mt-1 text-lg font-black", color)}>
                          {value !== undefined && value !== null
                            ? `$${value.toLocaleString()}`
                            : "—"}
                        </p>
                        {sub && (
                          <p className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-400/70">
                            {sub} margin
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {profit !== null && profit > 0 && (
                    <div className="flex items-center gap-2 border-t border-primary/15 px-5 py-3">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ${profit.toLocaleString()} profit · {profitPct}% margin
                      </span>
                    </div>
                  )}
                </div>

                {vehicle.currentStep && (
                  <div className="rounded-xl border bg-background p-4 space-y-3 dark:bg-zinc-900/40">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Cog className="h-4 w-4 text-amber-500" /> Recon Pipeline
                    </h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Current Stage
                      </span>
                      <span className="font-semibold text-primary">
                        {vehicle.currentStep}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: "75%" }}
                      />
                    </div>
                  </div>
                )}

                {vehicle.notes && vehicle.notes.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <ClipboardList className="h-4 w-4 text-primary" /> Staff
                      Notes
                    </h3>
                    {vehicle.notes.map((note: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-xl border bg-muted/20 p-4 text-xs space-y-1.5 dark:bg-zinc-900/40"
                      >
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-bold">
                            {note.author?.name || "Staff"}
                          </span>
                          <span>
                            {note.date
                              ? new Date(note.date).toLocaleDateString('en-US', { timeZone: 'America/Denver' })
                              : "—"}
                          </span>
                        </div>
                        <p className="leading-relaxed text-foreground/80 italic">
                          "{note.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile sticky CTA bar ── */}
          <div className="sticky bottom-0 z-20 flex items-center gap-2 border-t border-border/50 bg-background/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
            {onApplyNow && (
              <Button
                className="h-12 flex-1 bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/25"
                onClick={() => onApplyNow(vehicle)}
              >
                Apply Now <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            <a
              href="tel:8017661736"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-5 w-5" />
            </a>
            {onInquiryClick && (
              <button
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-blue-500 transition-colors hover:bg-muted"
                onClick={() => onInquiryClick(vehicle)}
              >
                <CheckCircle2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* ══ RIGHT SIDEBAR (desktop) ══════════════════════════════ */}
        <div className="hidden border-l border-border/50 bg-background lg:flex lg:w-80 lg:flex-col xl:w-96">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 xl:p-6">
            {/* Price block */}
            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/20 dark:bg-zinc-900/40">
              <div className="px-5 pt-5 pb-4">
                <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                  {hasMemberDiscount ? `${vehicle.tierName} Member Price` : "Our Price"}
                </p>
                {hasMemberDiscount && (
                  <p className="text-base font-semibold text-muted-foreground/60 line-through">
                    ${vehicle.price?.toLocaleString()}
                  </p>
                )}
                <p className={cn("text-4xl font-black tracking-tight", hasMemberDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-primary")}>
                  ${(hasMemberDiscount ? memberPrice : vehicle.price)?.toLocaleString()}
                </p>
                {hasMemberDiscount && (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                    You save ${(vehicle.price - memberPrice).toLocaleString()} · −{vehicle.memberDiscountPercent}%
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  ~
                  <span className="font-semibold text-foreground">
                    ${monthly.toLocaleString()}/mo
                  </span>{" "}
                  over 60 months
                </p>
              </div>
              {shippingQuote && (
                <div className="flex items-center gap-2 border-t border-border/40 bg-emerald-500/8 px-5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <TruckIcon className="h-4 w-4 shrink-0" />
                  +${shippingQuote.toLocaleString()} shipping
                </div>
              )}
            </div>

            {/* Primary CTAs */}
            <div className="space-y-2">
              {onApplyNow && (
                <Button
                  size="lg"
                  className="h-12 w-full gap-2 bg-primary text-sm font-black text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                  onClick={() => onApplyNow(vehicle)}
                >
                  <DollarSign className="h-4 w-4" /> Apply for Financing
                </Button>
              )}
              {onInquiryClick && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 w-full gap-2 border-border/60 font-semibold"
                  onClick={() => onInquiryClick(vehicle)}
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-500" /> Check
                  Availability
                </Button>
              )}
              {onBookTestDrive && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 w-full gap-2 border-border/60 font-semibold"
                  onClick={onBookTestDrive}
                >
                  <Calendar className="h-4 w-4 text-primary" /> Book Test Drive
                </Button>
              )}
              {onToggleCompare && (
                <Button
                  size="lg"
                  variant={isComparing ? "default" : "outline"}
                  className={cn(
                    "h-11 w-full gap-2 font-semibold",
                    isComparing
                      ? "bg-primary text-primary-foreground"
                      : "border-border/60",
                  )}
                  onClick={() => onToggleCompare(vehicle.id)}
                >
                  <GitCompareArrows className="h-4 w-4" />
                  {isComparing ? "Remove from Compare" : "Add to Compare"}
                </Button>
              )}
              {onQuoteClick && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 w-full gap-2 border-border/60 font-semibold"
                  onClick={onQuoteClick}
                >
                  <TruckIcon className="h-4 w-4 text-emerald-500" /> Shipping
                  Quote
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full gap-2 border-border/60 font-semibold"
                asChild
              >
                <a href="tel:8017661736">
                  <Phone className="h-4 w-4 text-emerald-500" /> Call (801)
                  766-1736
                </a>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className="h-9 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={handleDirections}
                >
                  <MapPin className="mr-1.5 h-3.5 w-3.5" /> Directions
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />{" "}
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Share
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Highlights grid */}
            <div className="space-y-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                Highlights
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: vehicle.bodyStyle || "Vehicle", icon: Car },
                  {
                    label: vehicle.transmission?.split(" ")[0] || "Auto",
                    icon: Settings2,
                  },
                  { label: vehicle.fuelType || "Gasoline", icon: Fuel },
                  {
                    label: vehicle.driveTrain?.split(" ")[0] || "Standard",
                    icon: Layers,
                  },
                  { label: vehicle.engine || "Engine", icon: Cog },
                  {
                    label: vehicle.exteriorColor || vehicle.color || "Color",
                    icon: Palette,
                  },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2.5 dark:bg-zinc-900/50"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                    <span className="truncate text-xs font-medium text-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Location map */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                <MapPin className="h-3 w-3 text-primary/70" /> Location
              </p>
              <div className="overflow-hidden rounded-xl border border-border/50">
                <iframe
                  title="Location"
                  width="100%"
                  height="150"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(locationMapQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  className="w-full"
                />
                <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-3.5 py-3 dark:bg-zinc-900/40">
                  <div>
                    <p className="text-xs font-semibold">
                      {vehicle.dealerName || "Action Auto Utah"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {displayLocation}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 border-border/60 text-[11px]"
                    onClick={handleDirections}
                  >
                    <MapPin className="h-3 w-3" /> Maps
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
