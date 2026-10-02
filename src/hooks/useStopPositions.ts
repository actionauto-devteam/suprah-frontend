"use client";

import * as React from "react";
import { resolveStopPosition, type StopPosition } from "@/lib/driver-next-stop";
import type { LoadPlace } from "@/lib/load-navigation";

export type StopToPlace = { key: string; place: LoadPlace };

/**
 * Map positions for load stops, looked up once per stop key (the dispatcher's
 * pin, then Google through the backend, then Mapbox). A key is undefined while
 * it's being looked up and null when the stop can't be placed. Put the pin or
 * the address in the key, so an edited stop is looked up again.
 */
export function useStopPositions(
  stops: StopToPlace[],
  getToken: () => Promise<string | null | undefined>,
  mapboxToken?: string | null,
): Record<string, StopPosition | null> {
  const [positions, setPositions] = React.useState<Record<string, StopPosition | null>>({});
  const lookupsRef = React.useRef(new Map<string, Promise<StopPosition | null>>());

  React.useEffect(() => {
    let cancelled = false;
    for (const stop of stops) {
      let lookup = lookupsRef.current.get(stop.key);
      if (!lookup) {
        lookup = resolveStopPosition(stop.place, { getToken, mapboxToken }).catch(() => null);
        lookupsRef.current.set(stop.key, lookup);
      }
      void lookup.then((position) => {
        if (cancelled) return;
        setPositions((previous) => (stop.key in previous ? previous : { ...previous, [stop.key]: position }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [stops, getToken, mapboxToken]);

  return positions;
}
