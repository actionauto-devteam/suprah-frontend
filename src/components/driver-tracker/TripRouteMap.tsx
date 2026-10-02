"use client";

import * as React from "react";
import { Loader2, MapPinned } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  createGoogleMap,
  GOOGLE_MAPS_KEY_REJECTED,
  googleMapsConfig,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  type MapCamera,
} from "@/lib/google-maps";

const GOOGLE_MAPS = googleMapsConfig();
// One color per driver when a load changed hands during the trip.
const ROUTE_COLORS = ["#2563eb", "#9333ea", "#0d9488", "#ea580c"];

export type TripRoutePoint = { driverId: string; lat: number; lng: number };

function pinElement(label: string, color: string) {
  const element = document.createElement("div");
  element.style.cssText = `padding:2px 8px;border-radius:999px;background:${color};border:2px solid #fff;color:#fff;font:700 11px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap`;
  element.textContent = label;
  return element;
}

/**
 * The recorded trip drawn on a Google map: the route line (one color per
 * driver), a Start pin and a Latest pin. Shown only once Google Maps is set
 * up; the position list next to it works either way.
 */
export function TripRouteMap({ points, driverNames }: { points: TripRoutePoint[]; driverNames: Map<string, string> }) {
  const { theme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = React.useState<{ kind: "loading" | "ready" | "error"; message?: string }>({ kind: "loading" });

  const driverOrder = React.useMemo(() => [...new Set(points.map((point) => point.driverId))], [points]);

  React.useEffect(() => {
    const config = GOOGLE_MAPS;
    if (!config || !containerRef.current || points.length === 0) return;
    let cancelled = false;
    let camera: MapCamera | null = null;
    const stopAuthWatch = onGoogleMapsAuthFailure(() => {
      if (!cancelled) setStatus({ kind: "error", message: GOOGLE_MAPS_KEY_REJECTED });
    });

    loadGoogleMaps(config)
      .then((libraries) => {
        if (cancelled || !containerRef.current) return;
        const first = points[0];
        const last = points[points.length - 1];
        const created = createGoogleMap(libraries, containerRef.current, {
          config,
          theme: theme === "dark" ? "dark" : "light",
          center: [first.lng, first.lat],
          zoom: 11,
          // Inside a scrolling dialog: one finger scrolls, two move the map.
          gestureHandling: "cooperative",
        });
        camera = created.camera;
        const map = created.map;

        const paths = new Map<string, google.maps.LatLngLiteral[]>();
        for (const point of points) {
          const path = paths.get(point.driverId) ?? [];
          path.push({ lat: point.lat, lng: point.lng });
          paths.set(point.driverId, path);
        }
        driverOrder.forEach((driverId, index) => {
          new libraries.maps.Polyline({
            map,
            path: paths.get(driverId) ?? [],
            strokeColor: ROUTE_COLORS[index % ROUTE_COLORS.length],
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
        });

        new libraries.marker.AdvancedMarkerElement({ map, position: { lat: first.lat, lng: first.lng }, content: pinElement("Start", "#059669"), title: "First recorded position" });
        if (points.length > 1) {
          new libraries.marker.AdvancedMarkerElement({ map, position: { lat: last.lat, lng: last.lng }, content: pinElement("Latest", "#dc2626"), title: "Latest recorded position", zIndex: 10 });
          map.fitBounds(
            {
              north: Math.max(...points.map((point) => point.lat)),
              south: Math.min(...points.map((point) => point.lat)),
              east: Math.max(...points.map((point) => point.lng)),
              west: Math.min(...points.map((point) => point.lng)),
            },
            40,
          );
        }
        map.addListener("tilesloaded", () => {
          if (!cancelled) setStatus({ kind: "ready" });
        });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: "error", message: "The map couldn't load. The list below still has every position." });
      });

    return () => {
      cancelled = true;
      stopAuthWatch();
      camera?.remove();
    };
  }, [points, driverOrder, theme]);

  if (!GOOGLE_MAPS || points.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:h-80">
        <div ref={containerRef} className="h-full w-full" />
        {status.kind !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 px-4 text-center" role="status">
            {status.kind === "loading" ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading the route map…
              </span>
            ) : (
              <span className="inline-flex max-w-sm flex-col items-center gap-2 text-xs text-muted-foreground">
                <MapPinned className="size-5 opacity-50" /> {status.message}
              </span>
            )}
          </div>
        )}
      </div>
      {driverOrder.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Route colors">
          {driverOrder.map((driverId, index) => (
            <li key={driverId} className="inline-flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-full" style={{ background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
              {driverNames.get(driverId) ?? "Driver"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
