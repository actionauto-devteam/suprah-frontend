"use client";

import * as React from "react";
import { Loader2, MapPinOff } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useDrivingSessionDetail, type LocationHistoryPoint } from "@/hooks/useLocator";

const ROUTE_SOURCE_ID = "trip-route";

/**
 * Standalone replay map for an arbitrary breadcrumb route — draws it as a line with start
 * (green) / end (red) markers, Life360 "trip detail" style. Deliberately separate from
 * LocatorLiveMapSection (that one is wired to live org-wide state/selection); this is a
 * self-contained one-route view used inside a dialog.
 */
export function RouteReplayMap({ route }: { route: LocationHistoryPoint[] }) {
  const { theme } = useTheme();
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();

  React.useEffect(() => {
    if (!mapboxToken || !mapRef.current || mapInstanceRef.current || route.length === 0) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;
      if (!mapboxgl.supported()) return;

      mapboxgl.accessToken = mapboxToken;
      const coords = route.map((p) => [p.coords.lng, p.coords.lat] as [number, number]);
      const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        bounds,
        fitBoundsOptions: { padding: 40, maxZoom: 16 },
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      map.on("load", () => {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
        });
        map.addLayer({
          id: `${ROUTE_SOURCE_ID}-line`,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.9 },
        });

        const startEl = document.createElement("div");
        startEl.style.cssText = "width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)";
        const endEl = document.createElement("div");
        endEl.style.cssText = "width:14px;height:14px;border-radius:9999px;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)";

        const startMarker = new mapboxgl.Marker({ element: startEl }).setLngLat(coords[0]).addTo(map);
        const endMarker = new mapboxgl.Marker({ element: endEl }).setLngLat(coords[coords.length - 1]).addTo(map);
        markersRef.current = [startMarker, endMarker];
      });
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Route/theme changes just re-mount the map fresh — this is a short-lived dialog view, not
    // worth the complexity of in-place updates like the live map has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, route.length, theme]);

  if (!mapboxToken || route.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 text-muted-foreground/50">
        <MapPinOff className="size-6" />
        <p className="text-xs">No route points recorded for this range</p>
      </div>
    );
  }

  return <div ref={mapRef} className="h-72 w-full rounded-xl overflow-hidden" />;
}

/** Thin wrapper for a completed/active driving session — fetches its route then hands off to
 * the generic replay map. */
export function TripRouteMap({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useDrivingSessionDetail(sessionId);

  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center rounded-xl bg-muted/40">
        <Loader2 className="size-5 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return <RouteReplayMap route={data?.route ?? []} />;
}
