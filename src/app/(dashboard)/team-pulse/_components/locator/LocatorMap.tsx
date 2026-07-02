"use client";

import * as React from "react";
import { Plus, Minus, LocateFixed, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LocatorMapLegend } from "./LocatorMapLegend";

interface LocatorMapProps {
  mapboxToken?: string;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  mapNotice?: string | null;
  activeCount?: number;
}

export function LocatorMap({
  mapboxToken,
  mapRef,
  onZoomIn,
  onZoomOut,
  onCenter,
  mapNotice,
  activeCount = 0,
}: LocatorMapProps) {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden bg-card p-0 gap-0">
      <CardContent className="p-0">
        <div className="relative h-[65vh] min-h-90 max-h-120 sm:h-135 lg:h-175 lg:max-h-none overflow-hidden touch-none" style={{ background: "#e5e7eb" }}>
          {mapboxToken ? (
            <div ref={mapRef} className="h-full w-full" style={{ width: "100%", height: "100%" }} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <MapPinOff className="size-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the live map
              </p>
            </div>
          )}

          {mapNotice && mapboxToken && (
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 px-4 sm:px-6 py-3 shadow-lg max-w-full">
                <p className="text-xs text-muted-foreground font-medium text-center">{mapNotice}</p>
              </div>
            </div>
          )}

          <TooltipProvider>
            <div className="absolute top-2.5 sm:top-4 right-2.5 sm:right-4 flex flex-col gap-1.5">
              {[
                { action: onZoomIn, icon: <Plus className="size-4" />, label: "Zoom in" },
                { action: onZoomOut, icon: <Minus className="size-4" />, label: "Zoom out" },
                { action: onCenter, icon: <LocateFixed className="size-4" />, label: "Center on me" },
              ].map((btn) => (
                <Tooltip key={btn.label}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="size-10 sm:size-9 shadow-md bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-background hover:shadow-lg transition-all duration-200"
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

          <LocatorMapLegend activeCount={activeCount} />
        </div>
      </CardContent>
    </Card>
  );
}
