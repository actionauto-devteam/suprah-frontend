import type mapboxgl from "mapbox-gl";
import type { Map as MapboxMap } from "mapbox-gl";
import type { GoogleMapsLibraries } from "@/lib/google-maps";
import { withinTripRange } from "@/lib/driver-next-stop";

/*
 * The selected driver on the Driver Tracker map, drawn under the driver
 * markers: their loads' stops (P and D squares, the next one ringed), a dashed
 * line to the next stop, the recent route from trip history, and a circle for
 * GPS accuracy. One version for Mapbox and one for Google Maps.
 */

type Point = { lat: number; lng: number };

export type FocusStop = {
  key: string;
  kind: "pickup" | "delivery";
  position: Point;
  title: string;
  /** The stop the driver is heading to now. */
  next: boolean;
};

export type DriverFocusState = {
  /** Null when the viewer can't see this driver's exact GPS. */
  position: Point | null;
  accuracyMeters: number | null;
  /** Oldest first. */
  trail: Point[];
  stops: FocusStop[];
};

export type DriverFocusLayer = { update: (state: DriverFocusState) => void; dispose: () => void };

export const EMPTY_DRIVER_FOCUS: DriverFocusState = { position: null, accuracyMeters: null, trail: [], stops: [] };

const STOP_COLORS = { pickup: "#f59e0b", delivery: "#e11d48" } as const;
const ROUTE_COLOR = "#2563eb";
// A circle under 5 m can't be seen; one over 5 km says nothing useful.
const accuracyRadius = (meters: number | null) =>
  meters != null && Number.isFinite(meters) && meters >= 5 ? Math.min(meters, 5000) : null;

function stopElement(kind: "pickup" | "delivery") {
  const element = document.createElement("div");
  element.textContent = kind === "pickup" ? "P" : "D";
  element.style.cssText = `width:26px;height:26px;border-radius:7px;background:${STOP_COLORS[kind]};border:2px solid #fff;color:#fff;font:800 12px/1 system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)`;
  return element;
}

function styleStop(element: HTMLElement, stop: FocusStop) {
  element.title = stop.title;
  element.style.boxShadow = stop.next ? `0 0 0 3px ${ROUTE_COLOR},0 2px 8px rgba(0,0,0,.35)` : "0 2px 8px rgba(0,0,0,.35)";
}

const nextStopOf = (state: DriverFocusState) => state.stops.find((stop) => stop.next) ?? null;
// The dashed line only on a trip scale (see MAX_STOP_LINE_MILES).
const nextLineTo = (state: DriverFocusState) => {
  const next = nextStopOf(state);
  return state.position && next && withinTripRange(state.position, next.position) ? next : null;
};

// ─── Mapbox ──────────────────────────────────────────────────────────────────

function circlePolygon(center: Point, radiusMeters: number, steps = 64): [number, number][] {
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  const ring: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * 2 * Math.PI;
    ring.push([center.lng + dLng * Math.cos(angle), center.lat + dLat * Math.sin(angle)]);
  }
  return ring;
}

export function createMapboxDriverFocusLayer(map: MapboxMap, mapbox: typeof mapboxgl): DriverFocusLayer {
  const SOURCE = "suprah-driver-focus";
  const LAYERS = {
    accuracy: "suprah-driver-focus-accuracy",
    accuracyEdge: "suprah-driver-focus-accuracy-edge",
    trail: "suprah-driver-focus-trail",
    next: "suprah-driver-focus-next",
  };
  // Keep these under the driver markers (the fleet layer's clusters).
  const BELOW = "suprah-driver-clusters";
  let state: DriverFocusState = EMPTY_DRIVER_FOCUS;
  let disposed = false;
  let retryWhenIdle = false;
  const markers = new Map<string, { marker: InstanceType<typeof mapboxgl.Marker>; kind: string }>();

  const features = () => {
    const list: object[] = [];
    const radius = accuracyRadius(state.accuracyMeters);
    if (state.position && radius) {
      list.push({ type: "Feature", properties: { kind: "accuracy" }, geometry: { type: "Polygon", coordinates: [circlePolygon(state.position, radius)] } });
    }
    if (state.trail.length >= 2) {
      list.push({ type: "Feature", properties: { kind: "trail" }, geometry: { type: "LineString", coordinates: state.trail.map((point) => [point.lng, point.lat]) } });
    }
    const next = nextLineTo(state);
    if (state.position && next) {
      list.push({
        type: "Feature",
        properties: { kind: "next" },
        geometry: { type: "LineString", coordinates: [[state.position.lng, state.position.lat], [next.position.lng, next.position.lat]] },
      });
    }
    return { type: "FeatureCollection", features: list };
  };

  function drawShapes() {
    if (disposed) return;
    if (!map.isStyleLoaded()) {
      if (!retryWhenIdle) {
        retryWhenIdle = true;
        map.once("idle", () => {
          retryWhenIdle = false;
          drawShapes();
        });
      }
      return;
    }
    const source = map.getSource(SOURCE) as { setData: (data: ReturnType<typeof features>) => void } | undefined;
    if (source) {
      source.setData(features());
      return;
    }
    map.addSource(SOURCE, { type: "geojson", data: features() as never });
    const before = map.getLayer(BELOW) ? BELOW : undefined;
    const kind = (value: string) => ["==", ["get", "kind"], value] as never;
    map.addLayer({ id: LAYERS.accuracy, type: "fill", source: SOURCE, filter: kind("accuracy"), paint: { "fill-color": ROUTE_COLOR, "fill-opacity": 0.12 } }, before);
    map.addLayer({ id: LAYERS.accuracyEdge, type: "line", source: SOURCE, filter: kind("accuracy"), paint: { "line-color": ROUTE_COLOR, "line-opacity": 0.45, "line-width": 1 } }, before);
    map.addLayer({
      id: LAYERS.trail, type: "line", source: SOURCE, filter: kind("trail"),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ROUTE_COLOR, "line-opacity": 0.55, "line-width": 4 },
    }, before);
    map.addLayer({
      id: LAYERS.next, type: "line", source: SOURCE, filter: kind("next"),
      layout: { "line-cap": "round" },
      paint: { "line-color": ROUTE_COLOR, "line-opacity": 0.85, "line-width": 3, "line-dasharray": [1.5, 1.5] },
    }, before);
  }

  function drawStops() {
    const keep = new Set(state.stops.map((stop) => stop.key));
    for (const [key, entry] of markers) {
      if (keep.has(key)) continue;
      entry.marker.remove();
      markers.delete(key);
    }
    for (const stop of state.stops) {
      const lngLat: [number, number] = [stop.position.lng, stop.position.lat];
      let entry = markers.get(stop.key);
      if (!entry || entry.kind !== stop.kind) {
        entry?.marker.remove();
        entry = { marker: new mapbox.Marker({ element: stopElement(stop.kind) }).setLngLat(lngLat).addTo(map), kind: stop.kind };
        markers.set(stop.key, entry);
      } else {
        entry.marker.setLngLat(lngLat);
      }
      styleStop(entry.marker.getElement(), stop);
    }
  }

  // A theme change replaces the map style, which drops the shapes.
  map.on("style.load", drawShapes);

  return {
    update(next) {
      if (disposed) return;
      state = next;
      drawStops();
      drawShapes();
    },
    dispose() {
      disposed = true;
      for (const entry of markers.values()) entry.marker.remove();
      markers.clear();
      map.off("style.load", drawShapes);
      if (map.getStyle()) {
        for (const id of Object.values(LAYERS)) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      }
    },
  };
}

// ─── Google Maps ─────────────────────────────────────────────────────────────

export function createGoogleDriverFocusLayer(map: google.maps.Map, libraries: GoogleMapsLibraries): DriverFocusLayer {
  let disposed = false;
  const accuracy = new libraries.maps.Circle({
    map,
    clickable: false,
    strokeColor: ROUTE_COLOR,
    strokeOpacity: 0.45,
    strokeWeight: 1,
    fillColor: ROUTE_COLOR,
    fillOpacity: 0.12,
    visible: false,
  });
  const trail = new libraries.maps.Polyline({ map, clickable: false, strokeColor: ROUTE_COLOR, strokeOpacity: 0.55, strokeWeight: 4 });
  const nextLine = new libraries.maps.Polyline({
    map,
    clickable: false,
    strokeOpacity: 0,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.85, strokeColor: ROUTE_COLOR, scale: 3 }, offset: "0", repeat: "14px" }],
  });
  const markers = new Map<string, { marker: google.maps.marker.AdvancedMarkerElement; element: HTMLElement; kind: string }>();

  return {
    update(state) {
      if (disposed) return;
      const radius = accuracyRadius(state.accuracyMeters);
      if (state.position && radius) {
        accuracy.setCenter(state.position);
        accuracy.setRadius(radius);
        accuracy.setVisible(true);
      } else {
        accuracy.setVisible(false);
      }
      trail.setPath(state.trail.length >= 2 ? state.trail : []);
      const next = nextLineTo(state);
      nextLine.setPath(state.position && next ? [state.position, next.position] : []);

      const keep = new Set(state.stops.map((stop) => stop.key));
      for (const [key, entry] of markers) {
        if (keep.has(key)) continue;
        entry.marker.map = null;
        markers.delete(key);
      }
      for (const stop of state.stops) {
        let entry = markers.get(stop.key);
        if (!entry || entry.kind !== stop.kind) {
          if (entry) entry.marker.map = null;
          const element = stopElement(stop.kind);
          entry = {
            marker: new libraries.marker.AdvancedMarkerElement({ map, position: stop.position, content: element, zIndex: 900 }),
            element,
            kind: stop.kind,
          };
          markers.set(stop.key, entry);
        } else {
          entry.marker.position = stop.position;
        }
        entry.marker.title = stop.title;
        styleStop(entry.element, stop);
      }
    },
    dispose() {
      disposed = true;
      accuracy.setMap(null);
      trail.setMap(null);
      nextLine.setMap(null);
      for (const entry of markers.values()) entry.marker.map = null;
      markers.clear();
    },
  };
}
