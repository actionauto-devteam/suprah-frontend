"use client";

import * as React from "react";
import { Loader2, MapPinned } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { BASE_MAP_PROVIDER, createBaseMap, type BaseMap, type BaseMapTheme, type LngLat } from "@/lib/base-map";

// One color per driver when a load changed hands during the trip.
const ROUTE_COLORS = ["#2563eb", "#9333ea", "#0d9488", "#ea580c"];

export type TripRoutePoint = { driverId: string; lat: number; lng: number };

function pinElement(label: string, color: string, title: string) {
  const element = document.createElement("div");
  element.style.cssText = `padding:2px 8px;border-radius:999px;background:${color};border:2px solid #fff;color:#fff;font:700 11px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap`;
  element.textContent = label;
  element.title = title;
  return element;
}

/** Each driver's part of the trip, in the order they drove it. */
export function tripPaths(points: TripRoutePoint[]): Array<{ driverId: string; path: LngLat[] }> {
  const paths = new Map<string, LngLat[]>();
  for (const point of points) {
    const path = paths.get(point.driverId) ?? [];
    path.push({ lat: point.lat, lng: point.lng });
    paths.set(point.driverId, path);
  }
  return [...paths.entries()].map(([driverId, path]) => ({ driverId, path }));
}

/**
 * The recorded trip on a map: the route line (one color per driver), a Start
 * pin and a Latest pin. Amazon Location's map, or Mapbox until the Amazon
 * browser key is set up (lib/base-map, 2026-11-11); before, it needed Google
 * and was hidden without it. The position list next to it works either way.
 */
export function TripRouteMap({ points, driverNames }: { points: TripRoutePoint[]; driverNames: Map<string, string> }) {
  const { theme } = useTheme();
  const mapTheme: BaseMapTheme = theme === "dark" ? "dark" : "light";
  // The map's box. Trip history is a pop-up window that adds its content a
  // moment after it opens, so the map is made once the box is on the page (2026-11-12).
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const mapRef = React.useRef<BaseMap | null>(null);
  const [status, setStatus] = React.useState<{ kind: "loading" | "ready" | "error"; message?: string }>({ kind: "loading" });

  const paths = React.useMemo(() => tripPaths(points), [points]);
  // The map is made with the theme at that moment; later changes go through setLook below.
  const themeRef = React.useRef(mapTheme);
  React.useEffect(() => {
    themeRef.current = mapTheme;
  }, [mapTheme]);

  React.useEffect(() => {
    if (!BASE_MAP_PROVIDER || !container || points.length === 0) return;
    let cancelled = false;
    const failed = () => {
      if (!cancelled) setStatus({ kind: "error", message: "The map couldn't load. The list below still has every position." });
    };
    setStatus({ kind: "loading" });

    void (async () => {
      const first = points[0];
      const last = points[points.length - 1];
      let map: BaseMap | null = null;
      try {
        map = await createBaseMap(container, { center: first, zoom: 11, theme: themeRef.current });
      } catch {
        map = null;
      }
      if (cancelled) {
        map?.remove();
        return;
      }
      if (!map) return failed();
      mapRef.current = map;
      map.onLoadError(failed);
      // Lines are part of the map style, so they're drawn again after a theme change.
      map.onStyleReady(() => {
        paths.forEach(({ path }, index) => {
          map?.setLine(`trip-route-${index}`, path, { color: ROUTE_COLORS[index % ROUTE_COLORS.length] });
        });
        if (!cancelled) setStatus({ kind: "ready" });
      });
      map.addMarker(first, { element: pinElement("Start", "#059669", "First recorded position") });
      if (points.length > 1) {
        map.addMarker(last, { element: pinElement("Latest", "#dc2626", "Latest recorded position") });
        map.fitTo(points, { padding: 40 });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [container, points, paths]);

  React.useEffect(() => {
    mapRef.current?.setLook(mapTheme, "map");
  }, [mapTheme]);

  if (!BASE_MAP_PROVIDER || points.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:h-80">
        <div ref={setContainer} className="h-full w-full" />
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
      {paths.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Route colors">
          {paths.map(({ driverId }, index) => (
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
