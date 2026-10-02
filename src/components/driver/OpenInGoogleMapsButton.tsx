"use client";

import * as React from "react";
import { ExternalLink, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GOOGLE_MAPS_TRUCK_NOTE, loadNavigationTarget } from "@/lib/load-navigation";

type NavigableLoad = Parameters<typeof loadNavigationTarget>[0];

/**
 * "Open in Google Maps" for the driver's next stop: the pickup once Accepted,
 * the delivery while Picked Up or In-Transit. Renders nothing otherwise.
 * Navigation is separate from location sharing: Google Maps doesn't send the
 * driver's location to Suprah.
 */
export function OpenInGoogleMapsButton({
  load,
  className,
  withNote = false,
}: {
  load: NavigableLoad;
  className?: string;
  /** Show the truck-restrictions note under the button. */
  withNote?: boolean;
}) {
  const target = loadNavigationTarget(load);
  if (!target) return null;

  const button = (
    <Button asChild variant="outline" className={cn("h-11 gap-2 rounded-xl font-semibold", className)}>
      <a href={target.url} target="_blank" rel="noopener noreferrer" title={GOOGLE_MAPS_TRUCK_NOTE}>
        <Navigation className="size-4" />
        {target.label}
        <ExternalLink className="size-3.5" />
      </a>
    </Button>
  );
  if (!withNote) return button;
  return (
    <div className="space-y-1">
      {button}
      <p className="text-[11px] leading-relaxed text-muted-foreground">{GOOGLE_MAPS_TRUCK_NOTE}</p>
    </div>
  );
}
