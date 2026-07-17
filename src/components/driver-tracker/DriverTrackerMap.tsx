"use client";

import * as React from "react";
import {
  Plus,
  Minus,
  LocateFixed,
  Satellite,
  Filter,
  ChevronDown,
  MapPinned,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MapFilter = "all" | "sharing" | "on-route" | "with-loads";

const MAP_FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sharing", label: "Sharing" },
  { key: "on-route", label: "On Route" },
  { key: "with-loads", label: "With Loads" },
];

interface DriverTrackerMapProps {
  mapboxToken?: string;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  mapNotice?: string | null;
  activeCount?: number;
  mapFilter?: MapFilter;
  onMapFilterChange?: (filter: MapFilter) => void;
}

export function DriverTrackerMap({
  mapboxToken,
  mapRef,
  onZoomIn,
  onZoomOut,
  onCenter,
  mapNotice,
  activeCount = 0,
  mapFilter = "all",
  onMapFilterChange,
}: DriverTrackerMapProps) {
  const isMapLoading =
    Boolean(mapboxToken) &&
    Boolean(mapNotice?.toLowerCase().includes("loading"));

  const informationalNotice =
    mapNotice && !isMapLoading ? mapNotice : null;

  return (
    <Card
      className="
        overflow-hidden
        border-border/50
        bg-card
        text-card-foreground
        p-0
        gap-0
        shadow-sm
        transition-colors
        duration-300
      "
    >
      <CardContent className="p-0">
        <div
          className="
            relative
            h-[60vh]
            min-h-80
            max-h-105
            sm:h-120
            lg:h-150
            lg:max-h-none
            overflow-hidden
            touch-none
            bg-background
            text-foreground
            transition-colors
            duration-300
          "
        >
          {/* Map container */}
          {mapboxToken ? (
            <div
              ref={mapRef}
              className="
                h-full
                w-full
                bg-background
                transition-colors
                duration-300
              "
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <div
              className="
                absolute
                inset-0
                flex
                flex-col
                items-center
                justify-center
                gap-3
                px-4
                text-center
                bg-background
                text-foreground
                transition-colors
                duration-300
              "
            >
              <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Satellite className="size-8 text-muted-foreground/40" />
              </div>

              <p className="text-sm text-muted-foreground font-medium">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the live map
              </p>
            </div>
          )}

          {/* Theme-aware loading overlay */}
          {isMapLoading && (
            <div
              className="
                absolute
                inset-0
                z-20
                flex
                items-center
                justify-center
                bg-background
                text-foreground
                transition-colors
                duration-300
              "
              role="status"
              aria-live="polite"
              aria-label="Loading map"
            >
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <div className="relative flex size-16 items-center justify-center">
                  <div
                    className="
                      absolute
                      inset-0
                      rounded-2xl
                      bg-primary/10
                      animate-pulse
                    "
                  />

                  <MapPinned className="relative size-7 text-primary" />

                  <div
                    className="
                      absolute
                      -inset-2
                      rounded-full
                      border-2
                      border-primary/20
                      border-t-primary
                      animate-spin
                    "
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    Loading map data
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Preparing live driver locations...
                  </p>
                </div>

                <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className="
                      h-full
                      w-1/2
                      rounded-full
                      bg-primary
                      animate-map-loading-bar
                    "
                  />
                </div>
              </div>
            </div>
          )}

          {/* Non-loading map notice */}
          {informationalNotice && mapboxToken && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pointer-events-none">
              <div
                className="
                  max-w-full
                  rounded-xl
                  border
                  border-border/50
                  bg-background/90
                  px-4
                  py-3
                  shadow-lg
                  backdrop-blur-sm
                  transition-colors
                  duration-300
                  sm:px-6
                "
              >
                <p className="text-xs font-medium text-center text-muted-foreground">
                  {informationalNotice}
                </p>
              </div>
            </div>
          )}

          {/* Map filters */}
          {onMapFilterChange && !isMapLoading && (
            <div
              className="
                absolute
                z-10
                top-2.5
                left-2.5
                right-2.5
                flex
                items-center
                gap-1
                overflow-x-auto
                rounded-xl
                border
                border-border/50
                bg-background/90
                p-1.5
                shadow-lg
                backdrop-blur-sm
                transition-colors
                duration-300
                no-scrollbar
                sm:right-auto
                sm:top-4
                sm:left-4
              "
            >
              <Filter className="size-3.5 text-muted-foreground ml-1 mr-0.5 shrink-0" />

              {MAP_FILTERS.map((filter) => (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={mapFilter === filter.key ? "default" : "ghost"}
                  className={`
                    h-8
                    sm:h-7
                    px-2
                    sm:px-2.5
                    text-[10px]
                    font-bold
                    rounded-lg
                    shrink-0
                    transition-colors
                    duration-200
                    ${
                      mapFilter === filter.key
                        ? "shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                  onClick={() => onMapFilterChange(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          )}

          {/* Map controls */}
          {!isMapLoading && (
            <TooltipProvider>
              <div className="absolute z-10 top-14 sm:top-4 right-2.5 sm:right-4 flex flex-col gap-1.5">
                {[
                  {
                    action: onZoomIn,
                    icon: <Plus className="size-4" />,
                    label: "Zoom in",
                  },
                  {
                    action: onZoomOut,
                    icon: <Minus className="size-4" />,
                    label: "Zoom out",
                  },
                  {
                    action: onCenter,
                    icon: <LocateFixed className="size-4" />,
                    label: "Center on me",
                  },
                ].map((button) => (
                  <Tooltip key={button.label}>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="
                          size-10
                          sm:size-9
                          border
                          border-border/50
                          bg-background/90
                          text-foreground
                          shadow-md
                          backdrop-blur-sm
                          transition-all
                          duration-200
                          hover:bg-background
                          hover:shadow-lg
                        "
                        onClick={button.action}
                        aria-label={button.label}
                      >
                        {button.icon}
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent side="left" className="text-xs">
                      {button.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}

          {/* Status legend */}
          {!isMapLoading && (
            <details
              className="
                absolute
                z-10
                bottom-2.5
                left-2.5
                w-40
                rounded-xl
                border
                border-border/50
                bg-background/90
                text-foreground
                shadow-lg
                backdrop-blur-sm
                transition-colors
                duration-300
                group
                sm:bottom-4
                sm:left-4
                sm:w-44
              "
              open
            >
              <summary
                className="
                  flex
                  items-center
                  justify-between
                  p-3
                  cursor-pointer
                  list-none
                  select-none
                  sm:p-4
                  sm:pb-0
                  [&::-webkit-details-marker]:hidden
                "
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </span>

                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>

              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3 space-y-2 text-xs">
                {[
                  {
                    color: "bg-emerald-500",
                    pulse: true,
                    label: "On Route",
                  },
                  {
                    color: "bg-amber-500",
                    pulse: false,
                    label: "Idle",
                  },
                  {
                    color: "bg-blue-500",
                    pulse: false,
                    label: "Waiting",
                  },
                  {
                    color: "bg-slate-500",
                    pulse: false,
                    label: "On Break",
                  },
                  {
                    color: "bg-slate-400",
                    pulse: false,
                    label: "Offline",
                  },
                  {
                    color: "bg-orange-500",
                    pulse: false,
                    label: "Load Location",
                    shape: "square",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="relative flex size-2.5 shrink-0">
                      {item.pulse && (
                        <span
                          className={`
                            absolute
                            inline-flex
                            h-full
                            w-full
                            rounded-full
                            ${item.color}
                            opacity-40
                            animate-ping
                          `}
                        />
                      )}

                      <span
                        className={`
                          relative
                          inline-flex
                          size-2.5
                          ${
                            "shape" in item
                              ? "rounded-sm"
                              : "rounded-full"
                          }
                          ${item.color}
                        `}
                      />
                    </span>

                    <span className="text-foreground/80 font-medium truncate">
                      {item.label}
                    </span>
                  </div>
                ))}

                {activeCount > 0 && (
                  <div className="mt-1 pt-2 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {activeCount}
                      </span>{" "}
                      active now
                    </p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}