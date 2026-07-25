"use client";

import * as React from "react";
import { Plus, Minus, LocateFixed, Crosshair, Navigation, ArrowRight, Maximize2, Minimize2, Globe2, Home, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LocatorMapLegend } from "./LocatorMapLegend";
import type { SharingState, Place } from "@/hooks/useLocator";
import { cn } from "@/lib/utils";

interface LocatorMapProps {
  mapRef: React.RefObject<HTMLDivElement | null>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  mapNotice?: string | null;
  mapNoticeLoading?: boolean;
  onRetryMap?: () => void;
  activeCount?: number;
  stateCounts?: Partial<Record<SharingState, number>>;
  zoomInDisabled?: boolean;
  zoomOutDisabled?: boolean;
  pickModeActive?: boolean;
  places?: Place[];
  jumpTarget?: string;
  onJumpTargetChange?: (id: string) => void;
  onJump?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  elsewhereCount?: number;
  onViewElsewhere?: () => void;
  onGoHome?: () => void;
}

export function LocatorMap({
  mapRef,
  onZoomIn,
  onZoomOut,
  onCenter,
  mapNotice,
  mapNoticeLoading,
  onRetryMap,
  activeCount = 0,
  stateCounts,
  zoomInDisabled,
  zoomOutDisabled,
  pickModeActive,
  places = [],
  jumpTarget = "",
  onJumpTargetChange,
  onJump,
  isMaximized,
  onToggleMaximize,
  elsewhereCount = 0,
  onViewElsewhere,
  onGoHome,
}: LocatorMapProps) {
  return (
    <Card className={cn("border-border/50 shadow-sm overflow-hidden bg-card p-0 gap-0", isMaximized && "fixed inset-0 z-100 rounded-none border-0")}>
      <CardContent className="p-0">
        <div
          className={cn(
            // `isolate` is load-bearing: Leaflet's own internal panes/controls use z-index up
            // to ~1000, and Leaflet's container doesn't create its own CSS stacking context, so
            // without this those values leak out and compete directly against sibling elements
            // OUTSIDE this card (like this app's Select/Popover components, which portal their
            // open content straight to <body>). Isolating here contains all of Leaflet's z-index
            // usage — and our own control overlays below — inside this box, so nothing in here
            // can ever visually fight a portaled dropdown/tooltip/popover rendered elsewhere on
            // the page, in either direction.
            "relative isolate overflow-hidden touch-none",
            isMaximized ? "h-dvh" : "h-[65vh] min-h-90 max-h-120 sm:h-135 lg:h-175 lg:max-h-none",
          )}
          style={{ background: "#e5e7eb" }}
        >
          <div
            ref={mapRef}
            className={cn("h-full w-full", pickModeActive && "cursor-crosshair")}
            style={{ width: "100%", height: "100%" }}
          />

          {mapNotice && (
            <div className="absolute inset-0 z-1000 flex items-center justify-center px-4">
              <div className="flex flex-col items-center gap-2.5 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 px-4 sm:px-6 py-4 shadow-lg max-w-full">
                {mapNoticeLoading && <Loader2 className="size-4 animate-spin text-muted-foreground/70" />}
                <p className="text-xs text-muted-foreground font-medium text-center">{mapNotice}</p>
                {onRetryMap && !mapNoticeLoading && (
                  <Button size="sm" variant="outline" onClick={onRetryMap} className="h-7 gap-1.5 text-xs">
                    <RefreshCw className="size-3" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {pickModeActive ? (
            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-14 sm:right-16 z-1000">
              <div className="rounded-xl bg-primary text-primary-foreground px-3 py-2 shadow-lg flex items-center gap-2">
                <Crosshair className="size-3.5 shrink-0" />
                <p className="text-[11px] font-bold">Click the map to place your geofence</p>
              </div>
            </div>
          ) : places.length > 0 ? (
            <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-14 sm:right-16 z-1000 flex">
              <div className="flex items-center gap-0.5 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-md pl-2.5 pr-1 py-1 max-w-full">
                <Navigation className="size-3.5 text-muted-foreground/60 shrink-0" />
                <Select value={jumpTarget} onValueChange={onJumpTargetChange}>
                  <SelectTrigger
                    size="sm"
                    className="h-7 border-0 bg-transparent shadow-none px-1.5 gap-1 text-xs font-semibold focus-visible:ring-0 w-auto max-w-40 sm:max-w-56"
                  >
                    <SelectValue placeholder="Jump to place…" />
                  </SelectTrigger>
                  <SelectContent>
                    {places.map((p) => (
                      <SelectItem key={p._id} value={p._id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={!jumpTarget}
                  onClick={onJump}
                  className="size-7 shrink-0 text-primary hover:text-primary disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}

          <TooltipProvider>
            <div className="absolute top-2.5 sm:top-4 right-2.5 sm:right-4 z-1000 flex flex-col gap-1.5">
              {[
                ...(onToggleMaximize ? [{
                  action: onToggleMaximize,
                  icon: isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />,
                  label: isMaximized ? "Exit fullscreen" : "Maximize map",
                  disabled: false,
                }] : []),
                ...(onGoHome ? [{
                  action: onGoHome,
                  icon: <Home className="size-4" />,
                  label: "Back to home region",
                  disabled: false,
                }] : []),
                { action: onZoomIn, icon: <Plus className="size-4" />, label: "Zoom in", disabled: zoomInDisabled },
                { action: onZoomOut, icon: <Minus className="size-4" />, label: "Zoom out", disabled: zoomOutDisabled },
                { action: onCenter, icon: <LocateFixed className="size-4" />, label: "Center on me", disabled: false },
              ].map((btn) => (
                <Tooltip key={btn.label}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      disabled={btn.disabled}
                      className="size-10 sm:size-9 shadow-md bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background hover:shadow-lg transition-all duration-200 disabled:opacity-40"
                      onClick={btn.action}
                    >
                      {btn.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">{btn.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          <LocatorMapLegend activeCount={activeCount} stateCounts={stateCounts} />

          {elsewhereCount > 0 && onViewElsewhere && (
            <button
              type="button"
              onClick={onViewElsewhere}
              className="absolute bottom-2.5 sm:bottom-4 right-2.5 sm:right-4 z-1000 flex items-center gap-1.5 rounded-xl bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg px-3 py-2 text-xs font-bold hover:bg-background transition-colors"
            >
              <Globe2 className="size-3.5 text-primary shrink-0" />
              {elsewhereCount} elsewhere
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
