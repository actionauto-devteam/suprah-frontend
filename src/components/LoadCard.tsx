"use client"

import * as React from "react"
import {
  MapPin,
  DollarSign,
  Calendar,
  Globe,
  Lock,
  Car,
  Trash2,
  Loader2,
  FileText,
  Edit3,
  User,
  ExternalLink,
  Layers,
  ChevronRight,
  Hash,
  Palette,
  Gauge,
  ClipboardList,
  CalendarDays,
  Route,
  CircleDollarSign,
  Banknote,
  ImageIcon,
  Clock3,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Load, LoadStatus } from "@/types/load"
import { useRouter } from "next/navigation"
import { generateLoadPDF } from "@/utils/pdfGenerator"
import { useOrg } from "@/hooks/useOrg"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { cn } from "@/lib/utils"

interface LoadCardProps {
  load: Load
  onDelete?: (loadId: string) => void
  isDeleting?: boolean
}

type LoadVehicleItem = NonNullable<Load["vehicles"]>[number]

function formatCurrency(n?: number) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function formatDate(d?: string | Date) {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  })
}

function formatDateTime(d?: string | Date) {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
    timeZoneName: "short",
  })
}

function getSchedulePresentation(load: Load) {
  const pickupDate =
    load.dates?.firstAvailable || load.dates?.pickupDeadline

  if (load.status === "Delivered") {
    return {
      tileLabel: "Delivered",
      modalLabel: "Delivered",
      value: load.deliveredAt,
      displayValue: load.deliveredAt
        ? formatDateTime(load.deliveredAt)
        : load.dates?.deliveryDeadline
          ? formatDate(load.dates.deliveryDeadline)
          : "Delivered",
      helper: load.deliveredAt
        ? "This load has completed delivery."
        : "Delivery is complete. The recorded delivery time is not available.",
      tone: "emerald" as const,
      stage: "completed" as const,
    }
  }

  if (load.status === "Picked Up" || load.status === "In-Transit") {
    return {
      tileLabel: "Delivery Deadline",
      modalLabel: "Delivery Deadline",
      value: load.dates?.deliveryDeadline,
      displayValue: load.dates?.deliveryDeadline
        ? formatDate(load.dates.deliveryDeadline)
        : "Not set",
      helper:
        load.status === "Picked Up"
          ? "The vehicle has been picked up. The next important date is the delivery deadline."
          : "The load is in transit. The delivery deadline is now the active schedule target.",
      tone: "cyan" as const,
      stage: "delivery" as const,
    }
  }

  return {
    tileLabel: "Pickup Date",
    modalLabel: "Pickup Date",
    value: pickupDate,
    displayValue: pickupDate ? formatDate(pickupDate) : "ASAP",
    helper:
      load.status === "Accepted"
        ? "The load has been accepted. Pickup is the next scheduled milestone."
        : load.status === "Assigned"
          ? "The load is assigned. Pickup is the next scheduled milestone."
          : "Pickup is the next scheduled milestone for this load.",
    tone: "amber" as const,
    stage: "pickup" as const,
  }
}

function getStatusTheme(status: LoadStatus) {
  switch (status) {
    case "Posted":
      return { bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", indicator: "bg-emerald-500", glow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]" }
    case "Assigned":
      return { bg: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30", indicator: "bg-blue-500", glow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]" }
    case "Accepted":
      return { bg: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30", indicator: "bg-violet-500", glow: "shadow-[0_0_10px_rgba(139,92,246,0.5)]" }
    case "Picked Up":
      return { bg: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30", indicator: "bg-amber-500", glow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]" }
    case "In-Transit":
      return { bg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30", indicator: "bg-cyan-500", glow: "shadow-[0_0_10px_rgba(6,182,212,0.5)]" }
    case "Delivered":
      return { bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", indicator: "bg-emerald-500", glow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]" }
    case "Cancelled":
      return { bg: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30", indicator: "bg-red-500", glow: "shadow-[0_0_10px_rgba(239,68,68,0.5)]" }
    default:
      return { bg: "bg-muted text-muted-foreground border-border", indicator: "bg-muted-foreground", glow: "" }
  }
}

const LOAD_CARD_JOURNEY_STATUSES = [
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
  "Delivered",
] as const

type LoadCardJourneyStatus =
  (typeof LOAD_CARD_JOURNEY_STATUSES)[number]

function normalizeLoadCardJourneyStatus(
  status?: string,
): LoadCardJourneyStatus | null {
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

const LOAD_CARD_PROGRESS_THEME: Record<
  LoadCardJourneyStatus,
  { bar: string; badge: string }
> = {
  Assigned: {
    bar: "bg-blue-500",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-500 dark:text-blue-400",
  },
  Accepted: {
    bar: "bg-violet-500",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-500 dark:text-violet-400",
  },
  "Picked Up": {
    bar: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400",
  },
  "In-Transit": {
    bar: "bg-cyan-500",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-500 dark:text-cyan-400",
  },
  Delivered: {
    bar: "bg-emerald-500",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  },
}

/** HUD-style stat tile for the info row */
function StatTile({
  label,
  icon,
  children,
  onClick,
  hint = "View details",
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  hint?: string
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="block text-[10px] sm:text-[11px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest truncate">
          {label}
        </span>
        {onClick && (
          <ChevronRight className="size-3.5 text-muted-foreground/60 transition-transform duration-200 group-hover/stat:translate-x-0.5 group-hover/stat:text-emerald-500" />
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <span className="text-sm lg:text-[15px] font-black tracking-tight truncate">
          {children}
        </span>
      </div>
    </>
  )

  if (!onClick) {
    return (
      <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      title={hint}
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        onClick()
      }}
      className={cn(
        "group/stat w-full min-w-0 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 text-left",
        "transition-all duration-200 hover:border-emerald-500/35 hover:bg-emerald-500/4 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/40",
      )}
    >
      {content}
    </button>
  )
}

function ModalMetric({
  label,
  value,
  icon,
  emphasis = false,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        emphasis
          ? "border-emerald-500/45 bg-emerald-500/6"
          : "border-slate-300/90 bg-background/45 dark:border-white/15",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "text-sm font-black tracking-tight text-foreground",
          emphasis && "text-base text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
    </div>
  )
}

function getVehicleName(vehicle: LoadVehicleItem, index: number) {
  const name = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || `Vehicle ${index + 1}`
}

function getLicensePlate(vehicle: LoadVehicleItem) {
  if (!vehicle.licensePlate) return "—"
  return [vehicle.licensePlate, vehicle.licenseState]
    .filter(Boolean)
    .join(" · ")
}

type LoadInfoModal = "vehicles" | "financials" | "dates" | null

export function LoadCard({ load, onDelete, isDeleting }: LoadCardProps) {
  const router = useRouter()
  const { organization } = useOrg()
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [activeInfoModal, setActiveInfoModal] = React.useState<LoadInfoModal>(null)
  const [imageFailed, setImageFailed] = React.useState(false)

  const pickup = load.pickupLocation
  const delivery = load.deliveryLocation
  const vehicles = load.vehicles ?? []
  const vCount = vehicles.length
  const isPublic = load.additionalInfo?.visibility !== "private"
  const isLoadBoard = load.postType === "load-board"

  // Real inventory photo — served by the API (matched by vehicleId / VIN).
  // No stock-photo fallback: an unrelated vehicle photo is worse than an
  // honest placeholder in a dispatch tool.
  const primaryVehicle = vehicles.find((v: LoadVehicleItem) => Boolean(v.imageUrl)) ?? vehicles[0]
  const heroImage = !imageFailed ? primaryVehicle?.imageUrl : undefined
  const extraImageCount = vehicles.filter((v: LoadVehicleItem) => Boolean(v.imageUrl)).length - (heroImage ? 1 : 0)

  const theme = getStatusTheme(load.status)
  const schedulePresentation = getSchedulePresentation(load)

  // Server only blocks deleting In-Transit loads — the UI must match,
  // otherwise the delete button reads as broken on Delivered loads.
  const deleteBlocked = load.status === "In-Transit"

  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsExporting(true)
    try {
      generateLoadPDF(load, organization?.name || "Your Dealership")
    } finally {
      setIsExporting(false)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    router.push(`/transportation/load/${load._id}/edit`)
  }

  const handleCardClick = () => {
    router.push("/transportation/load/" + load._id)
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    router.push("/transportation/load/" + load._id)
  }

  return (
    <>
      <Card
        onClick={handleCardClick}
        className="group relative overflow-hidden p-0 cursor-pointer rounded-2xl border-border/60 bg-card/40 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5"
      >
        {/* Cockpit hairline — status-lit top edge */}
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent z-10" />

        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row lg:min-h-64">
            {/* Hero Image / Placeholder Panel */}
            <div className="relative w-full h-56 sm:h-64 lg:h-auto lg:w-52 xl:w-60 2xl:w-72 overflow-hidden shrink-0 bg-muted/30">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={
                    primaryVehicle
                      ? `${primaryVehicle.year ?? ""} ${primaryVehicle.make ?? ""} ${primaryVehicle.model ?? ""}`.trim() || "Load vehicle"
                      : "Load vehicle"
                  }
                  loading="lazy"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
              ) : (
                /* Honest placeholder: schematic panel instead of a random stock car */
                <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-linear-to-br from-emerald-950/40 via-card to-cyan-950/30 dark:from-emerald-950/60 dark:to-cyan-950/40">
                  <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-size-[24px_24px]" />
                  <div className="size-14 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center">
                    <Car className="size-7 text-emerald-500/70" />
                  </div>
                  {primaryVehicle && (
                    <p className="text-xs font-black tracking-tight text-muted-foreground text-center px-4 truncate max-w-full">
                      {[primaryVehicle.year, primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(" ") || "No vehicle attached"}
                    </p>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">No photo on file</span>
                </div>
              )}

              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

              {/* HUD corner ticks */}
              <div className="absolute top-3 right-3 size-4 border-t border-r border-white/25 rounded-tr pointer-events-none" />
              <div className="absolute bottom-3 right-3 size-4 border-b border-r border-white/25 rounded-br pointer-events-none" />

              <div
                className={cn(
                  "absolute bottom-4 left-4 flex min-w-0 flex-col gap-0.5",
                  extraImageCount > 0 ? "right-16" : "right-4",
                )}
              >
                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.25em]">Load</span>
                <span
                  title={load.loadNumber}
                  className="truncate text-sm sm:text-base lg:text-lg font-black text-white font-mono tracking-tight drop-shadow"
                >
                  {load.loadNumber}
                </span>
              </div>

              {extraImageCount > 0 && (
                <div className="absolute bottom-4 right-4 flex shrink-0 items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-black text-white/90 uppercase tracking-wider">
                  <Layers className="size-2.5" /> +{extraImageCount}
                </div>
              )}

              <div className="absolute top-3 left-3">
                <Badge className={cn("px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border backdrop-blur-sm", theme.bg)}>
                  {load.status}
                </Badge>
              </div>
            </div>

            {/* Main Content Area — more generous padding */}
            <div className="flex-1 p-5 sm:p-6 lg:p-7 2xl:p-8 flex flex-col justify-between min-w-0">
              <div className="space-y-5 lg:space-y-6">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                    <div className={cn("size-2 rounded-full shrink-0 motion-safe:animate-pulse", theme.indicator, theme.glow)} />
                    <span className="text-[11px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest truncate">
                      {isLoadBoard ? "Public Load Board" : "Assigned Shipment"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60 hidden xs:inline">·</span>
                    <span className="text-[11px] lg:text-xs text-muted-foreground/90 font-bold hidden xs:inline">{formatDate(load.createdAt)}</span>
                  </div>

                  {/* Action cluster — stops propagation at the container so even
                      clicks on DISABLED buttons never bubble into card navigation */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); e.preventDefault() }}
                  >
                    <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm p-1">
                      {/* Edit navigates to the edit wizard directly — it no
                          longer depends on an onUpdate callback (that was
                          only for the old modal's onSave), so it always
                          renders regardless of which tab/list this card is in */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                            onClick={handleEdit}
                            aria-label="Edit load"
                          >
                            <Edit3 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            aria-label="View document"
                          >
                            {isExporting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <FileText className="size-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Document</TooltipContent>
                      </Tooltip>

                      {onDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setIsDeleteDialogOpen(true)
                              }}
                              disabled={isDeleting || deleteBlocked}
                              aria-label={
                                deleteBlocked
                                  ? "In-Transit loads can't be deleted"
                                  : "Delete load"
                              }
                            >
                              {isDeleting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {deleteBlocked ? "In-Transit loads can't be deleted" : "Delete"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleViewDetails}
                      className="h-9 px-3.5 gap-1.5 text-[11px] font-black uppercase tracking-widest bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40"
                    >
                      View Details
                      <ExternalLink className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Route Section — telemetry line signature, larger type */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 lg:gap-6 2xl:gap-8">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <MapPin className="size-3.5 text-emerald-500" />
                      </div>
                      <span className="text-[11px] lg:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Origin</span>
                    </div>
                    <p className="text-lg lg:text-xl font-black tracking-tight text-foreground truncate">
                      {pickup.city}, {pickup.state}
                    </p>
                    <p className="text-[11px] lg:text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-3" /> {pickup.contactName || "No contact"}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2 py-2 md:py-0">
                    <div className="relative h-px w-28 md:w-20 lg:w-32 overflow-hidden rounded-full bg-linear-to-r from-emerald-500/50 via-border to-cyan-500/50">
                      <div className="loadcard-telemetry absolute inset-y-0 w-8 bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
                    </div>
                    <span className="text-[11px] lg:text-xs font-black text-muted-foreground whitespace-nowrap bg-muted/60 border border-border/50 px-2.5 py-0.5 rounded-full font-mono">
                      {load.pricing?.miles != null ? `${Math.round(load.pricing.miles)} MI` : "— MI"}
                    </span>
                    <style>{`
                      @keyframes loadcard-telemetry {
                        from { transform: translateX(-2rem); }
                        to { transform: translateX(9rem); }
                      }
                      @media (prefers-reduced-motion: no-preference) {
                        .loadcard-telemetry { animation: loadcard-telemetry 2.2s linear infinite; }
                      }
                    `}</style>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <MapPin className="size-3.5 text-cyan-500" />
                      </div>
                      <span className="text-[11px] lg:text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Destination</span>
                    </div>
                    <p className="text-lg lg:text-xl font-black tracking-tight text-foreground truncate">
                      {delivery.city}, {delivery.state}
                    </p>
                    <p className="text-[11px] lg:text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-3" /> {delivery.contactName || "No contact"}
                    </p>
                  </div>
                </div>

                {/* Info Row — HUD stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-3">
                  <StatTile
                    label="Vehicles"
                    icon={<Car className="size-3.5 text-emerald-500 shrink-0" />}
                    onClick={() => setActiveInfoModal("vehicles")}
                    hint="View vehicle information"
                  >
                    {vCount} UNIT{vCount !== 1 ? "S" : ""}
                  </StatTile>
                  <StatTile
                    label="Carrier Pay"
                    icon={<DollarSign className="size-3.5 text-emerald-500 shrink-0" />}
                    onClick={() => setActiveInfoModal("financials")}
                    hint="View financial information"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(load.pricing?.carrierPayAmount)}
                    </span>
                  </StatTile>
                  <StatTile
                    label={schedulePresentation.tileLabel}
                    icon={
                      load.status === "Delivered" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      ) : load.status === "Picked Up" || load.status === "In-Transit" ? (
                        <Calendar className="size-3.5 text-cyan-500 shrink-0" />
                      ) : (
                        <Calendar className="size-3.5 text-amber-500 shrink-0" />
                      )
                    }
                    onClick={() => setActiveInfoModal("dates")}
                    hint="View current schedule milestone"
                  >
                    {schedulePresentation.displayValue}
                  </StatTile>
                  <StatTile
                    label="Visibility"
                    icon={isPublic ? <Globe className="size-3.5 text-cyan-500 shrink-0" /> : <Lock className="size-3.5 text-muted-foreground shrink-0" />}
                  >
                    {isPublic ? "PUBLIC" : "PRIVATE"}
                  </StatTile>
                </div>

                {/* Progress Bar (Mini Timeline) */}
                {load.status !== "Posted" &&
                  load.status !== "Cancelled" &&
                  (() => {
                    const currentStatus =
                      normalizeLoadCardJourneyStatus(load.status)

                    return (
                      <div className="pt-4 border-t border-border/30">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-[10px] sm:text-[11px] lg:text-xs font-black text-muted-foreground uppercase tracking-widest">
                            Journey Progress
                          </span>

                          {currentStatus && (
                            <span
                              className={cn(
                                "text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase",
                                LOAD_CARD_PROGRESS_THEME[currentStatus].badge,
                              )}
                            >
                              {load.status}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 w-full">
                          {LOAD_CARD_JOURNEY_STATUSES.map((status) => {
                            const isCurrent = currentStatus === status

                            return (
                              <div
                                key={status}
                                className={cn(
                                  "h-2 w-full rounded-full transition-all duration-300",
                                  isCurrent
                                    ? LOAD_CARD_PROGRESS_THEME[status].bar
                                    : "bg-muted",
                                )}
                                title={
                                  isCurrent
                                    ? `${status} — Current`
                                    : status
                                }
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Dialog
        open={activeInfoModal !== null}
        onOpenChange={(open) => {
          if (!open) setActiveInfoModal(null)
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-hidden border border-slate-300/95 bg-card/95 p-0 shadow-2xl backdrop-blur-xl dark:border-white/20 sm:max-w-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          {activeInfoModal === "vehicles" && (
            <>
              <DialogHeader className="border-b border-slate-300/90 bg-linear-to-r from-emerald-500/8 via-background to-cyan-500/6 px-5 py-4 dark:border-white/15 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                    <Car className="size-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-black tracking-tight">
                      Vehicles on {load.loadNumber}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs sm:text-sm">
                      {vCount === 0
                        ? "No vehicles are attached to this load."
                        : `${vCount} vehicle${vCount === 1 ? "" : "s"} attached to this transport record.`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[68vh] overflow-y-auto px-5 py-4 sm:px-6">
                {vehicles.length === 0 ? (
                  <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
                    <Car className="mb-3 size-9 text-muted-foreground/40" />
                    <p className="text-sm font-bold text-foreground">No vehicle information available</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add vehicles to this load to see their transport details here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vehicles.map((vehicle, index) => (
                      <section
                        key={`${vehicle.vehicleId ?? vehicle.vin ?? "vehicle"}-${index}`}
                        className="overflow-hidden rounded-2xl border border-slate-300/90 bg-background/45 shadow-sm dark:border-white/15"
                      >
                        <div className="grid gap-0 sm:grid-cols-[minmax(0,210px)_minmax(0,1fr)]">
                          <div className="relative overflow-hidden border-b border-slate-300/85 bg-muted/30 dark:border-white/15 sm:border-b-0 sm:border-r">
                            {vehicle.imageUrl ? (
                              <img
                                src={vehicle.imageUrl}
                                alt={getVehicleName(vehicle, index)}
                                loading="lazy"
                                className="h-44 w-full object-contain object-center sm:h-full sm:min-h-44"
                              />
                            ) : (
                              <div className="flex h-44 flex-col items-center justify-center gap-2 bg-linear-to-br from-emerald-950/20 via-muted/20 to-cyan-950/20 sm:h-full sm:min-h-44">
                                <ImageIcon className="size-8 text-muted-foreground/45" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                  No photo
                                </span>
                              </div>
                            )}
                            <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
                              Vehicle {index + 1}
                            </span>
                          </div>

                          <div className="p-4 sm:p-5">
                            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="text-base font-black tracking-tight text-foreground">
                                  {getVehicleName(vehicle, index)}
                                </h3>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                  VIN: {vehicle.vin || "Not provided"}
                                </p>
                              </div>
                              <Badge
                                className={cn(
                                  "border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                                  vehicle.condition === "Operable"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                )}
                              >
                                {vehicle.condition}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                              <ModalMetric
                                label="Vehicle Type"
                                value={vehicle.vehicleType || "—"}
                                icon={<Car className="size-3.5" />}
                              />
                              <ModalMetric
                                label="Color"
                                value={vehicle.color || "—"}
                                icon={<Palette className="size-3.5" />}
                              />
                              <ModalMetric
                                label="Lot Number"
                                value={vehicle.lotNumber || "—"}
                                icon={<Hash className="size-3.5" />}
                              />
                              <ModalMetric
                                label="License Plate"
                                value={getLicensePlate(vehicle)}
                                icon={<ClipboardList className="size-3.5" />}
                              />
                              <ModalMetric
                                label="Oversized"
                                value={vehicle.oversized ? "Yes" : "No"}
                                icon={<Gauge className="size-3.5" />}
                              />
                            </div>

                            {vehicle.carrierNotes && (
                              <div className="mt-3 rounded-xl border border-slate-300/85 bg-muted/20 px-3.5 py-3 dark:border-white/15">
                                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                  Carrier Notes
                                </div>
                                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                                  {vehicle.carrierNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeInfoModal === "financials" && (
            <>
              <DialogHeader className="border-b border-slate-300/90 bg-linear-to-r from-emerald-500/8 via-background to-background px-5 py-4 dark:border-white/15 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                    <CircleDollarSign className="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-black tracking-tight">
                      Financial Summary
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs sm:text-sm">
                      Key payout and route-value information for {load.loadNumber}.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-linear-to-br from-emerald-500/8 via-background to-cyan-500/4 p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        Carrier Pay
                      </p>
                      <p className="mt-1 text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(load.pricing?.carrierPayAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-300/90 bg-background/55 px-3.5 py-2.5 text-right dark:border-white/15">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Route Distance
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-black text-foreground">
                        {load.pricing?.miles != null
                          ? `${Math.round(load.pricing.miles)} mi`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ModalMetric
                    label="Carrier Pay"
                    value={formatCurrency(load.pricing?.carrierPayAmount)}
                    icon={<DollarSign className="size-3.5" />}
                    emphasis
                  />
                  <ModalMetric
                    label="COD / COP"
                    value={formatCurrency(load.pricing?.copCodAmount ?? 0)}
                    icon={<Banknote className="size-3.5" />}
                  />
                  <ModalMetric
                    label="Total Distance"
                    value={
                      load.pricing?.miles != null
                        ? `${Math.round(load.pricing.miles)} mi`
                        : "—"
                    }
                    icon={<Route className="size-3.5" />}
                  />
                  <ModalMetric
                    label="Estimated Market Rate"
                    value={formatCurrency(load.pricing?.estimatedRate)}
                    icon={<Gauge className="size-3.5" />}
                  />
                  {load.pricing?.balanceAmount != null && (
                    <ModalMetric
                      label="Balance"
                      value={formatCurrency(load.pricing.balanceAmount)}
                      icon={<CircleDollarSign className="size-3.5" />}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-slate-300/90 bg-muted/20 px-4 py-3 dark:border-white/15">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Financial context
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Values shown here come from this load&apos;s saved pricing information.
                    Missing amounts are displayed as unavailable rather than estimated.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeInfoModal === "dates" && (
            <>
              <DialogHeader
                className={cn(
                  "border-b border-slate-300/90 px-5 py-4 dark:border-white/15 sm:px-6",
                  schedulePresentation.tone === "emerald" &&
                  "bg-linear-to-r from-emerald-500/9 via-background to-cyan-500/4",
                  schedulePresentation.tone === "cyan" &&
                  "bg-linear-to-r from-cyan-500/9 via-background to-blue-500/4",
                  schedulePresentation.tone === "amber" &&
                  "bg-linear-to-r from-amber-500/9 via-background to-cyan-500/4",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                      schedulePresentation.tone === "emerald" &&
                      "border-emerald-500/25 bg-emerald-500/10",
                      schedulePresentation.tone === "cyan" &&
                      "border-cyan-500/25 bg-cyan-500/10",
                      schedulePresentation.tone === "amber" &&
                      "border-amber-500/25 bg-amber-500/10",
                    )}
                  >
                    {schedulePresentation.stage === "completed" ? (
                      <CheckCircle2 className="size-5 text-emerald-500" />
                    ) : schedulePresentation.stage === "delivery" ? (
                      <CalendarDays className="size-5 text-cyan-500" />
                    ) : (
                      <CalendarDays className="size-5 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-black tracking-tight">
                      Transport Schedule
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs sm:text-sm">
                      The schedule automatically follows the current journey progress for {load.loadNumber}.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                {/* Current milestone — this is intentionally the first thing
                    the user sees when opening the schedule modal. */}
                <section
                  className={cn(
                    "overflow-hidden rounded-2xl border p-5",
                    schedulePresentation.tone === "emerald" &&
                    "border-emerald-500/40 bg-linear-to-br from-emerald-500/9 via-background to-emerald-500/2",
                    schedulePresentation.tone === "cyan" &&
                    "border-cyan-500/40 bg-linear-to-br from-cyan-500/9 via-background to-blue-500/2",
                    schedulePresentation.tone === "amber" &&
                    "border-amber-500/45 bg-linear-to-br from-amber-500/9 via-background to-amber-500/2",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                          Current Schedule Focus
                        </span>
                        <Badge
                          className={cn(
                            "border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                            theme.bg,
                          )}
                        >
                          {load.status}
                        </Badge>
                      </div>

                      <p
                        className={cn(
                          "mt-2 text-sm font-black uppercase tracking-[0.12em]",
                          schedulePresentation.tone === "emerald" &&
                          "text-emerald-600 dark:text-emerald-400",
                          schedulePresentation.tone === "cyan" &&
                          "text-cyan-600 dark:text-cyan-400",
                          schedulePresentation.tone === "amber" &&
                          "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {schedulePresentation.modalLabel}
                      </p>

                      <p className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                        {schedulePresentation.displayValue}
                      </p>

                      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {schedulePresentation.helper}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-xl border bg-background/60 px-3.5 py-2.5",
                        schedulePresentation.tone === "emerald" &&
                        "border-emerald-500/20",
                        schedulePresentation.tone === "cyan" &&
                        "border-cyan-500/20",
                        schedulePresentation.tone === "amber" &&
                        "border-amber-500/20",
                      )}
                    >
                      {schedulePresentation.stage === "completed" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <Clock3
                          className={cn(
                            "size-4",
                            schedulePresentation.tone === "cyan"
                              ? "text-cyan-500"
                              : "text-amber-500",
                          )}
                        />
                      )}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Journey Status
                        </p>
                        <p className="text-xs font-black text-foreground">
                          {load.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Supporting schedule data remains available below the current
                    milestone, but no longer competes with the active date. */}
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      label: "First Available",
                      value: load.dates?.firstAvailable,
                      helper: "Earliest date the vehicle is ready for pickup.",
                      tone: "amber",
                      isCurrent: schedulePresentation.stage === "pickup",
                    },
                    {
                      label: "Pickup Deadline",
                      value: load.dates?.pickupDeadline,
                      helper: "Target deadline for pickup completion.",
                      tone: "violet",
                      isCurrent: false,
                    },
                    {
                      label:
                        load.status === "Delivered"
                          ? "Delivered"
                          : "Delivery Deadline",
                      value:
                        load.status === "Delivered"
                          ? load.deliveredAt
                          : load.dates?.deliveryDeadline,
                      helper:
                        load.status === "Delivered"
                          ? "Recorded completion of final delivery."
                          : "Target deadline for final delivery.",
                      tone: load.status === "Delivered" ? "emerald" : "cyan",
                      isCurrent:
                        schedulePresentation.stage === "delivery" ||
                        schedulePresentation.stage === "completed",
                      withTime: load.status === "Delivered",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-2xl border bg-background/50 p-4 shadow-sm transition-colors",
                        item.isCurrent
                          ? item.tone === "emerald"
                            ? "border-emerald-500/45 bg-emerald-500/5"
                            : item.tone === "cyan"
                              ? "border-cyan-500/45 bg-cyan-500/5"
                              : "border-amber-500/45 bg-amber-500/5"
                          : "border-slate-300/90 dark:border-white/15",
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border",
                            item.tone === "amber" &&
                            "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            item.tone === "violet" &&
                            "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
                            item.tone === "cyan" &&
                            "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                            item.tone === "emerald" &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {item.tone === "emerald" ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Calendar className="size-4" />
                          )}
                        </div>

                        {item.isCurrent && (
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                              item.tone === "emerald" &&
                              "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              item.tone === "cyan" &&
                              "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                              item.tone === "amber" &&
                              "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            Current
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-base font-black tracking-tight text-foreground">
                        {item.value
                          ? item.withTime
                            ? formatDateTime(item.value)
                            : formatDate(item.value)
                          : "Not set"}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {item.helper}
                      </p>
                    </div>
                  ))}
                </div>

                {load.dates?.notes && (
                  <div className="rounded-xl border border-slate-300/90 bg-muted/20 px-4 py-3.5 dark:border-white/15">
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      <FileText className="size-3.5" />
                      Date Notes
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                      {load.dates.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          setIsDeleteDialogOpen(false)
          // Error handling + toasts live in the owning hook — the card only fires the action
          onDelete?.(load._id)
        }}
        title="Delete Load"
        description={`Are you sure you want to delete load ${load.loadNumber}? This action cannot be undone.`}
        confirmText="Yes, Delete Load"
        variant="danger"
      />
    </>
  )
}