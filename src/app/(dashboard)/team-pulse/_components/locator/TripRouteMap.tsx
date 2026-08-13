"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Layer } from "leaflet";
import { Loader2, MapPinOff } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useDrivingSessionDetail, type LocationHistoryPoint } from "@/hooks/useLocator";

const TILE_URL = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// See getDomTheme() in LocatorLiveMapSection.tsx — same reasoning: ThemeContext's React
// state deliberately starts as 'dark' on every load and only self-corrects a moment later,
// so picking the initial tile set from that state (instead of the theme already applied to
// <html> by the blocking inline script) flashes the wrong basemap for light-mode users.
function getDomTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function RouteReplayMap({ route }: { route: LocationHistoryPoint[] }) {
  const { theme } = useTheme();
  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  // The map is already initialized with the correct (DOM-read) theme below — this ref lets
  // the theme-sync effect skip its first run, which otherwise fires with the still-stale
  // 'dark' context value and would immediately swap the correctly-initialized tiles to the
  // wrong theme, right before ThemeContext corrects itself a moment later. Real theme
  // toggles after mount are unaffected.
  const skippedFirstThemeSyncRef = React.useRef(false);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || route.length === 0) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      const coords = route.map((p) => [p.coords.lat, p.coords.lng] as [number, number]);

      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: true });
      mapInstanceRef.current = map;
      L.tileLayer(TILE_URL[getDomTheme()], { subdomains: "abcd", maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);

      L.polyline(coords, { color: "#3b82f6", weight: 4, opacity: 0.9 }).addTo(map);

      const startEl = document.createElement("div");
      startEl.style.cssText = "width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)";
      const endEl = document.createElement("div");
      endEl.style.cssText = "width:14px;height:14px;border-radius:9999px;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)";

      L.marker(coords[0], { icon: L.divIcon({ html: startEl, className: "locator-marker-icon", iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(map);
      L.marker(coords[coords.length - 1], { icon: L.divIcon({ html: endEl, className: "locator-marker-icon", iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(map);

      map.fitBounds(coords, { padding: [40, 40], maxZoom: 16 });
    })();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Route changes just re-mount the map fresh — this is a short-lived dialog view, not worth
    // the complexity of in-place updates like the live map has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.length]);

  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!skippedFirstThemeSyncRef.current) {
      skippedFirstThemeSyncRef.current = true;
      return;
    }
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      if (!map) return;
      map.eachLayer((layer: Layer) => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      L.tileLayer(TILE_URL[theme], { subdomains: "abcd", maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);
    })();
  }, [theme]);

  if (route.length === 0) {
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
