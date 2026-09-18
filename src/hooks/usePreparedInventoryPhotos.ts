"use client";

import * as React from "react";
import type { Vehicle } from "@/types/inventory";
import { preloadInventoryVehicleImages } from "@/components/car-inventory-card";

// Keep the current cards for at most a short photo preparation window. This
// never delays filter controls and never waits for the entire image collection.
export function usePreparedInventoryPhotos(vehicles: Vehicle[], scope: string) {
  const key = JSON.stringify([scope, vehicles.map(v => [v.id, v.image, v.images])]);
  const [prepared, setPrepared] = React.useState({ key, scope, vehicles });
  const pending = prepared.key !== key && prepared.scope === scope &&
    prepared.vehicles.length > 0 && vehicles.length > 0;

  React.useLayoutEffect(() => {
    let cancelled = false;
    if (!pending) {
      setPrepared({ key, scope, vehicles });
      return;
    }
    // The preloader has a bounded deadline even if load/decode never settles.
    void preloadInventoryVehicleImages(vehicles.slice(0, 4), 220).then(() => {
      if (!cancelled) setPrepared({ key, scope, vehicles });
    });
    return () => { cancelled = true; };
  }, [key, scope, vehicles, pending]);

  return { vehicles: pending ? prepared.vehicles : vehicles, pending };
}