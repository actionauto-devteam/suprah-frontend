import type { DriverTrackingItem } from "@/types/driver-tracking";
import { trackingState, validCoordinates, formatTrackingTime } from "@/lib/driver-tracking-view";

type FleetState = { drivers: DriverTrackingItem[]; selectedId: string | null; now: number };
export type DriverFleetLayer = { update: (state: FleetState) => void; dispose: () => void };
const SOURCE = "suprah-driver-fleet";
const CLUSTERS = "suprah-driver-clusters";
const COUNTS = "suprah-driver-cluster-counts";
const POINTS = "suprah-driver-points";
const LABELS = "suprah-driver-labels";
const COLORS: Record<string, string> = { "on-route": "#059669", idle: "#d97706", waiting: "#2563eb", "on-break": "#64748b", offline: "#64748b" };

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
  onManualPan: () => void, token?: string): DriverFleetLayer {
  let state: FleetState = { drivers: [], selectedId: null, now: Date.now() };
  let disposed = false;
  let selectedMarker: any = null;
  let popup: any = null;
  let geocode: AbortController | null = null;
  let geocodeKey = "";
  let placeName = "";
  const places = new Map<string, string>();
  let revision = 0;

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
      if (token && !placeName) {
        geocode = new AbortController();
        void fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${driver.coords!.lng},${driver.coords!.lat}.json?types=neighborhood,locality,place&limit=1&access_token=${encodeURIComponent(token)}`, { signal: geocode.signal })
          .then(response => { if (!response.ok) throw Error("Geocoding unavailable"); return response.json(); })
          .then(data => {
            if (disposed || geocodeKey !== key) return;
            placeName = String(data.features?.[0]?.place_name ?? "").split(",").slice(0, 2).join(",").trim();
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
      map.addSource(SOURCE, { type: "geojson", data: driverFeatureCollection(state), cluster: true, clusterMaxZoom: 14, clusterRadius: 48 });
      map.addLayer({ id: CLUSTERS, type: "circle", source: SOURCE, filter: ["has", "point_count"], paint: {
        "circle-color": "#334155", "circle-radius": ["step", ["get", "point_count"], 22, 25, 27, 100, 32], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      map.addLayer({ id: COUNTS, type: "symbol", source: SOURCE, filter: ["has", "point_count"], layout: {
        "text-field": ["get", "point_count_abbreviated"], "text-size": 13 }, paint: { "text-color": "#ffffff" } });
      map.addLayer({ id: POINTS, type: "circle", source: SOURCE, filter: ["!", ["has", "point_count"]], paint: {
        "circle-color": ["get", "color"], "circle-radius": 17, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
      map.addLayer({ id: LABELS, type: "symbol", source: SOURCE, filter: ["!", ["has", "point_count"]], layout: {
        "text-field": ["get", "label"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
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
  function manual(event: any) { if (event.originalEvent) onManualPan(); }
  map.on("style.load", render);
  map.on("click", click);
  map.on("mousemove", cursor);
  map.on("dragstart", manual);
  map.on("movestart", manual); // Includes keyboard panning, but not programmatic follow moves.
  return {
    update(next) { revision++; state = next; render(); },
    dispose() {
      disposed = true; geocode?.abort(); places.clear(); selectedMarker?.remove(); popup?.remove();
      map.off("style.load", render); map.off("click", click); map.off("mousemove", cursor); map.off("dragstart", manual); map.off("movestart", manual);
      if (map.getStyle()) {
        for (const id of [LABELS, POINTS, COUNTS, CLUSTERS]) if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
        map.getCanvas().style.cursor = "";
      }
    },
  };
}