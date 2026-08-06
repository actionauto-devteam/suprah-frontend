"use client"

import * as React from "react"
import {
  User, RefreshCw, Check, AlertTriangle, Radio, Megaphone,
  Truck, Loader2, ShieldAlert, PackageX, WifiOff, UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

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
  } | null
  presence: {
    status: string
    lastSeenAt: string | null
  }
  activeLoadCount: number
  remainingCapacity: number | null
  assignable: boolean
  warnings: string[]
}

const WARNING_META: Record<string, { label: string; icon: React.ElementType }> = {
  no_driver_profile: { label: "No profile", icon: UserX },
  compliance_expired: { label: "Compliance expired", icon: ShieldAlert },
  at_capacity: { label: "At capacity", icon: PackageX },
  offline_or_stale_location: { label: "Offline", icon: WifiOff },
  inactive_account: { label: "Inactive", icon: UserX },
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
}

export function DriverPickerSection({
  selectedDriverId,
  onSelectDriver,
  makeAvailable,
  onMakeAvailableChange,
  onSelectDriverInfo,
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Radio className="size-3" /> Assign Driver
            {!isLoading && (
              <span className="font-mono normal-case tracking-normal">
                ({drivers.length})
              </span>
            )}
          </p>
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
            {/* BUSINESS RULE: every org driver is listed — warnings inform,
                they never hide. The dispatcher decides. */}
            {drivers.map((driver) => {
              const isSelected = selectedDriverId === driver.id
              const dot =
                PRESENCE_DOT[driver.presence.status] ?? PRESENCE_DOT.offline
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
                  <div className="flex items-center gap-3 min-w-0">
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
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-black tracking-tight text-foreground truncate">
                          {driver.name}
                        </p>
                        {driver.equipment?.trailerType && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-full shrink-0">
                            {driver.equipment.trailerType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {driver.activeLoadCount} active
                          {driver.remainingCapacity != null
                            ? ` · ${driver.remainingCapacity} slots free`
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
                    </div>

                    <div
                      className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
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

        {/* Advisory note when the selected driver has warnings */}
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
                ). You can still assign — this is informational only.
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}