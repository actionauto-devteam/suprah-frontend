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
  /*
   * The existing parent component already sends messages such as
   * "Loading map data..." through mapNotice.
   *
   * We use that message to determine whether the dark loading overlay
   * should be displayed.
   */
  const isMapLoading =
    Boolean(mapboxToken) &&
    Boolean(mapNotice?.toLowerCase().includes("loading"));

  /*
   * Non-loading notices are displayed as normal informational notices.
   * This prevents the loading message from appearing twice.
   */
  const informationalNotice =
    mapNotice && !isMapLoading ? mapNotice : null;

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden bg-card p-0 gap-0">
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
            bg-[#050505]
            dark:bg-[#050505]
          "
        >
          {/* Map container */}
          {mapboxToken ? (
            <div
              ref={mapRef}
              className="h-full w-full bg-[#050505]"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#050505",
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-background">
              <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Satellite className="size-8 text-muted-foreground/40" />
              </div>

              <p className="text-sm text-muted-foreground font-medium">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the live map
              </p>
            </div>
          )}

          {/* Dark loading overlay */}
          {isMapLoading && (
            <div
              className="
                absolute
                inset-0
                z-20
                flex
                items-center
                justify-center
                bg-[#050505]
                dark:bg-[#050505]
              "
              role="status"
              aria-live="polite"
              aria-label="Loading map"
            >
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <div className="relative flex size-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 animate-pulse" />

                  <MapPinned className="relative size-7 text-emerald-500" />

                  <div
                    className="
                      absolute
                      -inset-2
                      rounded-full
                      border-2
                      border-emerald-500/20
                      border-t-emerald-500
                      animate-spin
                    "
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-white">
                    Loading map data
                  </p>

                  <p className="text-xs text-zinc-500">
                    Preparing live driver locations...
                  </p>
                </div>

                <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-1/2 rounded-full bg-emerald-500 animate-map-loading-bar" />
                </div>
              </div>
            </div>
          )}

          {/* Non-loading map notice */}
          {informationalNotice && mapboxToken && (
            <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pointer-events-none">
              <div
                className="
                  rounded-xl
                  bg-background/90
                  backdrop-blur-sm
                  border
                  border-border/50
                  px-4
                  sm:px-6
                  py-3
                  shadow-lg
                  max-w-full
                "
              >
                <p className="text-xs text-muted-foreground font-medium text-center">
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
                sm:right-auto
                sm:top-4
                sm:left-4
                rounded-xl
                bg-background/90
                backdrop-blur-sm
                border
                border-border/50
                shadow-lg
                p-1.5
                flex
                items-center
                gap-1
                overflow-x-auto
                no-scrollbar
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
                          shadow-md
                          bg-background/90
                          backdrop-blur-sm
                          border
                          border-border/50
                          hover:bg-background
                          hover:shadow-lg
                          transition-all
                          duration-200
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
                sm:bottom-4
                sm:left-4
                rounded-xl
                bg-background/90
                backdrop-blur-sm
                border
                border-border/50
                shadow-lg
                w-40
                sm:w-44
                group
              "
              open
            >
              <summary
                className="
                  flex
                  items-center
                  justify-between
                  p-3
                  sm:p-4
                  sm:pb-0
                  cursor-pointer
                  list-none
                  select-none
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
                            animate-ping
                            absolute
                            inline-flex
                            h-full
                            w-full
                            rounded-full
                            ${item.color}
                            opacity-40
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