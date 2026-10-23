"use client";

import * as React from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { useTheme } from "@/context/ThemeContext";
import type { LoadRouteLines } from "@/lib/api/load-route";
import { useLoadRoute } from "@/hooks/useLoadRoute";
import {
  addMapboxRouteLayers,
  mapRouteOf,
  routeBounds,
  routeLineFeatures,
  shownRoute,
  type MapRoute,
} from "@/lib/load-route-lines";
import { LoadRouteSummary } from "./LoadRoutePanel";

/*
 * The live route on the Transportation load page: the arrival time at the
 * next stop and a small map with the best truck route (Amazon Location).
 * Only for the people who can see the driver's location, and only while the
 * load is on the road. Nothing shows while routes are switched off.
 */

const MAP_STYLE_BY_THEME = {
  dark: "mapbox://styles/mapbox/navigation-night-v1",
  light: "mapbox://styles/mapbox/streets-v12",
} as const;
const SOURCE = "suprah-load-route";
const STOP_COLORS = { pickup: "#f59e0b", delivery: "#e11d48", driver: "#10b981" } as const;

function markerElement(kind: keyof typeof STOP_COLORS, title: string) {
  const element = document.createElement("div");
  const round = kind === "driver";
  element.style.cssText = `width:${round ? 20 : 26}px;height:${round ? 20 : 26}px;border-radius:${round ? "50%" : "7px"};background:${STOP_COLORS[kind]};border:${round ? 3 : 2}px solid #fff;color:#fff;font:800 12px/1 system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)`;
  element.textContent = kind === "pickup" ? "P" : kind === "delivery" ? "D" : "";
  element.title = title;
  return element;
}

function LoadRouteMap({ route, lines }: { route: MapRoute; lines: LoadRouteLines }) {
  const { theme } = useTheme();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapboxMap | null>(null);
  const markersRef = React.useRef<MapboxMarker[]>([]);
  const latestRef = React.useRef({ route, lines });
  const framedRef = React.useRef(false);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  latestRef.current = { route, lines };

  const draw = React.useCallback(async () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const { route: current, lines: currentLines } = latestRef.current;
    const data = { type: "FeatureCollection", features: routeLineFeatures(current, null) } as never;
    const source = map.getSource(SOURCE) as { setData: (value: never) => void } | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(SOURCE, { type: "geojson", data });
      addMapboxRouteLayers(map, SOURCE, SOURCE);
    }

    const mapboxgl = (await import("mapbox-gl")).default;
    if (mapRef.current !== map) return;
    for (const marker of markersRef.current) marker.remove();
    const points: Array<{ kind: keyof typeof STOP_COLORS; position: { lat: number; lng: number }; title: string }> = [
      { kind: "driver", position: currentLines.origin, title: "Driver, where this route starts" },
      ...(currentLines.stops.pickup ? [{ kind: "pickup" as const, position: currentLines.stops.pickup, title: "Pickup" }] : []),
      ...(currentLines.stops.delivery ? [{ kind: "delivery" as const, position: currentLines.stops.delivery, title: "Delivery" }] : []),
    ];
    markersRef.current = points.map((point) =>
      new mapboxgl.Marker({ element: markerElement(point.kind, point.title) })
        .setLngLat([point.position.lng, point.position.lat])
        .addTo(map),
    );

    // Framed once; after that, the person's own panning is left alone.
    if (!framedRef.current) {
      framedRef.current = true;
      const box = routeBounds(current, points.map((point) => point.position));
      map.fitBounds([[box.west, box.south], [box.east, box.north]], { padding: 40, maxZoom: 14, duration: 0 });
    }
  }, []);

  React.useEffect(() => {
    if (!token?.startsWith("pk.") || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current || !mapboxgl.supported()) {
          if (!cancelled) setFailed(true);
          return;
        }
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE_BY_THEME[theme === "dark" ? "dark" : "light"],
          center: [latestRef.current.lines.origin.lng, latestRef.current.lines.origin.lat],
          zoom: 8,
          attributionControl: false,
          renderWorldCopies: false,
          // On a scrolling page: one finger scrolls, two move the map.
          cooperativeGestures: true,
        });
        mapRef.current = map;
        // A theme change replaces the style, which drops the lines.
        map.on("style.load", () => void draw());
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        map.on("error", () => {
          if (!cancelled && !map.isStyleLoaded()) setFailed(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once; theme and route changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  React.useEffect(() => {
    mapRef.current?.setStyle(MAP_STYLE_BY_THEME[theme === "dark" ? "dark" : "light"]);
  }, [theme]);

  React.useEffect(() => {
    if (ready) void draw();
  }, [ready, route, lines, draw]);

  if (!token?.startsWith("pk.") || failed) return null;

  return (
    <div className="relative h-64 min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted/20 sm:h-72">
      <div ref={containerRef} className="h-full w-full" aria-label="Map of the best route" role="img" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-xs text-muted-foreground" role="status">
          Loading the route map…
        </div>
      )}
    </div>
  );
}

interface Props {
  loadId: string | null | undefined;
  /** Only for people who can see the driver's location, while the load is on the road. */
  enabled: boolean;
  /** Asks again as soon as this changes (for example the load's status). */
  refreshKey?: string;
}

export function LoadRouteOverview({ loadId, enabled, refreshKey }: Props) {
  const state = useLoadRoute(loadId, "staff", enabled, refreshKey);
  const mapRoute = React.useMemo(() => mapRouteOf(state), [state]);
  const lines = shownRoute(state)?.route ?? null;
  if (!state?.route) return null;
  if (!state.route.available && (state.route.reason === "routes_off" || state.route.reason === "not_tracked")) return null;

  return (
    <section aria-label="Live route" className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <LoadRouteSummary state={state} audience="staff" className="bg-card shadow-sm" />
      {mapRoute && lines ? <LoadRouteMap route={mapRoute} lines={lines} /> : null}
    </section>
  );
}
