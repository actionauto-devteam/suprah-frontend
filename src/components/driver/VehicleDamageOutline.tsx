"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CONDITION_AREA_LABELS } from "@/lib/condition-report"

// A top-down car outline (front at the top). The driver taps the areas that
// are damaged; Dispatch sees the same outline with those areas highlighted.

type Zone = { area: string; shapes: Array<{ x: number; y: number; width: number; height: number; rx?: number }> }

const ZONES: Zone[] = [
  { area: "front", shapes: [{ x: 46, y: 6, width: 108, height: 26, rx: 12 }] },
  { area: "hood", shapes: [{ x: 46, y: 34, width: 108, height: 78, rx: 6 }] },
  { area: "glass", shapes: [{ x: 52, y: 114, width: 96, height: 34, rx: 8 }, { x: 52, y: 262, width: 96, height: 30, rx: 8 }] },
  { area: "roof", shapes: [{ x: 52, y: 150, width: 96, height: 110, rx: 6 }] },
  { area: "trunk", shapes: [{ x: 46, y: 294, width: 108, height: 62, rx: 6 }] },
  { area: "rear", shapes: [{ x: 46, y: 358, width: 108, height: 26, rx: 12 }] },
  { area: "left_front", shapes: [{ x: 16, y: 40, width: 28, height: 150, rx: 8 }] },
  { area: "left_rear", shapes: [{ x: 16, y: 196, width: 28, height: 150, rx: 8 }] },
  { area: "right_front", shapes: [{ x: 156, y: 40, width: 28, height: 150, rx: 8 }] },
  { area: "right_rear", shapes: [{ x: 156, y: 196, width: 28, height: 150, rx: 8 }] },
]

/** Areas that aren't a place on the outline, offered as buttons only. */
const EXTRA_AREAS = ["wheels", "interior"]

export function VehicleDamageOutline({
  selected,
  onToggle,
  className,
}: {
  selected: string[]
  /** Omit for a read-only outline. */
  onToggle?: (area: string) => void
  className?: string
}) {
  const isSelected = (area: string) => selected.includes(area)
  const interactive = Boolean(onToggle)

  return (
    <div className={cn("space-y-3", className)}>
      <svg
        viewBox="0 0 200 390"
        className="mx-auto h-56 w-auto"
        role="img"
        aria-label={
          selected.length
            ? `Damage marked on: ${selected.map((area) => CONDITION_AREA_LABELS[area] ?? area).join(", ")}`
            : "No damage marked"
        }
      >
        {/* Wheels */}
        {[
          [8, 70],
          [8, 270],
          [180, 70],
          [180, 270],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={12}
            height={44}
            rx={4}
            className={cn(isSelected("wheels") ? "fill-red-500/70" : "fill-muted-foreground/40")}
          />
        ))}
        {ZONES.map((zone) =>
          zone.shapes.map((shape, index) => (
            <rect
              key={`${zone.area}-${index}`}
              {...shape}
              onClick={interactive ? () => onToggle?.(zone.area) : undefined}
              className={cn(
                "stroke-border transition-colors",
                isSelected(zone.area) ? "fill-red-500/60 stroke-red-600" : "fill-muted",
                interactive && "cursor-pointer hover:fill-red-500/25",
              )}
              strokeWidth={1.5}
            >
              <title>{CONDITION_AREA_LABELS[zone.area]}</title>
            </rect>
          )),
        )}
        <text x="100" y="24" textAnchor="middle" className="pointer-events-none fill-muted-foreground text-[10px]">
          FRONT
        </text>
      </svg>

      {interactive ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Damaged areas">
          {[...ZONES.map((zone) => zone.area), ...EXTRA_AREAS].map((area) => (
            <button
              key={area}
              type="button"
              aria-pressed={isSelected(area)}
              onClick={() => onToggle?.(area)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors",
                isSelected(area)
                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {CONDITION_AREA_LABELS[area] ?? area}
            </button>
          ))}
        </div>
      ) : selected.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {selected.map((area) => CONDITION_AREA_LABELS[area] ?? area).join(" · ")}
        </p>
      ) : null}
    </div>
  )
}
