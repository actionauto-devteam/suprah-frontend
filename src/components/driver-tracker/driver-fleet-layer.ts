import type { DriverTrackingItem } from "@/types/driver-tracking";
import { trackingState, validCoordinates, formatTrackingTime } from "@/lib/driver-tracking-view";
import { stopsFollowing } from "@/lib/map-follow";
import { liveMapLabelFont } from "@/lib/base-map";

/** The driver's area name from the server ("Dallas, TX"), and whether the server can look names up. */
export type AreaNameLookup = (driverId: string, signal: AbortSignal) => Promise<{ areaName: string | null; available: boolean }>;

type FleetState = { drivers: DriverTrackingItem[]; selectedId: string | null; now: number };
export type DriverFleetLayer = { update: (state: FleetState) => void; dispose: () => void };
const SOURCE = "suprah-driver-fleet";
const CLUSTERS = "suprah-driver-clusters";
const COUNTS = "suprah-driver-cluster-counts";
const POINTS = "suprah-driver-points";
const LABELS = "suprah-driver-labels";
const COLORS: Record<string, string> = { "on-route": "#059669", idle: "#d97706", waiting: "#2563eb", "on-break": "#64748b", offline: "#64748b" };

/** Marker color: the activity color while GPS is fresh, gray otherwise. */
export function driverMarkerColor(driver: DriverTrackingItem, now: number) {
  return trackingState(driver, now).kind === "live" ? COLORS[driver.status] ?? "#64748b" : "#64748b";
}

/** The popup lines for a selected driver. */
export function driverPopupLines(driver: DriverTrackingItem, now: number, placeName: string) {
  return [driver.driver?.name || "Driver", trackingState(driver, now).label, `Activity: ${driver.status}`, placeName,
    `GPS: ${formatTrackingTime(driver.locationRecordedAt)}`, `${driver.shipments.length} active load(s)`,
    driver.equipment?.trailerType?.replace(/_/g, " ")].filter((text): text is string => Boolean(text));
}

export function driverFeatureCollection(state: FleetState) {
  return {
    type: "FeatureCollection" as const,
    features: state.drivers.filter(driver => driver.id !== state.selectedId && validCoordinates(driver.coords)).map(driver => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [driver.coords!.lng, driver.coords!.lat] },
      properties: { driverId: driver.id, label: (driver.driver?.name || "?").split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase(),
        color: trackingState(driver, state.now).kind === "live" ? COLORS[driver.status] ?? "#64748b" : "#64748b" },
    })),
  };
}

/** Owns only fleet layers/listeners. No organization-wide subscriptions or additional map provider. */
export function createDriverFleetLayer(map: any, mapboxgl: any, onSelect: (driver: DriverTrackingItem) => void,
  onManualPan: () => void, lookupAreaName?: AreaNameLookup, mapboxFallbackToken?: string): DriverFleetLayer {
  let state: FleetState = { drivers: [], selectedId: null, now: Date.now() };
  let disposed = false;
  let selectedMarker: any = null;
  let popup: any = null;
  let geocode: AbortController | null = null;
  let geocodeKey = "";
  let placeName = "";
  const places = new Map<string, string>();
  let revision = 0;
  // Area names come from the server: Amazon Location once it's switched on
  // (2026-11-12). Mapbox in the browser is used only while the server has no
  // place service set up.
  let serverNamesAvailable = Boolean(lookupAreaName);

  async function areaNameFor(driver: DriverTrackingItem, signal: AbortSignal): Promise<string> {
    if (lookupAreaName && serverNamesAvailable) {
      try {
        const { areaName, available } = await lookupAreaName(driver.id, signal);
        if (available) return areaName ?? "";
        serverNamesAvailable = false;
      } catch (error) {
        if (signal.aborted) throw error;
      }
    }
    if (!mapboxFallbackToken) return "";
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${driver.coords!.lng},${driver.coords!.lat}.json?types=neighborhood,locality,place&limit=1&access_token=${encodeURIComponent(mapboxFallbackToken)}`, { signal });
    if (!response.ok) throw Error("Geocoding unavailable");
    const data = await response.json();
    return String(data.features?.[0]?.place_name ?? "").split(",").slice(0, 2).join(",").trim();
  }

  function selected() { return state.drivers.find(driver => driver.id === state.selectedId && validCoordinates(driver.coords)); }
  function renderPopup(driver: DriverTrackingItem) {
    const content = document.createElement("div");
    content.style.cssText = "font:12px/1.5 system-ui;color:inherit;padding:4px 24px 4px 4px;max-width:240px";
    for (const text of [driver.driver?.name || "Driver", trackingState(driver, state.now).label,
      `Activity: ${driver.status}`, placeName, `GPS: ${formatTrackingTime(driver.locationRecordedAt)}`,
      `${driver.shipments.length} active load(s)`, driver.equipment?.trailerType?.replace(/_/g, " ")]) {
      if (!text) continue;
      const row = document.createElement("div"); row.textContent = text; content.appendChild(row);
    }
    popup?.setDOMContent(content);
  }
  function renderSelected() {
    const driver = selected();
    if (!driver) {
      selectedMarker?.remove(); selectedMarker = null; popup?.remove(); popup = null;
      geocode?.abort(); geocode = null; geocodeKey = ""; placeName = "";
      return;
    }
    if (!selectedMarker) {
      const button = document.createElement("button");
      button.type = "button";
      button.style.cssText = "width:44px;height:44px;border:3px solid white;border-radius:50%;color:white;font:700 13px system-ui;box-shadow:0 0 0 3px #2563eb,0 3px 10px #0006;cursor:pointer";
      button.onclick = event => { event.stopPropagation(); const current = selected(); if (current) onSelect(current); };
      popup = new mapboxgl.Popup({ offset: 28, closeButton: true, maxWidth: "260px" });
      selectedMarker = new mapboxgl.Marker({ element: button }).setPopup(popup).setLngLat([driver.coords!.lng, driver.coords!.lat]).addTo(map);
    }
    const button = selectedMarker.getElement();
    button.textContent = (driver.driver?.name || "?").split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
    button.setAttribute("aria-label", `${driver.driver?.name || "Driver"}, selected, ${trackingState(driver, state.now).label}`);
    button.setAttribute("aria-pressed", "true");
    button.style.backgroundColor = trackingState(driver, state.now).kind === "live" ? COLORS[driver.status] ?? "#64748b" : "#64748b";
    selectedMarker.setLngLat([driver.coords!.lng, driver.coords!.lat]);
    const key = `${driver.id}:${driver.coords!.lng.toFixed(4)},${driver.coords!.lat.toFixed(4)}`;
    if (key !== geocodeKey) {
      geocode?.abort(); geocode = null;
      geocodeKey = key; placeName = places.get(key) ?? "";
      if (!placeName && (lookupAreaName || mapboxFallbackToken)) {
        geocode = new AbortController();
        void areaNameFor(driver, geocode.signal)
          .then(name => {
            if (disposed || geocodeKey !== key) return;
            placeName = name;
            if (places.size >= 100) places.delete(places.keys().next().value!);
            places.set(key, placeName);
            const current = selected(); if (current) renderPopup(current);
          }).catch(() => {});
      }
    }
    renderPopup(driver);
  }

  function render() {
    if (disposed || !map.isStyleLoaded()) return;
    if (!map.getSource(SOURCE)) {
      const font = liveMapLabelFont(map);
      const textFont = font ? { "text-font": font } : {};
      map.addSource(SOURCE, { type: "geojson", data: driverFeatureCollection(state), cluster: true, clusterMaxZoom: 14, clusterRadius: 48 });
      map.addLayer({ id: CLUSTERS, type: "circle", source: SOURCE, filter: ["has", "point_count"], paint: {
        "circle-color": "#334155", "circle-radius": ["step", ["get", "point_count"], 22, 25, 27, 100, 32], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      map.addLayer({ id: COUNTS, type: "symbol", source: SOURCE, filter: ["has", "point_count"], layout: {
        "text-field": ["get", "point_count_abbreviated"], "text-size": 13, ...textFont }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: POINTS, type: "circle", source: SOURCE, filter: ["!", ["has", "point_count"]], paint: {
        "circle-color": ["get", "color"], "circle-radius": 17, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      map.addLayer({ id: LABELS, type: "symbol", source: SOURCE, filter: ["!", ["has", "point_count"]], layout: {
        "text-field": ["get", "label"], "text-size": 11, "text-allow-overlap": true, ...textFont }, paint: { "text-color": "#ffffff" } });
    } else map.getSource(SOURCE).setData(driverFeatureCollection(state));
    renderSelected();
  }
  function click(event: any) {
    if (disposed || !map.getLayer(POINTS)) return;
    const p = event.point;
    const features = map.queryRenderedFeatures([[p.x - 7, p.y - 7], [p.x + 7, p.y + 7]], { layers: [POINTS, CLUSTERS] });
    const feature = features[0]; if (!feature) return;
    if (feature.properties?.cluster_id != null) {
      const currentRevision = revision;
      map.getSource(SOURCE)?.getClusterExpansionZoom(Number(feature.properties.cluster_id), (error: unknown, zoom: number) => {
        if (disposed || error || currentRevision !== revision) return;
        onManualPan(); map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 350 });
      });
    } else {
      const driver = state.drivers.find(item => item.id === String(feature.properties?.driverId));
      if (driver) onSelect(driver);
    }
  }
  function cursor(event: any) {
    if (!map.getLayer(POINTS)) return;
    map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: [POINTS, CLUSTERS] }).length ? "pointer" : "";
  }
  // Dragging (mouse or one finger) or the arrow keys pause Follow; zooming
  // keeps following, as on the customer's map and the Driver Page.
  function manual(event: any) { if (stopsFollowing(event.originalEvent)) onManualPan(); }
  function manualKeys(event: { originalEvent?: Event }) {
    const original = event.originalEvent;
    if (original?.type === "keydown" && stopsFollowing(original as KeyboardEvent)) onManualPan();
  }
  map.on("style.load", render);
  map.on("click", click);
  map.on("mousemove", cursor);
  map.on("dragstart", manual);
  map.on("movestart", manualKeys); // Keyboard panning only: not zooming or programmatic follow moves.
  return {
    update(next) { revision++; state = next; render(); },
    dispose() {
      disposed = true; geocode?.abort(); places.clear(); selectedMarker?.remove(); popup?.remove();
      map.off("style.load", render); map.off("click", click); map.off("mousemove", cursor); map.off("dragstart", manual); map.off("movestart", manualKeys);
      if (map.getStyle()) {
        for (const id of [LABELS, POINTS, COUNTS, CLUSTERS]) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
        map.getCanvas().style.cursor = "";
      }
    },
  };
}