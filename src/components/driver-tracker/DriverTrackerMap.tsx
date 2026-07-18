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

const MAP_STATUS_ITEMS = [
  { color: "bg-emerald-500", pulse: true, label: "On Route" },
  { color: "bg-amber-500", pulse: false, label: "Idle" },
  { color: "bg-blue-500", pulse: false, label: "Waiting" },
  { color: "bg-slate-500", pulse: false, label: "On Break" },
  { color: "bg-slate-400", pulse: false, label: "Offline" },
  {
    color: "bg-orange-500",
    pulse: false,
    label: "Load Location",
    shape: "square",
  },
] as const;

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

  /**
   * Set this to true from the parent component after Mapbox fires its
   * "load" event. This enables the polished loader-to-map transition.
   */
  isMapReady?: boolean;
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
  isMapReady = false,
}: DriverTrackerMapProps) {
  const isNoticeLoading =
    Boolean(mapNotice) &&
    Boolean(mapNotice?.toLowerCase().includes("loading"));

  const showLoadingOverlay =
    Boolean(mapboxToken) && (!isMapReady || isNoticeLoading);

  const informationalNotice =
    mapNotice && !isNoticeLoading ? mapNotice : null;

  const mapControls = [
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
  ];

  return (
    <Card className="gap-0 overflow-hidden border-border/50 bg-card p-0 text-card-foreground shadow-sm transition-colors duration-300">
      <CardContent className="p-0">
        <div className="relative h-[60vh] min-h-80 max-h-105 touch-none overflow-hidden bg-background text-foreground transition-colors duration-300 sm:h-120 lg:h-150 lg:max-h-none">
          {/* Map container */}
          {mapboxToken ? (
            <div
              ref={mapRef}
              className={`
                h-full
                w-full
                bg-background
                transition-all
                duration-500
                ease-out
                ${
                  isMapReady
                    ? "scale-100 opacity-100"
                    : "scale-[1.01] opacity-0"
                }
              `}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground transition-colors duration-300">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60">
                <Satellite className="size-8 text-muted-foreground/40" />
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the live map
              </p>
            </div>
          )}

          {/* Smooth theme-aware loading overlay */}
          {mapboxToken && (
            <div
              className={`
                absolute
                inset-0
                z-20
                flex
                items-center
                justify-center
                bg-background
                text-foreground
                transition-all
                duration-500
                ease-out
                ${
                  showLoadingOverlay
                    ? "visible opacity-100"
                    : "invisible pointer-events-none opacity-0"
                }
              `}
              role="status"
              aria-live="polite"
              aria-hidden={!showLoadingOverlay}
            >
              <div
                className={`
                  flex
                  flex-col
                  items-center
                  gap-4
                  px-6
                  text-center
                  transition-all
                  duration-500
                  ${
                    showLoadingOverlay
                      ? "translate-y-0 scale-100 opacity-100"
                      : "-translate-y-2 scale-95 opacity-0"
                  }
                `}
              >
                <div className="relative flex size-16 items-center justify-center">
                  <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/10" />

                  <MapPinned className="relative size-7 text-primary" />

                  <div className="absolute -inset-2 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
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
                  <div className="h-full w-1/2 animate-map-loading-bar rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Informational or error notice */}
          {informationalNotice && mapboxToken && (
            <div className="pointer-events-none absolute inset-0 z-10 flex animate-map-notice-in items-center justify-center px-4">
              <div className="max-w-full rounded-xl border border-border/50 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-sm transition-colors duration-300 sm:px-6">
                <p className="text-center text-xs font-medium text-muted-foreground">
                  {informationalNotice}
                </p>
              </div>
            </div>
          )}

          {/* Map filters */}
          {onMapFilterChange && isMapReady && !showLoadingOverlay && (
            <div className="no-scrollbar absolute top-2.5 right-2.5 left-2.5 z-10 flex animate-map-controls-in items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-background/90 p-1.5 shadow-lg backdrop-blur-sm transition-colors duration-300 sm:top-4 sm:right-auto sm:left-4">
              <Filter className="ml-1 mr-0.5 size-3.5 shrink-0 text-muted-foreground" />

              {MAP_FILTERS.map((filter) => (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={mapFilter === filter.key ? "default" : "ghost"}
                  className={`
                    h-8
                    shrink-0
                    rounded-lg
                    px-2
                    text-[10px]
                    font-bold
                    transition-all
                    duration-200
                    sm:h-7
                    sm:px-2.5
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

          {/* Zoom and center controls */}
          {isMapReady && !showLoadingOverlay && (
            <TooltipProvider>
              <div className="absolute top-14 right-2.5 z-10 flex animate-map-controls-in flex-col gap-1.5 sm:top-4 sm:right-4">
                {mapControls.map((button) => (
                  <Tooltip key={button.label}>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-10 border border-border/50 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-background hover:shadow-lg active:translate-y-0 sm:size-9"
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
          {isMapReady && !showLoadingOverlay && (
            <details
              className="group absolute bottom-2.5 left-2.5 z-10 w-40 animate-map-controls-in rounded-xl border border-border/50 bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-colors duration-300 sm:bottom-4 sm:left-4 sm:w-44"
              open
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between p-3 sm:p-4 sm:pb-0 [&::-webkit-details-marker]:hidden">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Status
                </span>

                <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>

              <div className="space-y-2 px-3 pt-2 pb-3 text-xs sm:px-4 sm:pt-3 sm:pb-4">
                {MAP_STATUS_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="relative flex size-2.5 shrink-0">
                      {item.pulse && (
                        <span
                          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${item.color} opacity-40`}
                        />
                      )}

                      <span
                        className={`
                          relative
                          inline-flex
                          size-2.5
                          ${
                            "shape" in item && item.shape === "square"
                              ? "rounded-sm"
                              : "rounded-full"
                          }
                          ${item.color}
                        `}
                      />
                    </span>

                    <span className="truncate font-medium text-foreground/80">
                      {item.label}
                    </span>
                  </div>
                ))}

                {activeCount > 0 && (
                  <div className="mt-1 border-t border-border/30 pt-2">
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