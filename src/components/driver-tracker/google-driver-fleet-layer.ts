import { MarkerClusterer, SuperClusterAlgorithm, type AlgorithmInput, type Renderer } from "@googlemaps/markerclusterer";
import type { DriverTrackingItem } from "@/types/driver-tracking";
import { trackingState, validCoordinates } from "@/lib/driver-tracking-view";
import { driverInitials, watchUserMapMoves, type GoogleMapsLibraries } from "@/lib/google-maps";
import { driverMarkerColor, driverPopupLines, type DriverFleetLayer } from "./driver-fleet-layer";

type FleetState = Parameters<DriverFleetLayer["update"]>[0];
export type AreaNameLookup = (driverId: string, signal: AbortSignal) => Promise<{ areaName: string | null; available: boolean }>;

// The clusterer re-reads marker positions only when its list of markers
// changes. Drivers move without the list changing, so a move forces a re-read.
class MovingMarkersAlgorithm extends SuperClusterAlgorithm {
  private positionsChanged = false;
  markPositionsChanged() {
    this.positionsChanged = true;
  }
  calculate(input: AlgorithmInput) {
    if (this.positionsChanged) {
      this.markers = [];
      this.positionsChanged = false;
    }
    return super.calculate(input);
  }
}

function markerElement(size: number) {
  const element = document.createElement("div");
  element.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${size > 40 ? 13 : 11}px system-ui;box-sizing:border-box;cursor:pointer`;
  return element;
}

const countLabel = (count: number) => (count < 1000 ? String(count) : `${(count / 1000).toFixed(1)}k`);

/**
 * The Driver Tracker's drivers on a Google map: grouped markers (numbered
 * circles), the selected driver's larger marker with its details window, and
 * the area name from the backend. Same contract as the Mapbox layer.
 */
export function createGoogleDriverFleetLayer(
  map: google.maps.Map,
  container: HTMLElement,
  libraries: GoogleMapsLibraries,
  onSelect: (driver: DriverTrackingItem) => void,
  onManualPan: () => void,
  lookupAreaName?: AreaNameLookup,
): DriverFleetLayer {
  const { AdvancedMarkerElement } = libraries.marker;
  let state: FleetState = { drivers: [], selectedId: null, now: Date.now() };
  let disposed = false;

  // ── Grouped markers for every driver except the selected one ──
  const algorithm = new MovingMarkersAlgorithm({
    // Supercluster measures in 512-pixel tiles and Google's are 256, so this
    // groups within about 48 screen pixels, as the Mapbox map did.
    radius: 96,
    maxZoom: 15,
  });
  const renderer: Renderer = {
    render(cluster) {
      const size = cluster.count >= 100 ? 64 : cluster.count >= 25 ? 54 : 44;
      const element = markerElement(size);
      element.textContent = countLabel(cluster.count);
      element.style.background = "#334155";
      element.style.border = "2px solid #fff";
      element.style.boxShadow = "0 2px 8px #0005";
      return new AdvancedMarkerElement({
        position: cluster.position,
        content: element,
        title: `${cluster.count} drivers here. Select to zoom in.`,
        zIndex: 1000 + cluster.count,
        gmpClickable: true,
      });
    },
  };
  const clusterer = new MarkerClusterer({
    map,
    algorithm,
    renderer,
    onClusterClick: (_event, cluster, clusterMap) => {
      onManualPan();
      if (cluster.bounds) clusterMap.fitBounds(cluster.bounds, 48);
    },
  });

  type DriverMarker = { marker: google.maps.marker.AdvancedMarkerElement; element: HTMLDivElement; lat: number; lng: number };
  const driverMarkers = new Map<string, DriverMarker>();

  function styleDriverMarker(entry: DriverMarker, driver: DriverTrackingItem) {
    entry.element.textContent = driverInitials(driver.driver?.name);
    entry.element.style.background = driverMarkerColor(driver, state.now);
    entry.marker.title = `${driver.driver?.name || "Driver"}, ${trackingState(driver, state.now).label}`;
  }

  function createDriverMarker(driver: DriverTrackingItem): DriverMarker {
    const element = markerElement(34);
    element.style.border = "2px solid #fff";
    element.style.boxShadow = "0 1px 6px #0004";
    const { lat, lng } = driver.coords!;
    const marker = new AdvancedMarkerElement({ position: { lat, lng }, content: element, gmpClickable: true });
    const driverId = driver.id;
    marker.addEventListener("gmp-click", () => {
      const current = state.drivers.find((item) => item.id === driverId);
      if (current) onSelect(current);
    });
    return { marker, element, lat, lng };
  }

  function renderFleet() {
    const visible = state.drivers.filter((driver) => driver.id !== state.selectedId && validCoordinates(driver.coords));
    const keep = new Set(visible.map((driver) => driver.id));
    const removed: google.maps.marker.AdvancedMarkerElement[] = [];
    const added: google.maps.marker.AdvancedMarkerElement[] = [];
    let moved = false;
    for (const [id, entry] of driverMarkers) {
      if (keep.has(id)) continue;
      removed.push(entry.marker);
      driverMarkers.delete(id);
    }
    for (const driver of visible) {
      const { lat, lng } = driver.coords!;
      let entry = driverMarkers.get(driver.id);
      if (!entry) {
        entry = createDriverMarker(driver);
        driverMarkers.set(driver.id, entry);
        added.push(entry.marker);
      } else if (entry.lat !== lat || entry.lng !== lng) {
        entry.marker.position = { lat, lng };
        entry.lat = lat;
        entry.lng = lng;
        moved = true;
      }
      styleDriverMarker(entry, driver);
    }
    if (moved) algorithm.markPositionsChanged();
    if (removed.length) clusterer.removeMarkers(removed, true);
    if (added.length) clusterer.addMarkers(added, true);
    if (moved || removed.length || added.length) clusterer.render();
  }

  // ── The selected driver: larger marker and a details window ──
  let selectedMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  let selectedElement: HTMLDivElement | null = null;
  const infoWindow = new libraries.maps.InfoWindow({ maxWidth: 260, ariaLabel: "Selected driver details" });
  let infoOpen = false;
  infoWindow.addListener("closeclick", () => {
    infoOpen = false;
  });

  let areaLookup: AbortController | null = null;
  let areaKey = "";
  let areaName = "";
  let areaNamesAvailable = Boolean(lookupAreaName);
  const areaNames = new Map<string, string>();

  function selected() {
    return state.drivers.find((driver) => driver.id === state.selectedId && validCoordinates(driver.coords));
  }

  function renderInfo(driver: DriverTrackingItem) {
    const content = document.createElement("div");
    content.style.cssText = "font:12px/1.5 system-ui;color:inherit;padding:2px 4px;max-width:240px";
    for (const text of driverPopupLines(driver, state.now, areaName)) {
      const row = document.createElement("div");
      row.textContent = text;
      content.appendChild(row);
    }
    infoWindow.setContent(content);
  }

  function refreshAreaName(driver: DriverTrackingItem) {
    // About 1 km steps: a town name doesn't need more, and it keeps lookups rare while following.
    const key = `${driver.id}:${driver.coords!.lat.toFixed(2)},${driver.coords!.lng.toFixed(2)}`;
    if (key === areaKey) return;
    areaLookup?.abort();
    areaLookup = null;
    areaKey = key;
    areaName = areaNames.get(key) ?? "";
    if (areaName || !areaNamesAvailable || !lookupAreaName) return;
    const controller = new AbortController();
    areaLookup = controller;
    void lookupAreaName(driver.id, controller.signal)
      .then(({ areaName: name, available }) => {
        if (disposed || areaKey !== key) return;
        // Not set up on the server: stop asking for the rest of this visit.
        if (!available) areaNamesAvailable = false;
        areaName = name ?? "";
        if (areaNames.size >= 100) areaNames.delete(areaNames.keys().next().value!);
        areaNames.set(key, areaName);
        const current = selected();
        if (current) renderInfo(current);
      })
      .catch(() => {});
  }

  function clearSelected() {
    if (selectedMarker) selectedMarker.map = null;
    selectedMarker = null;
    selectedElement = null;
    infoWindow.close();
    infoOpen = false;
    areaLookup?.abort();
    areaLookup = null;
    areaKey = "";
    areaName = "";
  }

  let selectedId: string | null = null;
  function renderSelected() {
    const driver = selected();
    if (!driver) {
      clearSelected();
      selectedId = null;
      return;
    }
    if (selectedId !== driver.id) {
      clearSelected();
      selectedId = driver.id;
    }
    const { lat, lng } = driver.coords!;
    if (!selectedMarker || !selectedElement) {
      selectedElement = markerElement(44);
      selectedElement.style.border = "3px solid #fff";
      selectedElement.style.boxShadow = "0 0 0 3px #2563eb,0 3px 10px #0006";
      selectedMarker = new AdvancedMarkerElement({ map, position: { lat, lng }, content: selectedElement, zIndex: 5000, gmpClickable: true });
      selectedMarker.addEventListener("gmp-click", () => {
        const current = selected();
        if (!current || !selectedMarker) return;
        if (infoOpen) {
          infoWindow.close();
          infoOpen = false;
        } else {
          renderInfo(current);
          infoWindow.open({ anchor: selectedMarker, map });
          infoOpen = true;
        }
        onSelect(current);
      });
    } else {
      selectedMarker.position = { lat, lng };
    }
    selectedElement.textContent = driverInitials(driver.driver?.name);
    selectedElement.style.background = driverMarkerColor(driver, state.now);
    selectedMarker.title = `${driver.driver?.name || "Driver"}, selected, ${trackingState(driver, state.now).label}`;
    refreshAreaName(driver);
    renderInfo(driver);
  }

  const stopWatching = watchUserMapMoves(map, container, onManualPan);

  return {
    update(next) {
      if (disposed) return;
      state = next;
      renderFleet();
      renderSelected();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopWatching();
      clearSelected();
      areaNames.clear();
      clusterer.clearMarkers(true);
      clusterer.setMap(null);
      driverMarkers.clear();
    },
  };
}
