import type mapboxgl from "mapbox-gl";
import type { Map as MapboxMap } from "mapbox-gl";
import type { GoogleMapsLibraries } from "@/lib/google-maps";
import { withinTripRange } from "@/lib/driver-next-stop";

/*
 * The driver's next stop on the Driver Page map: a lettered pin (P for the
 * pickup, D for the delivery) and a dashed straight line from the driver to
 * it. One version for the current Mapbox map and one for Google Maps; the page
 * talks to both the same way.
 */

type Point = { lat: number; lng: number };

export type NextStopMapState = {
  /** `key` changes when the load, the stop or its position changes. */
  stop: { key: string; kind: "pickup" | "delivery"; position: Point; title: string } | null;
  driver: Point | null;
};

export type FitOptions = {
  /** When the driver is too far from the stop to frame both, frame nothing (the caller shows the driver). */
  preferDriverWhenFar?: boolean;
};

export type NextStopLayer = {
  update: (state: NextStopMapState) => void;
  /**
   * Frames the stop and the driver (only the stop when they're too far apart
   * for one view). False when nothing was framed.
   */
  fit: (options?: FitOptions) => boolean;
  dispose: () => void;
};

export const NEXT_STOP_COLORS = { pickup: "#f59e0b", delivery: "#e11d48" } as const;
const LINE_COLOR = "#2563eb";

function stopElement(kind: "pickup" | "delivery") {
  const element = document.createElement("div");
  element.style.cssText = `width:30px;height:30px;border-radius:50%;background:${NEXT_STOP_COLORS[kind]};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);color:#fff;font:800 12px/1 system-ui;display:flex;align-items:center;justify-content:center`;
  element.textContent = kind === "pickup" ? "P" : "D";
  return element;
}

const tooFarApart = (state: NextStopMapState) =>
  Boolean(state.stop && state.driver && !withinTripRange(state.driver, state.stop.position));

/** The points to frame, or null for none. */
function framePoints(state: NextStopMapState, options?: FitOptions): Point[] | null {
  if (!state.stop) return null;
  if (!state.driver) return [state.stop.position];
  if (!tooFarApart(state)) return [state.stop.position, state.driver];
  return options?.preferDriverWhenFar ? null : [state.stop.position];
}

/** The dashed line, only while the driver and the stop are on the same trip scale. */
const showLine = (state: NextStopMapState) => Boolean(state.stop && state.driver && !tooFarApart(state));

function bounds(points: Point[]) {
  return {
    north: Math.max(...points.map((point) => point.lat)),
    south: Math.min(...points.map((point) => point.lat)),
    east: Math.max(...points.map((point) => point.lng)),
    west: Math.min(...points.map((point) => point.lng)),
  };
}

/**
 * Each stop is framed automatically once (when it first appears); after that
 * the driver's own panning is left alone. `framedStops` outlives a layer, so a
 * map rebuilt for a theme change doesn't jump again.
 */
function framing(framedStops: Set<string>, fit: (options?: FitOptions) => boolean) {
  return (state: NextStopMapState) => {
    if (!state.stop || framedStops.has(state.stop.key)) return;
    framedStops.add(state.stop.key);
    fit({ preferDriverWhenFar: true });
  };
}

export function createMapboxNextStopLayer(map: MapboxMap, mapbox: typeof mapboxgl, framedStops: Set<string>): NextStopLayer {
  const SOURCE = "suprah-driver-next-stop";
  const LINE = "suprah-driver-next-stop-line";
  let state: NextStopMapState = { stop: null, driver: null };
  let marker: InstanceType<typeof mapboxgl.Marker> | null = null;
  let markerKind: string | null = null;
  let disposed = false;

  const lineData = () => ({
    type: "FeatureCollection" as const,
    features:
      state.stop && state.driver && showLine(state)
        ? [{
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: [[state.driver.lng, state.driver.lat], [state.stop.position.lng, state.stop.position.lat]],
            },
          }]
        : [],
  });

  let retryWhenIdle = false;
  function drawLine() {
    if (disposed) return;
    if (!map.isStyleLoaded()) {
      // Mapbox reports "not loaded" while tiles are still coming in; try again
      // once the map settles instead of waiting for the next GPS update.
      if (!retryWhenIdle) {
        retryWhenIdle = true;
        map.once("idle", () => {
          retryWhenIdle = false;
          drawLine();
        });
      }
      return;
    }
    const source = map.getSource(SOURCE) as { setData: (data: ReturnType<typeof lineData>) => void } | undefined;
    if (source) {
      source.setData(lineData());
      return;
    }
    map.addSource(SOURCE, { type: "geojson", data: lineData() });
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      layout: { "line-cap": "round" },
      paint: { "line-color": LINE_COLOR, "line-width": 3, "line-opacity": 0.85, "line-dasharray": [1.5, 1.5] },
    });
  }

  function drawMarker() {
    if (!state.stop) {
      marker?.remove();
      marker = null;
      markerKind = null;
      return;
    }
    const lngLat: [number, number] = [state.stop.position.lng, state.stop.position.lat];
    if (!marker || markerKind !== state.stop.kind) {
      marker?.remove();
      marker = new mapbox.Marker({ element: stopElement(state.stop.kind) }).setLngLat(lngLat).addTo(map);
      markerKind = state.stop.kind;
    } else {
      marker.setLngLat(lngLat);
    }
    marker.getElement().title = state.stop.title;
  }

  const fit = (options?: FitOptions) => {
    const points = disposed ? null : framePoints(state, options);
    if (!points) return false;
    if (points.length === 1) {
      map.flyTo({ center: [points[0].lng, points[0].lat], zoom: 14, essential: true });
    } else {
      const box = bounds(points);
      map.fitBounds(
        [[box.west, box.south], [box.east, box.north]] as [[number, number], [number, number]],
        { padding: 64, maxZoom: 15, duration: 700 },
      );
    }
    return true;
  };
  const frameNewStop = framing(framedStops, fit);

  // A theme change replaces the map style, which drops the line.
  map.on("style.load", drawLine);

  return {
    update(next) {
      if (disposed) return;
      state = next;
      drawMarker();
      drawLine();
      frameNewStop(state);
    },
    fit,
    dispose() {
      disposed = true;
      marker?.remove();
      map.off("style.load", drawLine);
      if (map.getStyle()) {
        if (map.getLayer(LINE)) map.removeLayer(LINE);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      }
    },
  };
}

export function createGoogleNextStopLayer(
  map: google.maps.Map,
  libraries: GoogleMapsLibraries,
  framedStops: Set<string>,
): NextStopLayer {
  let state: NextStopMapState = { stop: null, driver: null };
  let marker: google.maps.marker.AdvancedMarkerElement | null = null;
  let markerKind: string | null = null;
  let disposed = false;
  const line = new libraries.maps.Polyline({
    map,
    path: [],
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.85, strokeColor: LINE_COLOR, scale: 3 }, offset: "0", repeat: "14px" }],
  });

  const fit = (options?: FitOptions) => {
    const points = disposed ? null : framePoints(state, options);
    if (!points) return false;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(14);
    } else {
      map.fitBounds(bounds(points), 64);
      // Two points close together would zoom in all the way.
      google.maps.event.addListenerOnce(map, "idle", () => {
        if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      });
    }
    return true;
  };
  const frameNewStop = framing(framedStops, fit);

  return {
    update(next) {
      if (disposed) return;
      state = next;
      if (!state.stop) {
        if (marker) marker.map = null;
        marker = null;
        markerKind = null;
      } else if (!marker || markerKind !== state.stop.kind) {
        if (marker) marker.map = null;
        marker = new libraries.marker.AdvancedMarkerElement({
          map,
          position: state.stop.position,
          content: stopElement(state.stop.kind),
          title: state.stop.title,
        });
        markerKind = state.stop.kind;
      } else {
        marker.position = state.stop.position;
        marker.title = state.stop.title;
      }
      line.setPath(state.stop && state.driver && showLine(state) ? [state.driver, state.stop.position] : []);
      frameNewStop(state);
    },
    fit,
    dispose() {
      disposed = true;
      if (marker) marker.map = null;
      line.setMap(null);
    },
  };
}
