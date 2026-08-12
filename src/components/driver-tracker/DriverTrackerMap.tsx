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

type MapStatusItem = {
  color: string;
  pulse: boolean;
  label: string;
  shape: "circle" | "square";
};

const MAP_STATUS_ITEMS: MapStatusItem[] = [
  { color: "bg-emerald-500", pulse: true, label: "On Route", shape: "circle" },
  { color: "bg-amber-500", pulse: false, label: "Idle", shape: "circle" },
  { color: "bg-blue-500", pulse: false, label: "Waiting", shape: "circle" },
  { color: "bg-slate-500", pulse: false, label: "On Break", shape: "circle" },
  { color: "bg-slate-400", pulse: false, label: "Offline", shape: "circle" },
  {
    color: "bg-orange-500",
    pulse: false,
    label: "Load Location",
    shape: "square",
  },
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

  /**
   * Set this to true from the parent component after Mapbox fires its
   * "load" event. This enables the polished loader-to-map transition.
   */
  isMapReady?: boolean;

  /**
   * True only while an already-visible map is changing between light and dark
   * Mapbox styles. The previous map remains visible underneath a subtle tint.
   */
  isMapTransitioning?: boolean;
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
  isMapTransitioning = false,
}: DriverTrackerMapProps) {
  const isInitialLoading = Boolean(mapboxToken) && !isMapReady;
  const showThemeTransition = Boolean(mapboxToken) && isMapTransitioning;
  const informationalNotice =
    mapNotice && !isInitialLoading && !showThemeTransition ? mapNotice : null;

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
        <div
          className={`
            relative h-[60vh] min-h-80 max-h-105 touch-none overflow-hidden
            bg-background text-foreground transition-colors duration-300
            sm:h-120 lg:h-150 lg:max-h-none
            ${showThemeTransition ? "[&_.map-ui-control]:opacity-75" : ""}
          `}
        >
          {/* Map container */}
          {mapboxToken ? (
            <div
              ref={mapRef}
              className={`
                h-full
                w-full
                bg-background
                transition-[opacity,transform,filter]
                duration-500
                ease-out
                ${isMapReady
                  ? "scale-100 opacity-100"
                  : "scale-[0.992] opacity-0"
                }
                ${showThemeTransition
                  ? "scale-[1.004] blur-[1.5px] brightness-[0.82] saturate-[0.82]"
                  : "blur-0 brightness-100 saturate-100"
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

          {/* Initial map skeleton: only shown before the first map render */}
          {mapboxToken && (
            <div
              className={`
                absolute inset-0 z-20 overflow-hidden bg-background
                transition-all duration-500 ease-out
                ${isInitialLoading
                  ? "visible opacity-100"
                  : "invisible pointer-events-none opacity-0"
                }
              `}
              role="status"
              aria-live="polite"
              aria-hidden={!isInitialLoading}
            >
              <div className="absolute inset-0 map-skeleton-grid opacity-70" />
              <div className="absolute -left-16 top-[18%] h-28 w-[65%] rotate-[-8deg] rounded-[50%] border-18 border-muted/45" />
              <div className="absolute -right-16 bottom-[20%] h-32 w-[70%] rotate-11 rounded-[50%] border-20 border-muted/40" />
              <div className="absolute left-[28%] top-[34%] size-3 rounded-full bg-primary/35 ring-8 ring-primary/5" />
              <div className="absolute right-[22%] bottom-[31%] size-2.5 rounded-full bg-primary/25 ring-8 ring-primary/5" />

              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="map-loading-card flex w-full max-w-62.5 items-center gap-3 rounded-2xl border border-border/50 bg-background/82 px-4 py-3.5 shadow-xl backdrop-blur-md">
                  <div className="relative flex size-10 shrink-0 items-center justify-center">
                    <div className="absolute inset-0 animate-pulse rounded-xl bg-primary/10" />
                    <MapPinned className="relative size-5 text-primary" />
                    <div className="absolute -inset-1 animate-spin rounded-full border border-primary/20 border-t-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">
                      Preparing live map
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Loading driver locations…
                    </p>
                    <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-1/2 animate-map-loading-bar rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Theme transition: keep the previous map visible underneath */}
          {mapboxToken && (
            <div
              className={`
                pointer-events-none absolute inset-0 z-15
                transition-all duration-500 ease-out
                ${showThemeTransition
                  ? "visible opacity-100"
                  : "invisible opacity-0"
                }
              `}
              role="status"
              aria-live="polite"
              aria-hidden={!showThemeTransition}
            >
              <div className="absolute inset-0 bg-background/18 backdrop-blur-[0.5px]" />

              <div
                className={`
                  absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                  transition-all duration-300 ease-out
                  ${showThemeTransition
                    ? "scale-100 opacity-100"
                    : "scale-95 opacity-0"
                  }
                `}
              >
                <div className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background/82 px-3.5 py-2 shadow-lg backdrop-blur-md">
                  <div className="size-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                  <span className="whitespace-nowrap text-[11px] font-semibold text-foreground">
                    {mapNotice || "Updating map theme…"}
                  </span>
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
          {onMapFilterChange && isMapReady && (
            <div className="map-ui-control no-scrollbar absolute top-2.5 right-2.5 left-2.5 z-10 flex animate-map-controls-in items-center gap-1 overflow-x-auto rounded-xl border border-border/50 bg-background/90 p-1.5 shadow-lg backdrop-blur-sm transition-colors duration-300 sm:top-4 sm:right-auto sm:left-4">
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
                    ${mapFilter === filter.key
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
          {isMapReady && (
            <TooltipProvider>
              <div className="map-ui-control absolute top-14 right-2.5 z-10 flex animate-map-controls-in flex-col gap-1.5 sm:top-4 sm:right-4">
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
          {isMapReady && (
            <details
              className="map-ui-control group absolute bottom-2.5 left-2.5 z-10 w-40 animate-map-controls-in rounded-xl border border-border/50 bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-colors duration-300 sm:bottom-4 sm:left-4 sm:w-44"
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
                          ${item.shape === "square" ? "rounded-sm" : "rounded-full"}
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