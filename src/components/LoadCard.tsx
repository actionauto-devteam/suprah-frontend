"use client"

import * as React from "react"
import {
  MapPin, DollarSign,
  Calendar, Globe, Lock, Car, Trash2, Loader2,
  FileText, Edit3, User, ExternalLink, Layers
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Load, LoadStatus } from "@/types/load"
import { useRouter } from "next/navigation"
import { generateLoadPDF } from "@/utils/pdfGenerator"
import { EditLoadModal } from "@/components/EditLoadModal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { cn } from "@/lib/utils"

interface LoadCardProps {
  load: Load
  onDelete?: (loadId: string) => void
  onUpdate?: (id: string, updatedLoad: Partial<Load>) => Promise<void>
  isDeleting?: boolean
}

type LoadVehicleItem = NonNullable<Load["vehicles"]>[number]

function formatCurrency(n?: number) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function formatDate(d?: string | Date) {
  if (!d) return "—"
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })
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
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 min-w-0">
      <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 truncate">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <span className="text-sm font-black tracking-tight truncate">{children}</span>
      </div>
    </div>
  )
}

export function LoadCard({ load, onDelete, onUpdate, isDeleting }: LoadCardProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
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

  // Server only blocks deleting In-Transit loads — the UI must match,
  // otherwise the delete button reads as broken on Delivered loads.
  const deleteBlocked = load.status === "In-Transit"

  const handleExportPDF = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsExporting(true)
    try {
      generateLoadPDF(load)
    } finally {
      setIsExporting(false)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditModalOpen(true)
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
          <div className="flex flex-col md:flex-row md:min-h-72 lg:min-h-80">
            {/* Hero Image / Placeholder Panel — wider, taller */}
            <div className="relative w-full md:w-80 lg:w-96 xl:w-[26rem] h-56 md:h-auto overflow-hidden shrink-0 bg-muted/30">
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
                  <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <div className="size-14 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center">
                    <Car className="size-7 text-emerald-500/70" />
                  </div>
                  {primaryVehicle && (
                    <p className="text-xs font-black tracking-tight text-muted-foreground text-center px-4 truncate max-w-full">
                      {[primaryVehicle.year, primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(" ") || "No vehicle attached"}
                    </p>
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">No photo on file</span>
                </div>
              )}

              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

              {/* HUD corner ticks */}
              <div className="absolute top-3 right-3 size-4 border-t border-r border-white/25 rounded-tr pointer-events-none" />
              <div className="absolute bottom-3 right-3 size-4 border-b border-r border-white/25 rounded-br pointer-events-none" />

              <div className="absolute bottom-4 left-4 flex flex-col gap-0.5">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.25em]">Load</span>
                <span className="text-base lg:text-lg font-black text-white font-mono tracking-tight drop-shadow">{load.loadNumber}</span>
              </div>

              {extraImageCount > 0 && (
                <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] font-black text-white/90 uppercase tracking-wider">
                  <Layers className="size-2.5" /> +{extraImageCount}
                </div>
              )}

              <div className="absolute top-3 left-3">
                <Badge className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm", theme.bg)}>
                  {load.status}
                </Badge>
              </div>
            </div>

            {/* Main Content Area — more generous padding */}
            <div className="flex-1 p-5 sm:p-6 lg:p-8 flex flex-col justify-between min-w-0">
              <div className="space-y-5 lg:space-y-6">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                    <div className={cn("size-2 rounded-full shrink-0 motion-safe:animate-pulse", theme.indicator, theme.glow)} />
                    <span className="text-[10px] lg:text-[11px] font-black text-muted-foreground uppercase tracking-widest truncate">
                      {isLoadBoard ? "Public Load Board" : "Assigned Shipment"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 hidden xs:inline">·</span>
                    <span className="text-[10px] lg:text-[11px] text-muted-foreground/80 font-bold hidden xs:inline">{formatDate(load.createdAt)}</span>
                  </div>

                  {/* Action cluster — stops propagation at the container so even
                      clicks on DISABLED buttons never bubble into card navigation */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); e.preventDefault() }}
                  >
                    <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm p-1">
                      {/* Edit only renders when an onUpdate handler exists —
                          previously this button appeared on the Board tab too,
                          where no EditLoadModal mounts, so it did nothing */}
                      {onUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                          onClick={handleEdit}
                          title="Edit load"
                        >
                          <Edit3 className="size-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-cyan-500 hover:bg-cyan-500/10"
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        title="Export PDF"
                      >
                        {isExporting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                      </Button>

                      {onDelete && (
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
                          title={
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
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleViewDetails}
                      className="h-9 px-3.5 gap-1.5 text-[10px] font-black uppercase tracking-widest bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40"
                    >
                      View Details
                      <ExternalLink className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Route Section — telemetry line signature, larger type */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 lg:gap-8">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <MapPin className="size-3.5 text-emerald-500" />
                      </div>
                      <span className="text-[10px] lg:text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Origin</span>
                    </div>
                    <p className="text-lg lg:text-xl font-black tracking-tight text-foreground truncate">
                      {pickup.city}, {pickup.state}
                    </p>
                    <p className="text-[10px] lg:text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-3" /> {pickup.contactName || "No contact"}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2 py-2 md:py-0">
                    <div className="relative h-px w-28 md:w-20 lg:w-32 overflow-hidden rounded-full bg-linear-to-r from-emerald-500/50 via-border to-cyan-500/50">
                      <div className="loadcard-telemetry absolute inset-y-0 w-8 bg-linear-to-r from-transparent via-cyan-400 to-transparent" />
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-black text-muted-foreground whitespace-nowrap bg-muted/60 border border-border/50 px-2.5 py-0.5 rounded-full font-mono">
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
                      <span className="text-[10px] lg:text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Destination</span>
                    </div>
                    <p className="text-lg lg:text-xl font-black tracking-tight text-foreground truncate">
                      {delivery.city}, {delivery.state}
                    </p>
                    <p className="text-[10px] lg:text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <User className="size-3" /> {delivery.contactName || "No contact"}
                    </p>
                  </div>
                </div>

                {/* Info Row — HUD stat tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
                  <StatTile label="Vehicles" icon={<Car className="size-3.5 text-emerald-500 shrink-0" />}>
                    {vCount} UNIT{vCount !== 1 ? "S" : ""}
                  </StatTile>
                  <StatTile label="Carrier Pay" icon={<DollarSign className="size-3.5 text-emerald-500 shrink-0" />}>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(load.pricing?.carrierPayAmount)}</span>
                  </StatTile>
                  <StatTile label="Pickup Date" icon={<Calendar className="size-3.5 text-amber-500 shrink-0" />}>
                    {load.dates?.firstAvailable ? formatDate(load.dates.firstAvailable) : "ASAP"}
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
                          <span className="text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Journey Progress
                          </span>

                          {currentStatus && (
                            <span
                              className={cn(
                                "text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase",
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

      {onUpdate && (
        <EditLoadModal
          load={load}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={onUpdate}
        />
      )}

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