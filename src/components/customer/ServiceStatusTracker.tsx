"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchActiveService, ServiceRecord, ServiceStatus } from "@/lib/api/services"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Circle, Loader2, Wrench, ShieldCheck, PackageCheck, Car } from "lucide-react"

const STAGES: { key: ServiceStatus; label: string; icon: React.ElementType }[] = [
  { key: "received",      label: "Car Received",      icon: Car },
  { key: "in_service",    label: "Being Serviced",    icon: Wrench },
  { key: "quality_check", label: "Quality Check",     icon: ShieldCheck },
  { key: "ready",         label: "Ready for Pickup",  icon: PackageCheck },
]

const STATUS_INDEX: Record<ServiceStatus, number> = {
  received:      0,
  in_service:    1,
  quality_check: 2,
  ready:         3,
  completed:     4,
}

function StageNode({
  stage,
  currentIndex,
  stageIndex,
  isLast,
}: {
  stage: (typeof STAGES)[number]
  currentIndex: number
  stageIndex: number
  isLast: boolean
}) {
  const Icon = stage.icon
  const done    = stageIndex < currentIndex
  const active  = stageIndex === currentIndex
  const pending = stageIndex > currentIndex

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      {/* icon circle */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
          done
            ? "bg-green-600 border-green-600 text-white"
            : active
            ? "bg-white dark:bg-zinc-900 border-green-500 text-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
        }`}
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : active ? (
          <Icon className="w-5 h-5 animate-pulse" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </div>

      {/* label */}
      <span
        className={`mt-2 text-center text-[10px] xs:text-xs font-semibold leading-tight px-0.5 w-full ${
          done    ? "text-green-600 dark:text-green-400"
          : active  ? "text-foreground"
          : "text-zinc-400"
        }`}
      >
        {stage.label}
        {active && (
          <span className="flex justify-center items-center gap-0.5 text-[9px] text-green-500 font-bold mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
            LIVE
          </span>
        )}
      </span>
    </div>
  )
}

interface ServiceStatusTrackerProps {
  vehicleId: string
  vehicleLabel: string
}

export function ServiceStatusTracker({ vehicleId, vehicleLabel }: ServiceStatusTrackerProps) {
  const { data: record, isLoading } = useQuery<ServiceRecord | null>({
    queryKey: ["activeService", vehicleId],
    queryFn: () => fetchActiveService(vehicleId),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking service status…
      </div>
    )
  }

  if (!record) return null

  const currentIndex = STATUS_INDEX[record.serviceStatus ?? "received"]
  const lastUpdated  = record.statusUpdatedAt
    ? new Date(record.statusUpdatedAt).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })
    : null

  return (
    <Card className="p-5 rounded-3xl border-green-500/30 bg-green-50/50 dark:bg-green-950/20 shadow-sm">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span className="w-2 h-2 shrink-0 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="truncate">Active Service — {vehicleLabel}</span>
          </h4>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5 pl-4">
              Last updated {lastUpdated}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-1 rounded-full max-w-[120px] truncate">
          {record.locationName}
        </span>
      </div>

      {/* stages */}
      <div className="flex items-start gap-0 relative">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <StageNode
              stage={stage}
              currentIndex={currentIndex}
              stageIndex={i}
              isLast={i === STAGES.length - 1}
            />
            {i < STAGES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-5 transition-all duration-500 ${
                  i < currentIndex
                    ? "bg-green-500"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* service type pill */}
      <div className="mt-4 pt-4 border-t border-green-200/50 dark:border-green-800/30 flex flex-wrap items-center justify-between gap-y-1">
        <span className="text-xs text-muted-foreground">
          Service:{" "}
          <strong className="text-foreground">
            {record.serviceType.replace(/_/g, " ")}
          </strong>
        </span>
        <span className="text-[10px] text-muted-foreground hidden xs:inline">
          Auto-updates every 30s
        </span>
      </div>
    </Card>
  )
}
