"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { getLoadById } from "@/lib/api/loads"
import { generateBolHtml } from "@/lib/transportation-reports"
import { useOrg } from "@/hooks/useOrg"
import { ArrowLeft, MapPin, Calendar, Car, DollarSign, FileText, ScrollText, Truck, AlertCircle, Phone, Building2, User2, CheckCircle2, Package, Shield, Clock, FileCheck, Eye, Printer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createPortal } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { fmtDateMDT, fmtTimeMDT } from "@/lib/timezone"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Load } from "@/types/load"

function LoadDetailsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-24 h-8 bg-muted rounded"></div>
        <div className="w-48 h-8 bg-muted rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 bg-muted rounded-xl"></div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
      <div className="h-48 bg-muted rounded-xl"></div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  let color = "bg-muted text-muted-foreground border-border"
  switch (status) {
    case "Posted": color = "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30"; break;
    case "Assigned": color = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"; break;
    case "Accepted": color = "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"; break;
    case "Picked Up": color = "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30"; break;
    case "In-Transit": color = "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30"; break;
    case "Delivered": color = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"; break;
    case "Cancelled": color = "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"; break;
  }
  return <Badge variant="outline" className={`${color} px-3 py-1 font-medium text-xs rounded-full shadow-none shrink-0`}>{status}</Badge>
}

const PLACEHOLDER_VALUES = new Set([
  "test",
  "teest",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "-",
  "--",
  "—",
]);

type LoadLocation = {
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
  companyName?: string;
  phone?: string;
  phoneExt?: string;
  contactName?: string;
};

function isPlaceholderValue(value?: string | number | null) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_VALUES.has(normalized)) return true;
  if (/^test[\s\d_-]*$/i.test(normalized)) return true;
  if (/^123+123+123+\d*$/.test(normalized.replace(/\D/g, ""))) return true;
  return false;
}

function toTitleCase(value?: string | number | null) {
  if (isPlaceholderValue(value)) return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function cleanText(value?: string | number | null) {
  if (isPlaceholderValue(value)) return null;
  return String(value).trim();
}

function formatPhone(value?: string | number | null, ext?: string | number | null) {
  if (isPlaceholderValue(value)) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 10) return null;

  const local = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits.slice(-10);
  const formatted = `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  const cleanExt = cleanText(ext);
  return cleanExt ? `${formatted} ext ${cleanExt}` : formatted;
}

function formatLocationLine(location?: LoadLocation) {
  const city = toTitleCase(location?.city);
  const state = cleanText(location?.state)?.toUpperCase();
  const zip = cleanText(location?.zip);
  const parts = [city, state].filter(Boolean).join(", ");
  return [parts, zip].filter(Boolean).join(" ") || "Location not provided";
}

type LoadTimeline = {
  status?: string;
  assignedAt?: string;
  acceptedAt?: string;
  driverAcceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
};

const LOAD_JOURNEY_STATUSES = [
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
  "Delivered",
] as const

type LoadJourneyStatus = (typeof LOAD_JOURNEY_STATUSES)[number]

function normalizeLoadJourneyStatus(
  status?: string,
): LoadJourneyStatus | null {
  const normalized = status?.trim().toLowerCase()

  switch (normalized) {
    case "assigned":
      return "Assigned"

    case "accepted":
      return "Accepted"

    case "picked up":
    case "picked-up":
    case "picked_up":
      return "Picked Up"

    case "in transit":
    case "in-transit":
    case "in_transit":
      return "In-Transit"

    case "delivered":
      return "Delivered"

    default:
      return null
  }
}

const LOAD_JOURNEY_THEME: Record<
  LoadJourneyStatus,
  {
    icon: string
    text: string
    badge: string
    ring: string
  }
> = {
  Assigned: {
    icon: "border-blue-500 bg-blue-500/15 text-blue-400",
    text: "text-blue-400",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    ring: "ring-blue-500/25",
  },

  Accepted: {
    icon: "border-violet-500 bg-violet-500/15 text-violet-400",
    text: "text-violet-400",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    ring: "ring-violet-500/25",
  },

  "Picked Up": {
    icon: "border-amber-500 bg-amber-500/15 text-amber-400",
    text: "text-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    ring: "ring-amber-500/25",
  },

  "In-Transit": {
    icon: "border-cyan-500 bg-cyan-500/15 text-cyan-400",
    text: "text-cyan-400",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    ring: "ring-cyan-500/25",
  },

  Delivered: {
    icon: "border-emerald-500 bg-emerald-500/15 text-emerald-400",
    text: "text-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    ring: "ring-emerald-500/25",
  },
}

function LoadTrackingTimeline({ load }: { load: LoadTimeline }) {
  const currentStatus = normalizeLoadJourneyStatus(load.status)

  const steps = [
    {
      status: "Assigned" as const,
      label: "Assigned",
      date: load.assignedAt,
      icon: <User2 className="size-4" />,
    },
    {
      status: "Accepted" as const,
      label: "Accepted",
      date: load.acceptedAt || load.driverAcceptedAt,
      icon: <CheckCircle2 className="size-4" />,
    },
    {
      status: "Picked Up" as const,
      label: "Picked Up",
      date: load.pickedUpAt,
      icon: <Package className="size-4" />,
    },
    {
      status: "In-Transit" as const,
      label: "In Transit",
      date: load.inTransitAt,
      icon: <Truck className="size-4" />,
    },
    {
      status: "Delivered" as const,
      label: "Delivered",
      date: load.deliveredAt,
      icon: <Shield className="size-4" />,
    },
  ]

  const formatTimelineDate = (value?: string) => {
    if (!value) return null

    try {
      const date = new Date(value)

      return `${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Denver",
      })}, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Denver",
      })}`
    } catch {
      return null
    }
  }

  return (
    <Card className="border-border shadow-sm bg-card overflow-hidden p-0 h-full w-full">
      <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Clock className="size-3.5" />
          Load Journey
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-5 w-full">
          {steps.map((step, index) => {
            const date = formatTimelineDate(step.date)
            const isCurrent = currentStatus === step.status
            const theme = LOAD_JOURNEY_THEME[step.status]

            return (
              <div
                key={step.status}
                className="relative flex min-w-0 flex-col items-center px-1 sm:px-2 text-center"
              >
                {index < steps.length - 1 && (
                  <div className="absolute top-5 left-1/2 h-px w-full bg-border" />
                )}

                <div
                  className={cn(
                    "relative z-10 size-9 sm:size-10 shrink-0 rounded-full border bg-background flex items-center justify-center transition-all duration-300",
                    isCurrent
                      ? theme.icon
                      : "border-border text-muted-foreground/30",
                    isCurrent && "ring-4 ring-offset-2 ring-offset-card",
                    isCurrent && theme.ring,
                  )}
                >
                  {step.icon}
                </div>

                <div className="mt-3 min-w-0 w-full">
                  <div className="flex min-w-0 flex-col items-center gap-1">
                    <h4
                      className={cn(
                        "w-full truncate text-[10px] sm:text-xs lg:text-sm font-bold transition-colors",
                        isCurrent
                          ? theme.text
                          : "text-muted-foreground/40",
                      )}
                      title={step.label}
                    >
                      {step.label}
                    </h4>

                    {isCurrent && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[7px] sm:text-[8px] font-bold uppercase px-1.5 py-0",
                          theme.badge,
                        )}
                      >
                        Current
                      </Badge>
                    )}
                  </div>

                  <p
                    className={cn(
                      "mt-1 w-full truncate text-[8px] sm:text-[9px] lg:text-[10px]",
                      isCurrent && date
                        ? "text-muted-foreground"
                        : "text-muted-foreground/35 italic",
                    )}
                    title={isCurrent ? date || "Current status" : "Inactive"}
                  >
                    {isCurrent ? date || "Current status" : "Inactive"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoadDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { organization } = useOrg()
  const rawId = params?.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const [mobileBolPreviewOpen, setMobileBolPreviewOpen] = React.useState(false)
  const [mobileBolPreviewScale, setMobileBolPreviewScale] = React.useState(1)
  const [mobileBolPreviewHeight, setMobileBolPreviewHeight] = React.useState(1056)
  const mobileBolPreviewRef = React.useRef<HTMLIFrameElement | null>(null)
  const mobileBolPreviewViewportRef = React.useRef<HTMLDivElement | null>(null)

  // Letter at 96 CSS pixels per inch. The preview keeps this exact page width
  // internally, then scales the whole sheet down to the available phone width.
  const BOL_PREVIEW_WIDTH = 816
  const BOL_PREVIEW_MIN_HEIGHT = 1056

  const {
    data: load,
    isLoading,
    isError,
    error,
  } = useQuery({
    // Use a detail-specific cache namespace so no list/edit query can seed
    // this screen with a different record.
    queryKey: ["transportation-load-detail", id],
    queryFn: ({ signal }) => {
      if (!id) throw new Error("Load ID is missing")
      return getLoadById(id, { signal })
    },
    enabled: typeof id === "string" && id.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const syncMobileBolPreview = React.useCallback(() => {
    const viewport = mobileBolPreviewViewportRef.current
    const iframe = mobileBolPreviewRef.current
    if (!viewport || !iframe) return

    const horizontalPadding =
      window.matchMedia("(min-width: 640px)").matches ? 24 : 16
    const availableWidth = Math.max(0, viewport.clientWidth - horizontalPadding)
    const nextScale = Math.min(1, availableWidth / BOL_PREVIEW_WIDTH)
    setMobileBolPreviewScale(nextScale)

    try {
      const doc = iframe.contentDocument
      if (!doc) return
      const contentHeight = Math.max(
        BOL_PREVIEW_MIN_HEIGHT,
        doc.documentElement?.scrollHeight || 0,
        doc.body?.scrollHeight || 0,
      )
      setMobileBolPreviewHeight(contentHeight)
    } catch {
      setMobileBolPreviewHeight(BOL_PREVIEW_MIN_HEIGHT)
    }
  }, [])

  React.useEffect(() => {
    if (!mobileBolPreviewOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileBolPreviewOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileBolPreviewOpen])

  React.useEffect(() => {
    if (!mobileBolPreviewOpen) return

    const viewport = mobileBolPreviewViewportRef.current
    if (!viewport) return

    const frame = window.requestAnimationFrame(syncMobileBolPreview)
    const observer = new ResizeObserver(syncMobileBolPreview)
    observer.observe(viewport)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [mobileBolPreviewOpen, syncMobileBolPreview])

  const handleBolPreviewPrint = React.useCallback(() => {
    const previewWindow = mobileBolPreviewRef.current?.contentWindow
    if (!previewWindow) {
      toast.error("The BOL preview is not ready yet.")
      return
    }

    previewWindow.focus()
    previewWindow.print()
  }, [])

  const handlePrintBol = () => {
    if (!load) return
    setMobileBolPreviewOpen(true)
  }

  if (isLoading) return <LoadDetailsSkeleton />

  if (isError || !load) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="size-12 text-destructive opacity-80" />
        <h2 className="text-xl font-semibold">Load Not Found</h2>
        <p className="text-muted-foreground text-sm text-center max-w-lg">
          {error instanceof Error
            ? error.message
            : "We could not find the details for this load. It may have been deleted."}
        </p>
        <Button variant="outline" onClick={() => router.replace("/transportation")}>Back to Transportation</Button>
      </div>
    )
  }

  // format dates helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return fmtDateMDT(dateStr) + ' at ' + fmtTimeMDT(dateStr)
    } catch {
      return "Invalid date"
    }
  }

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return fmtDateMDT(dateStr)
    } catch {
      return "Invalid date"
    }
  }

  return (
    <div
      key={id}
      data-load-id={id}
      className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-in fade-in zoom-in-[0.98] duration-300"
    >

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="pl-0 text-muted-foreground hover:text-foreground mb-2 -ml-1"
            onClick={() => router.replace("/transportation")}
          >
            <ArrowLeft className="size-4 mr-2" /> Back to Loads
          </Button>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground break-all">{load.loadNumber}</h1>
            <StatusBadge status={load.status} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
            Posted {formatDate(load.createdAt)}
            {load.postType === "assign-carrier" && <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Direct Dispatch</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-background flex-1 sm:flex-initial" onClick={handlePrintBol}><FileText className="size-4 mr-2 text-muted-foreground" /> Print BOL</Button>
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-initial"
            onClick={() => router.push(`/transportation/load/${load._id}/edit`)}
          >
            Edit Load
          </Button>
        </div>
      </div>

      {/* ── Route Card ── */}
      <Card className="border-border shadow-sm overflow-hidden bg-card relative p-0">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row relative">
            {/* Pickup */}
            <div className="flex-1 p-4 sm:p-6 md:p-8 lg:bg-blue-500/3">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 p-3 rounded-2xl shrink-0 mt-1 border border-blue-500/20">
                  <MapPin className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">Pickup</p>
                    <h3 className="text-xl font-bold text-foreground leading-tight">{formatLocationLine(load.pickupLocation)}</h3>
                    {cleanText(load.pickupLocation?.street) ? (
                      <p className="text-sm text-muted-foreground mt-1">{cleanText(load.pickupLocation?.street)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 mt-1 italic">Address not provided</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-sm pt-2">
                    <div className="col-span-2 flex items-center gap-2.5 text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
                      <Building2 className="size-4 shrink-0 text-foreground/70" /> <span className={toTitleCase(load.pickupLocation?.companyName) ? "font-medium text-foreground" : "italic text-muted-foreground/60"}>{toTitleCase(load.pickupLocation?.companyName) || "No company on file"}</span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 text-muted-foreground pl-1">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0" /> <span className="font-medium">{formatPhone(load.pickupLocation?.phone, load.pickupLocation?.phoneExt) || "Phone not provided"}</span>
                      </div>
                      <div className="text-sm pl-5 text-muted-foreground/80">{toTitleCase(load.pickupLocation?.contactName) || <span className="italic text-muted-foreground/50">No contact name</span>}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Divider / Connector */}
            <div className="hidden lg:flex flex-col items-center justify-center relative px-2">
              <div className="h-full w-px bg-linear-to-b from-transparent via-border to-transparent absolute left-1/2 -translate-x-1/2"></div>
              <div className="bg-background border-2 border-border rounded-full p-2.5 z-10 shadow-sm relative">
                <Truck className="size-5 text-muted-foreground" />
              </div>
            </div>
            {/* Mobile Divider */}
            <div className="lg:hidden h-px w-full bg-linear-to-r from-transparent via-border to-transparent relative flex items-center justify-center my-2">
              <div className="bg-background border-2 border-border rounded-full p-1.5 z-10 absolute">
                <Truck className="size-4 text-muted-foreground" />
              </div>
            </div>

            {/* Delivery */}
            <div className="flex-1 p-4 sm:p-6 md:p-8 lg:bg-green-500/3 relative">
              <div className="flex items-start gap-4">
                <div className="bg-green-500/10 p-3 rounded-2xl shrink-0 mt-1 border border-green-500/20">
                  <MapPin className="size-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest mb-1.5">Delivery</p>
                    <h3 className="text-xl font-bold text-foreground leading-tight">{formatLocationLine(load.deliveryLocation)}</h3>
                    {cleanText(load.deliveryLocation?.street) ? (
                      <p className="text-sm text-muted-foreground mt-1">{cleanText(load.deliveryLocation?.street)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 mt-1 italic">Address not provided</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-sm pt-2">
                    <div className="col-span-2 flex items-center gap-2.5 text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
                      <Building2 className="size-4 shrink-0 text-foreground/70" /> <span className={toTitleCase(load.deliveryLocation?.companyName) ? "font-medium text-foreground" : "italic text-muted-foreground/60"}>{toTitleCase(load.deliveryLocation?.companyName) || "No company on file"}</span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 text-muted-foreground pl-1">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0" /> <span className="font-medium">{formatPhone(load.deliveryLocation?.phone, load.deliveryLocation?.phoneExt) || "Phone not provided"}</span>
                      </div>
                      <div className="text-sm pl-5 text-muted-foreground/80">{toTitleCase(load.deliveryLocation?.contactName) || <span className="italic text-muted-foreground/50">No contact name</span>}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Dates Bar */}
          <div className="bg-muted/30 px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-sm relative z-0">
            <div className="flex flex-col">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="size-3.5" /> First Available</p>
              <p className="font-medium text-foreground pl-5">{formatShortDate(load.dates?.firstAvailable)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="size-3.5" /> Pickup Deadline</p>
              <p className="font-medium text-foreground pl-5">{formatShortDate(load.dates?.pickupDeadline)}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar className="size-3.5" /> Delivery Deadline</p>
              <p className="font-medium text-foreground pl-5">{formatShortDate(load.dates?.deliveryDeadline)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Vehicles + Financials ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-stretch">

        {/* Vehicles */}
        <Card className="md:col-span-2 lg:col-span-8 border-border shadow-sm bg-card overflow-hidden p-0 h-full">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Car className="size-3.5" />
              Vehicles
              <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full">
                {load.vehicles?.length || 0}
              </span>
            </CardTitle>

            {load.trailerType && (
              <Badge variant="secondary" className="font-bold text-xs uppercase tracking-wider bg-background border-border shadow-sm">
                {load.trailerType.replace(/_/g, " ")}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {load.vehicles?.map((v, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-4 min-w-0"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-background border border-border/50 p-3 rounded-xl shrink-0 shadow-sm">
                      <Car className="size-5 text-foreground/70" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-foreground truncate">
                        {v.year} {v.make} {v.model}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono bg-background px-1.5 py-0.5 rounded inline-block border border-border/30 max-w-full truncate">
                        {v.vin || "No VIN provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end shrink-0">
                    <Badge
                      variant="outline"
                      className={`${v.condition === "Operable"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                        } shadow-sm font-bold`}
                    >
                      {v.condition}
                    </Badge>

                    {v.color && (
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-background border border-border/50 px-2 py-1 rounded-full shadow-sm">
                        <span
                          className="size-2.5 rounded-full border border-border shadow-inner"
                          style={{ backgroundColor: v.color.toLowerCase() }}
                        />
                        {v.color}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {!load.vehicles?.length && (
                <div className="xl:col-span-2 flex items-center justify-center min-h-32 rounded-xl border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
                  No vehicles are attached to this load.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financials */}
        <Card className="md:col-span-1 lg:col-span-4 border-border shadow-sm bg-card overflow-hidden p-0 h-full">
          <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <DollarSign className="size-3.5" /> Financials
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 flex flex-col justify-between gap-4 h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm font-medium">Carrier Pay</span>
                <span className="font-bold text-xl text-foreground">${load.pricing?.carrierPayAmount?.toLocaleString() || "0"}</span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm font-medium">COD / COP</span>
                <span className="font-semibold text-lg">${load.pricing?.copCodAmount?.toLocaleString() || "0"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm font-medium">Total Distance</span>
                <span className="font-semibold">{load.pricing?.miles?.toLocaleString() || "0"} mi</span>
              </div>
            </div>

            {load.pricing?.estimatedRate && (
              <div className="flex items-center justify-between gap-3 p-3 bg-background border border-border/50 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle className="size-3" /> Est. Market Rate
                </span>
                <span className="font-bold text-sm text-foreground">${load.pricing.estimatedRate.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Documents & Status — sized to their own content, not stretched
           to match a taller sibling; nothing is ever left stranded alone
           in an otherwise-empty row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 items-start">

        {/* Proof of Delivery */}
        {load.proofOfDelivery && (
          <Card className="sm:col-span-2 lg:col-span-1 border-border shadow-sm bg-card overflow-hidden p-0">
            <CardHeader className="p-4 border-b border-border/50 bg-blue-500/5">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <FileCheck className="size-3.5" /> Proof of Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-muted/20">
                <img
                  src={load.proofOfDelivery.imageUrl}
                  alt="POD Preview"
                  className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="size-6 text-white" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Submitted</p>
                <p className="text-sm font-medium">
                  {new Date(load.proofOfDelivery.submittedAt).toLocaleString("en-US", { timeZone: "America/Denver" })}
                </p>
              </div>

              <Link href={`/billing/driver-payouts/${load._id}`}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-lg shadow-primary/20 gap-2">
                  <DollarSign className="size-4" /> Review & Approve Payout
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Notes & Instructions */}
        {(load.additionalInfo?.instructions || load.additionalInfo?.notes) && (
          <Card className="sm:col-span-2 lg:col-span-3 border-border shadow-sm bg-card overflow-hidden p-0">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="size-3.5" /> Notes & Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {load.additionalInfo.instructions && (
                  <div className="h-full">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Carrier Instructions</h5>
                    <p className="text-sm bg-muted/30 p-3.5 rounded-xl border border-border/50 leading-relaxed text-foreground/90 h-[calc(100%-20px)]">
                      {load.additionalInfo.instructions}
                    </p>
                  </div>
                )}
                {load.additionalInfo.notes && (
                  <div className="h-full">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Internal Notes</h5>
                    <p className="text-sm bg-blue-500/5 p-3.5 rounded-xl border border-blue-500/10 leading-relaxed text-blue-900 dark:text-blue-200 h-[calc(100%-20px)]">
                      {load.additionalInfo.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Contract — dispatcher's own agreement */}
        <Card className="border-border shadow-sm bg-card overflow-hidden p-0">
          <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ScrollText className="size-3.5" /> Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {load.contract?.agreedToTerms ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2.5">
                  <div className="size-2 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-sm font-bold tracking-tight">Terms Agreed</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Agreed by: <span className="text-foreground font-semibold">{load.contract.signerName}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/80 font-mono">
                  {formatDate(load.contract.signedAt || load.createdAt)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 min-h-24 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground italic">
                <AlertCircle className="size-4 shrink-0" /> No contract details available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Agreement — the driver's own signature, signed at accept/request time */}
        <Card className="border-border shadow-sm bg-card overflow-hidden p-0">
          <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileCheck className="size-3.5" /> Driver Agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {load.driverContract?.agreedToTerms ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 shadow-sm relative overflow-hidden h-full space-y-3">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                {load.driverContract.signatureDataUrl && (
                  <div className="rounded-xl border border-border/50 bg-white overflow-hidden h-24">
                    <img
                      src={load.driverContract.signatureDataUrl}
                      alt="Driver signature"
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2.5">
                  <div className="size-2 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-sm font-bold tracking-tight">Driver Signed</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Signed by: <span className="text-foreground font-semibold">{load.driverContract.signerName}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/80 font-mono">
                  {formatDate(load.driverContract.signedAt)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 min-h-24 bg-muted/50 rounded-lg border border-border/50 text-sm text-muted-foreground italic">
                <AlertCircle className="size-4 shrink-0" /> Driver hasn't signed yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Load Journey */}
        <div>
          <LoadTrackingTimeline load={load} />
        </div>

      </div>

      {mobileBolPreviewOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bol-preview-title"
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/65 p-3"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMobileBolPreviewOpen(false)
              }
            }}
          >
            <div
              className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl"
              style={{
                width: "min(calc(100vw - 24px), 880px)",
                height: "min(calc(100dvh - 24px), 1120px)",
              }}
            >
              <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      id="bol-preview-title"
                      className="truncate text-sm font-black text-foreground"
                    >
                      BOL Preview
                    </p>
                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                      {load.loadNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileBolPreviewOpen(false)}
                    aria-label="Close BOL preview"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div
                ref={mobileBolPreviewViewportRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-2 sm:p-3"
              >
                <div className="flex min-h-full w-full items-start justify-center py-1 sm:items-center">
                  <div
                    className="relative shrink-0 overflow-visible bg-white shadow-[0_8px_30px_rgba(15,23,42,0.16)]"
                    style={{
                      width: `${BOL_PREVIEW_WIDTH * mobileBolPreviewScale}px`,
                      height: `${mobileBolPreviewHeight * mobileBolPreviewScale}px`,
                    }}
                  >
                    <iframe
                      ref={mobileBolPreviewRef}
                      title={`BOL Preview ${load.loadNumber}`}
                      srcDoc={generateBolHtml(load, organization?.name || "Your Dealership")}
                      onLoad={syncMobileBolPreview}
                      scrolling="no"
                      className="absolute left-0 top-0 border-0 bg-white"
                      style={{
                        width: `${BOL_PREVIEW_WIDTH}px`,
                        height: `${mobileBolPreviewHeight}px`,
                        transform: `scale(${mobileBolPreviewScale})`,
                        transformOrigin: "top left",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-border bg-background/98 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBolPreviewPrint}
                  className="h-10 w-full gap-2 text-sm font-bold"
                >
                  <Printer className="size-4" />
                  Print
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}