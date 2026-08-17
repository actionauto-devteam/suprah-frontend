"use client"

import * as React from "react"
import {
  User,
  RefreshCw,
  Check,
  AlertTriangle,
  Radio,
  Megaphone,
  Truck,
  Loader2,
  ShieldAlert,
  WifiOff,
  UserX,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type {
  DriverLoadCompatibility,
  DriverStatus,
  DriverTrackingItem,
} from "@/types/driver-tracking"
import {
  compatibilityRank,
  evaluateDriverLoadCompatibility,
  titleCaseDay,
  type DriverLoadLike,
} from "@/lib/driver-load-compatibility"
import { useDriverLoadCompatibilityPreview } from "@/hooks/useDriverLoadCompatibilityPreview"
import { DriverLoadRecommendationBadges } from "@/components/driver-tracker/DriverLoadRecommendationBadges"

// ─── Centralized driver directory types ──────────────────────────────────────
// Mirrors GET /api/driver-tracking/org-drivers — the single source of truth
// for org drivers, merged from User + DriverProfile + DriverLocation.

export interface OrgDriver {
  id: string
  name: string
  email: string
  phone: string
  avatar: string | null
  isActive: boolean
  equipment: {
    trailerType: string | null
    maxVehicleCapacity: number | null
    operationalStatus: string | null
    truckMake: string | null
    truckModel: string | null
    isComplianceExpired: boolean
    profileCompletionScore?: number
  } | null
  availability?: {
    availableDays: string[]
  }
  logistics?: {
    serviceRadiusMiles: number | null
    preferredRoutes: string[]
    homeBase: {
      city: string | null
      state: string | null
      zip: string | null
      coordinates: { lat: number; lng: number } | null
    }
  }
  presence: {
    status: string
    lastSeenAt: string | null
    coords?: { lat: number; lng: number } | null
    isSharing?: boolean
  }
  activeLoadCount: number
  /** @deprecated Vehicle capacity is per load, not active-load subtraction. */
  remainingCapacity: number | null
  assignable: boolean
  warnings: string[]
}

const WARNING_META: Record<string, { label: string; icon: React.ElementType }> = {
  no_driver_profile: { label: "No profile", icon: UserX },
  compliance_expired: { label: "Compliance expired", icon: ShieldAlert },
  offline_or_stale_location: { label: "Offline", icon: WifiOff },
  inactive_account: { label: "Inactive", icon: UserX },
  on_leave: { label: "On Leave", icon: AlertTriangle },
  in_shop: { label: "In Shop", icon: AlertTriangle },
  emergency_release_active: { label: "Emergency release", icon: AlertTriangle },
  status_change_awaiting_reassignment: {
    label: "Status change pending",
    icon: AlertTriangle,
  },
}

const PRESENCE_DOT: Record<string, string> = {
  "on-route": "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.55)]",
  idle: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]",
  "on-break": "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.55)]",
  waiting: "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.55)]",
  offline: "bg-slate-500",
}

interface DriverPickerSectionProps {
  selectedDriverId: string | null
  onSelectDriver: (driverId: string | null) => void
  /** "Make it Available Load": publish without a driver */
  makeAvailable: boolean
  onMakeAvailableChange: (value: boolean) => void
  /** Lifts the selected driver's display info up for the Review step */
  onSelectDriverInfo?: (driver: OrgDriver | null) => void
  /** Unsaved Create Load data used only for read-only matching recommendations. */
  loadPreview?: DriverLoadLike | null
}

function toTrackingItem(driver: OrgDriver): DriverTrackingItem {
  return {
    id: driver.id,
    status: (driver.presence.status || "offline") as DriverStatus,
    coords: driver.presence.coords ?? null,
    lastSeenAt: driver.presence.lastSeenAt ?? null,
    isSharing: Boolean(driver.presence.isSharing),
    assignable: driver.assignable,
    warnings: driver.warnings ?? [],
    remainingCapacity: null,
    activeLoadCount: driver.activeLoadCount,
    availability: {
      availableDays: driver.availability?.availableDays ?? [],
    },
    logistics: driver.logistics
      ? {
          serviceRadiusMiles: driver.logistics.serviceRadiusMiles,
          preferredRoutes: driver.logistics.preferredRoutes ?? [],
          homeBase: driver.logistics.homeBase,
        }
      : undefined,
    driver: {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      avatar: driver.avatar,
      messagingAvailable: false,
    },
    equipment: driver.equipment
      ? {
          trailerType: driver.equipment.trailerType ?? undefined,
          maxVehicleCapacity: driver.equipment.maxVehicleCapacity ?? undefined,
          operationalStatus: (driver.equipment.operationalStatus ?? "active") as
            | "active"
            | "on_leave"
            | "maintenance",
          truckMake: driver.equipment.truckMake ?? undefined,
          truckModel: driver.equipment.truckModel ?? undefined,
          isComplianceExpired: driver.equipment.isComplianceExpired,
          profileCompletionScore: driver.equipment.profileCompletionScore,
        }
      : null,
    shipments: [],
  }
}

function CoreCompatibilityBadges({
  compatibility,
}: {
  compatibility: DriverLoadCompatibility | null
}) {
  if (!compatibility) return null

  const availability = compatibility.availability.status
  const capacity = compatibility.capacity.status
  const trailer = compatibility.trailer.status

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          "h-auto whitespace-normal px-1.5 py-0.5 text-[9px] font-bold",
          availability === "match"
            ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            : availability === "off_schedule"
              ? "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400"
              : "border-border/60 bg-muted/20 text-muted-foreground",
        )}
      >
        {availability === "match" ? (
          <CheckCircle2 className="mr-1 size-2.5 shrink-0" />
        ) : availability === "off_schedule" ? (
          <AlertTriangle className="mr-1 size-2.5 shrink-0" />
        ) : (
          <Calendar className="mr-1 size-2.5 shrink-0" />
        )}
        {availability === "match"
          ? `Available ${titleCaseDay(compatibility.availability.pickupDay) || ""}`.trim()
          : availability === "off_schedule"
            ? `Off Schedule ${titleCaseDay(compatibility.availability.pickupDay) || ""}`.trim()
            : "Schedule Unknown"}
      </Badge>

      <Badge
        variant="outline"
        className={cn(
          "h-auto whitespace-normal px-1.5 py-0.5 text-[9px] font-bold",
          capacity === "match"
            ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
            : "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-400",
        )}
      >
        {capacity === "match" ? (
          <CheckCircle2 className="mr-1 size-2.5 shrink-0" />
        ) : capacity === "exceeded" ? (
          <XCircle className="mr-1 size-2.5 shrink-0" />
        ) : (
          <AlertTriangle className="mr-1 size-2.5 shrink-0" />
        )}
        {capacity === "match"
          ? `Capacity ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles}`
          : capacity === "exceeded"
            ? `Capacity ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles} · Exceeded`
            : "Capacity Not Verified"}
      </Badge>

      {trailer !== "unknown" && (
        <Badge
          variant="outline"
          className={cn(
            "h-auto whitespace-normal px-1.5 py-0.5 text-[9px] font-bold",
            trailer === "match"
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400",
          )}
        >
          {trailer === "match" ? (
            <CheckCircle2 className="mr-1 size-2.5 shrink-0" />
          ) : (
            <AlertTriangle className="mr-1 size-2.5 shrink-0" />
          )}
          Trailer {trailer === "match" ? "Match" : "Mismatch"}
        </Badge>
      )}
    </div>
  )
}

export function DriverPickerSection({
  selectedDriverId,
  onSelectDriver,
  makeAvailable,
  onMakeAvailableChange,
  onSelectDriverInfo,
  loadPreview = null,
}: DriverPickerSectionProps) {
  const [drivers, setDrivers] = React.useState<OrgDriver[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchDrivers = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get("/api/driver-tracking/org-drivers")
      const data = res.data?.data ?? res.data
      setDrivers(data?.drivers ?? [])
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load drivers",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchDrivers()
  }, [fetchDrivers])

  const previewDriverIds = React.useMemo(
    () => drivers.map((driver) => driver.id),
    [drivers],
  )

  const { compatibilityByDriverId, isLoading: isMatching } =
    useDriverLoadCompatibilityPreview({
      load: loadPreview,
      driverIds: previewDriverIds,
      enabled: Boolean(loadPreview) && !makeAvailable,
    })

  const compatibilityForDriver = React.useCallback(
    (driver: OrgDriver): DriverLoadCompatibility | null => {
      if (!loadPreview) return null
      return (
        compatibilityByDriverId[driver.id] ??
        evaluateDriverLoadCompatibility(toTrackingItem(driver), loadPreview)
      )
    },
    [compatibilityByDriverId, loadPreview],
  )

  const sortedDrivers = React.useMemo(() => {
    return [...drivers].sort((a, b) => {
      // Preserve the existing operational eligibility priority first. Matching
      // recommendations never promote an unavailable driver over an eligible one.
      if (a.assignable !== b.assignable) return a.assignable ? -1 : 1

      const aCompatibility = compatibilityForDriver(a)
      const bCompatibility = compatibilityForDriver(b)
      if (aCompatibility && bCompatibility) {
        const rankDiff =
          compatibilityRank(aCompatibility) - compatibilityRank(bCompatibility)
        if (rankDiff !== 0) return rankDiff
      }

      return a.name.localeCompare(b.name)
    })
  }, [drivers, compatibilityForDriver])

  const bestDriverId = React.useMemo(() => {
    if (!loadPreview) return null
    const candidate = sortedDrivers.find((driver) => {
      const compatibility = compatibilityForDriver(driver)
      return (
        driver.assignable &&
        compatibility?.capacity.status === "match" &&
        compatibility.availability.status !== "off_schedule"
      )
    })
    return candidate?.id ?? null
  }, [compatibilityForDriver, loadPreview, sortedDrivers])

  const handleMakeAvailable = (value: boolean) => {
    onMakeAvailableChange(value)
    if (value) {
      onSelectDriver(null)
      onSelectDriverInfo?.(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── "Make it Available Load" — publish without assigning ── */}
      <button
        type="button"
        onClick={() => handleMakeAvailable(!makeAvailable)}
        aria-pressed={makeAvailable}
        className={cn(
          "w-full text-left rounded-xl border p-4 transition-colors relative overflow-hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          makeAvailable
            ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
            : "border-border/60 bg-background/40 hover:border-emerald-500/25",
        )}
      >
        <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "size-9 rounded-lg border flex items-center justify-center shrink-0",
              makeAvailable
                ? "bg-emerald-500/15 border-emerald-500/30"
                : "bg-muted/60 border-border/60",
            )}
          >
            <Megaphone
              className={cn(
                "size-4",
                makeAvailable ? "text-emerald-500" : "text-muted-foreground",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black tracking-tight text-foreground">
              Make it Available Load
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Publish without assigning a driver. The load appears in every
              driver's Available Loads, and drivers request it from their
              account — you approve from the Transportation page.
            </p>
          </div>
          <div
            className={cn(
              "size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              makeAvailable
                ? "border-emerald-500 bg-emerald-500"
                : "border-border",
            )}
          >
            {makeAvailable && <Check className="size-3 text-white" />}
          </div>
        </div>
      </button>

      {/* ── Driver directory ── */}
      <div className={cn(makeAvailable && "opacity-40 pointer-events-none")}>
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-1.5">
              <Radio className="size-3" /> Assign Driver
              {!isLoading && (
                <span className="font-mono normal-case tracking-normal">
                  ({drivers.length})
                </span>
              )}
            </p>
            {loadPreview && (
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/75">
                Drivers are ordered by eligibility, capacity, schedule, equipment,
                service area, preferred route, and pickup proximity. Service area,
                route preference, and distance are informational only.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isMatching && loadPreview && (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              onClick={fetchDrivers}
              disabled={isLoading}
            >
              <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-border/60 bg-background/40 h-32">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-500 font-medium">
            {error}
          </div>
        ) : drivers.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/40 p-6 text-center">
            <Truck className="size-5 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs font-bold text-muted-foreground">
              No drivers in this organization yet
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Drivers created in Driver's Account appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto overscroll-contain pr-1">
            {/* Every org driver remains visible. Matching changes order and adds
                context only; Dispatch keeps the final assignment decision. */}
            {sortedDrivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id
              const dot =
                PRESENCE_DOT[driver.presence.status] ?? PRESENCE_DOT.offline
              const compatibility = compatibilityForDriver(driver)
              const isBestMatch = driver.id === bestDriverId

              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? null : driver.id
                    onSelectDriver(next)
                    onSelectDriverInfo?.(next ? driver : null)
                  }}
                  aria-pressed={isSelected}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/60 bg-background/40 hover:border-emerald-500/25",
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {driver.avatar ? (
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                          <User className="size-4 text-emerald-500" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                          dot,
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <p className="text-sm font-black tracking-tight text-foreground break-words [overflow-wrap:anywhere]">
                          {driver.name}
                        </p>
                        {isBestMatch && (
                          <Badge className="h-5 border-emerald-500/25 bg-emerald-500/10 px-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Best Match
                          </Badge>
                        )}
                        {driver.equipment?.trailerType && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-full shrink-0">
                            {driver.equipment.trailerType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {driver.activeLoadCount} active
                          {driver.equipment?.maxVehicleCapacity != null
                            ? ` · equipment cap ${driver.equipment.maxVehicleCapacity}`
                            : ""}
                        </span>
                        {driver.warnings.map((w) => {
                          const meta = WARNING_META[w]
                          if (!meta) return null
                          const Icon = meta.icon
                          return (
                            <span
                              key={w}
                              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full"
                            >
                              <Icon className="size-2.5" /> {meta.label}
                            </span>
                          )
                        })}
                      </div>

                      <CoreCompatibilityBadges compatibility={compatibility} />
                      <DriverLoadRecommendationBadges
                        compatibility={compatibility}
                        className="mt-1.5"
                      />
                    </div>

                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mt-0.5",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-border",
                      )}
                    >
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Advisory note when the selected driver has existing directory warnings */}
        {(() => {
          const selected = drivers.find((d) => d.id === selectedDriverId)
          if (!selected || selected.warnings.length === 0) return null
          return (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                {selected.name} has advisory flags (
                {selected.warnings
                  .map((w) => WARNING_META[w]?.label ?? w)
                  .join(", ")}
                ). The backend still applies the existing operational eligibility
                and compatibility checks before assignment.
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}