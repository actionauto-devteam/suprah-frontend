"use client"

import * as React from "react"
import { ClipboardCheck, ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VehicleDamageOutline } from "@/components/driver/VehicleDamageOutline"
import {
  CONDITION_AREA_LABELS,
  CONDITION_DAMAGE_LABELS,
  type ConditionReport,
  type ConditionStop,
  type DeliverySignature,
} from "@/lib/condition-report"
import type { Load } from "@/types/load"
import { formatMountainDateTime } from "@/lib/mountain-time"

const fmt = (iso?: string | null) => (iso ? formatMountainDateTime(iso) : "")

/**
 * The driver's vehicle condition report on Dispatch's load page: for each
 * vehicle, pickup and delivery side by side (photos, damage marked on the
 * outline, kinds of damage, notes), and the customer's signature. Hidden
 * until the driver has added something.
 */
export function ConditionReportCard({
  vehicles,
  reports,
  signature,
}: {
  vehicles: Load["vehicles"]
  reports?: ConditionReport[]
  signature?: DeliverySignature | null
}) {
  const list = Array.isArray(reports) ? reports : []
  if (!list.length && !signature) return null

  const vehicleIndexes = [...new Set(list.map((report) => report.vehicleIndex))].sort((a, b) => a - b)
  const driverNames = new Set(list.map((report) => report.driverName).filter(Boolean))

  return (
    <Card className="sm:col-span-2 lg:col-span-3 border-border shadow-sm bg-card overflow-hidden p-0">
      <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ClipboardCheck className="size-3.5" /> Vehicle Condition
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        {vehicleIndexes.map((index) => {
          const vehicle = vehicles?.[index]
          const label =
            [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || `Vehicle ${index + 1}`
          return (
            <div key={index} className="space-y-3">
              <p className="text-sm font-bold text-foreground">
                {index + 1}. {label}
                {vehicle?.vin ? <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{vehicle.vin}</span> : null}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(["pickup", "delivery"] as ConditionStop[]).map((stop) => (
                  <StopReport
                    key={stop}
                    stop={stop}
                    reports={list.filter((report) => report.vehicleIndex === index && report.stop === stop)}
                    showDriver={driverNames.size > 1}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {signature && (
          <div className="space-y-2 rounded-xl border border-border/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer signature at delivery</p>
            {signature.signatureDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signature.signatureDataUrl}
                alt={`Signature of ${signature.signerName}`}
                className="h-24 w-full max-w-sm rounded-lg border border-border bg-white object-contain"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {signature.signerName} · {fmt(signature.signedAt)}
              {signature.driverName ? ` · taken by ${signature.driverName}` : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StopReport({
  stop,
  reports,
  showDriver,
}: {
  stop: ConditionStop
  reports: ConditionReport[]
  showDriver: boolean
}) {
  const title = stop === "pickup" ? "At pickup" : "At delivery"
  if (!reports.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Nothing recorded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3">
      {reports.map((report) => (
        <div key={report.id} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
            {showDriver && report.driverName ? ` · ${report.driverName}` : ""}
            {report.updatedAt ? ` · ${fmt(report.updatedAt)}` : ""}
          </p>

          {report.photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {report.photos.map((photo) =>
                photo.url ? (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={
                      photo.area
                        ? `Open the ${(CONDITION_AREA_LABELS[photo.area] ?? photo.area).toLowerCase()} photo in a new tab`
                        : "Open photo in a new tab"
                    }
                    className="relative block aspect-square overflow-hidden rounded-md border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Vehicle condition photo" className="size-full object-cover" />
                    {photo.area && (
                      <span className="absolute bottom-0.5 left-0.5 max-w-[calc(100%-0.25rem)] truncate rounded bg-black/65 px-1 py-px text-[9px] font-semibold text-white">
                        {CONDITION_AREA_LABELS[photo.area] ?? photo.area}
                      </span>
                    )}
                  </a>
                ) : (
                  <div key={photo.id} className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No photos.</p>
          )}

          {report.damageAreas.length || report.damageTypes.length || report.note ? (
            <div className="space-y-1.5">
              {report.damageAreas.length > 0 && <VehicleDamageOutline selected={report.damageAreas} className="[&_svg]:h-36" />}
              {report.damageTypes.length > 0 && (
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  {report.damageTypes.map((type) => CONDITION_DAMAGE_LABELS[type] ?? type).join(" · ")}
                </p>
              )}
              {report.note && <p className="whitespace-pre-wrap break-words text-xs text-foreground/90">{report.note}</p>}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">No damage noted.</p>
          )}
        </div>
      ))}
    </div>
  )
}
