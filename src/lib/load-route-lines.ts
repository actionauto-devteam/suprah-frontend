import type { Map as MapboxMap } from "mapbox-gl";
import type { AvailableLoadRoute, RouteCoordinate } from "@/lib/api/load-route";
import type { LoadRouteState } from "@/hooks/useLoadRoute";

/*
 * The best route on a map (see useLoadRoute): a solid line from the driver to
 * the next stop and, before pickup, a faded dashed line for the rest of the
 * trip to the delivery. Shared by the Driver Page, the Driver Tracker and the
 * Transportation load page. Without a route, maps keep their straight line.
 */

type Point = { lat: number; lng: number };

export type MapRoute = { ahead: RouteCoordinate[]; later: RouteCoordinate[] | null };

export const ROUTE_AHEAD_COLOR = "#1d4ed8";
export const ROUTE_LATER_COLOR = "#64748b";
/** After a failed refresh, the last route stays up for this long. */
export const KEEP_LAST_ROUTE_MS = 10 * 60_000;
/** Further than this from the route, the line isn't cut at the driver (a new route is on its way). */
const TRIM_WITHIN_METERS = 250;

/**
 * The route to show: the latest, or the last good one through a short failure.
 * Never an earlier route once the server finds no route that is safe for the truck.
 */
export function shownRoute(state: LoadRouteState | null, nowMs = Date.now()): AvailableLoadRoute | null {
  if (!state?.route) return null;
  if (state.route.available) return state.route;
  const { reason } = state.route;
  if (reason === "routes_off" || reason === "not_tracked" || reason === "no_safe_route") return null;
  const last = state.lastAvailable;
  return last && nowMs - Date.parse(last.computedAt) < KEEP_LAST_ROUTE_MS ? last : null;
}

/** The lines to draw for a route, or null to keep the straight line. */
export function mapRouteOf(state: LoadRouteState | null, nowMs = Date.now()): MapRoute | null {
  const lines = shownRoute(state, nowMs)?.route;
  if (!lines || lines.ahead.length < 2) return null;
  return { ahead: lines.ahead, later: lines.later && lines.later.line.length >= 2 ? lines.later.line : null };
}

/** The closest spot on a short stretch of road, in metres, using a flat projection around its start. */
function closestOnSegment(point: Point, start: RouteCoordinate, end: RouteCoordinate) {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((start[1] * Math.PI) / 180);
  const px = (point.lng - start[0]) * metersPerDegLng;
  const py = (point.lat - start[1]) * metersPerDegLat;
  const ex = (end[0] - start[0]) * metersPerDegLng;
  const ey = (end[1] - start[1]) * metersPerDegLat;
  const lengthSquared = ex * ex + ey * ey;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared));
  return {
    distance: Math.hypot(px - t * ex, py - t * ey),
    coordinate: [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t] as RouteCoordinate,
  };
}

/**
 * The route ahead from where the driver is now, with the part already driven
 * cut off, so the line always starts at the truck between route updates.
 */
export function routeAheadFrom(ahead: RouteCoordinate[], driver: Point | null): RouteCoordinate[] {
  if (!driver || ahead.length < 2) return ahead;
  let best = { index: -1, distance: Infinity, coordinate: ahead[0] };
  for (let index = 1; index < ahead.length; index += 1) {
    const closest = closestOnSegment(driver, ahead[index - 1], ahead[index]);
    if (closest.distance < best.distance) best = { index, ...closest };
  }
  if (best.index === -1 || best.distance > TRIM_WITHIN_METERS) return ahead;
  return [[driver.lng, driver.lat], best.coordinate, ...ahead.slice(best.index)];
}

/** GeoJSON features for a map source; the kinds match addMapboxRouteLayers. */
export function routeLineFeatures(route: MapRoute | null, driver: Point | null) {
  if (!route) return [];
  const features: object[] = [];
  if (route.later) {
    features.push({ type: "Feature", properties: { kind: "route-later" }, geometry: { type: "LineString", coordinates: route.later } });
  }
  const ahead = routeAheadFrom(route.ahead, driver);
  if (ahead.length >= 2) {
    features.push({ type: "Feature", properties: { kind: "route-ahead" }, geometry: { type: "LineString", coordinates: ahead } });
  }
  return features;
}

/** Adds the route lines (rest of the trip, then the route ahead on top) to a Mapbox map. Returns the layer ids. */
export function addMapboxRouteLayers(map: MapboxMap, source: string, idPrefix: string, before?: string): string[] {
  const kind = (value: string) => ["==", ["get", "kind"], value] as never;
  const ids = { later: `${idPrefix}-route-later`, casing: `${idPrefix}-route-casing`, ahead: `${idPrefix}-route-ahead` };
  map.addLayer({
    id: ids.later, type: "line", source, filter: kind("route-later"),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": ROUTE_LATER_COLOR, "line-width": 4, "line-opacity": 0.65, "line-dasharray": [2, 1.5] },
  }, before);
  map.addLayer({
    id: ids.casing, type: "line", source, filter: kind("route-ahead"),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.9 },
  }, before);
  map.addLayer({
    id: ids.ahead, type: "line", source, filter: kind("route-ahead"),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": ROUTE_AHEAD_COLOR, "line-width": 5, "line-opacity": 0.95 },
  }, before);
  return Object.values(ids);
}

/** The area a route covers, for framing a map on it. */
export function routeBounds(route: MapRoute, extra: Point[] = []): { north: number; south: number; east: number; west: number } {
  const lngs = [...route.ahead, ...(route.later ?? [])].map((coordinate) => coordinate[0]).concat(extra.map((point) => point.lng));
  const lats = [...route.ahead, ...(route.later ?? [])].map((coordinate) => coordinate[1]).concat(extra.map((point) => point.lat));
  return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
}
