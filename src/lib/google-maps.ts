import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

/*
 * Google Maps for the Driver Tracker, the Driver Page, the driver's
 * available-load map and Create Load's "Pick on map". It's used only when both
 * browser settings are present:
 *
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY  browser key, restricted to this site's
 *                                    addresses and to the Maps JavaScript API
 *                                    (plus Places API (New) for the search box)
 *   NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID   Map ID (needed for the advanced markers)
 *
 * Without them those maps keep using Mapbox, so nothing changes until the
 * Google setup is ready. Place names and addresses at a spot come from the
 * backend (server key), never from this browser key.
 */

export type GoogleMapsConfig = { apiKey: string; mapId: string };
export type MapTheme = "light" | "dark";
/** Mapbox-style [longitude, latitude], as the existing map code passes them. */
export type LngLatTuple = [number, number];

export function googleMapsConfig(): GoogleMapsConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ?? "";
  return apiKey && mapId ? { apiKey, mapId } : null;
}

export type GoogleMapsLibraries = {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
};

let optionsSet = false;
let loading: Promise<GoogleMapsLibraries> | null = null;

/** Loads the Maps JavaScript API once per page, in the browser only. */
export function loadGoogleMaps(config: GoogleMapsConfig): Promise<GoogleMapsLibraries> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps loads only in the browser."));
  if (!optionsSet) {
    // The loader accepts its options once; later calls are ignored.
    setOptions({ key: config.apiKey, v: "weekly", mapIds: [config.mapId] });
    optionsSet = true;
  }
  if (!loading) {
    loading = Promise.all([importLibrary("maps"), importLibrary("marker")]).then(([maps, marker]) => ({ maps, marker }));
    // A failed load (network, blocked script) can be retried by reopening the map.
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

let placesLoading: Promise<google.maps.PlacesLibrary> | null = null;

/**
 * Google's place search (Create Load's map picker). Needs "Places API (New)"
 * enabled for the browser key; callers treat a failure as "search unavailable".
 */
export async function loadGooglePlaces(config: GoogleMapsConfig): Promise<google.maps.PlacesLibrary> {
  await loadGoogleMaps(config);
  if (!placesLoading) {
    placesLoading = importLibrary("places");
    placesLoading.catch(() => {
      placesLoading = null;
    });
  }
  return placesLoading;
}

/** A plain { lat, lng } from any Google position value. */
export function latLngLiteral(
  position: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | google.maps.LatLngAltitudeLiteral | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!position) return null;
  const lat = typeof position.lat === "function" ? position.lat() : position.lat;
  const lng = typeof position.lng === "function" ? position.lng() : position.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// Google calls window.gm_authFailure when it rejects the key (wrong key, site
// not allowed, billing off). It carries no details; the browser console has them.
const authFailureListeners = new Set<() => void>();
let authFailed = false;
export function onGoogleMapsAuthFailure(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const target = window as typeof window & { gm_authFailure?: () => void };
  if (!target.gm_authFailure) {
    target.gm_authFailure = () => {
      authFailed = true;
      for (const notify of authFailureListeners) notify();
    };
  }
  authFailureListeners.add(listener);
  if (authFailed) queueMicrotask(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

export const GOOGLE_MAPS_KEY_REJECTED =
  "Google Maps didn't accept this site's key. Check the key's website restrictions, the Maps JavaScript API and billing in Google Cloud.";

export const toLatLng = ([lng, lat]: LngLatTuple): google.maps.LatLngLiteral => ({ lat, lng });

/**
 * The camera commands the existing map code already uses on its Mapbox map
 * (easeTo, flyTo, setCenter, setZoom, getZoom, zoomIn/zoomOut, resize, remove),
 * so the same code can drive either map.
 */
export type MapCamera = {
  easeTo(options: { center?: LngLatTuple; zoom?: number; duration?: number }): void;
  flyTo(options: { center?: LngLatTuple; zoom?: number; duration?: number; essential?: boolean }): void;
  setCenter(center: LngLatTuple): void;
  setZoom(zoom: number): void;
  getZoom(): number;
  zoomIn(options?: { duration?: number }): void;
  zoomOut(options?: { duration?: number }): void;
  /** [[west, south], [east, north]], as Mapbox takes it. */
  fitBounds(bounds: [[number, number], [number, number]], options?: { padding?: number; maxZoom?: number; duration?: number }): void;
  resize(): void;
  remove(): void;
};

export function googleMapCamera(map: google.maps.Map, container: HTMLElement, fallbackZoom = 4): MapCamera {
  let removed = false;
  const move = ({ center, zoom }: { center?: LngLatTuple; zoom?: number }) => {
    if (removed) return;
    if (zoom != null && Number.isFinite(zoom) && zoom !== map.getZoom()) map.setZoom(zoom);
    // panTo animates short moves and jumps on long ones.
    if (center) map.panTo(toLatLng(center));
  };
  const zoomBy = (delta: number) => {
    if (!removed) map.setZoom((map.getZoom() ?? fallbackZoom) + delta);
  };
  return {
    easeTo: move,
    flyTo: move,
    setCenter: (center) => {
      if (!removed) map.setCenter(toLatLng(center));
    },
    setZoom: (zoom) => {
      if (!removed) map.setZoom(zoom);
    },
    getZoom: () => map.getZoom() ?? fallbackZoom,
    zoomIn: () => zoomBy(1),
    zoomOut: () => zoomBy(-1),
    fitBounds: ([[west, south], [east, north]], options) => {
      if (removed) return;
      map.fitBounds({ west, south, east, north }, options?.padding ?? 48);
      const maxZoom = options?.maxZoom;
      if (maxZoom != null) {
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom);
        });
      }
    },
    // Google Maps follows its container's size by itself.
    resize: () => {},
    // Google Maps has no destroy call: drop its listeners and its DOM.
    remove: () => {
      if (removed) return;
      removed = true;
      google.maps.event.clearInstanceListeners(map);
      container.replaceChildren();
    },
  };
}

/**
 * A Google map in the Suprah style: no default Google buttons (the pages have
 * their own), no clickable business icons, gestures go to the map. The color
 * scheme can only be chosen when a map is created, so a theme change creates
 * the map again.
 */
export function createGoogleMap(
  libraries: GoogleMapsLibraries,
  container: HTMLElement,
  options: {
    config: GoogleMapsConfig;
    theme: MapTheme;
    center: LngLatTuple;
    zoom: number;
    gestureHandling?: "greedy" | "cooperative";
  },
): { map: google.maps.Map; camera: MapCamera } {
  const map = new libraries.maps.Map(container, {
    mapId: options.config.mapId,
    colorScheme: options.theme === "dark" ? "DARK" : "LIGHT",
    center: toLatLng(options.center),
    zoom: options.zoom,
    minZoom: 2,
    maxZoom: 20,
    disableDefaultUI: true,
    clickableIcons: false,
    keyboardShortcuts: true,
    gestureHandling: options.gestureHandling ?? "greedy",
  });
  return { map, camera: googleMapCamera(map, container, options.zoom) };
}

/**
 * Calls onUserMove when a person moves the map themselves: dragging, the
 * mouse wheel, a two-finger pinch, or the keyboard. Moves made by the code
 * (following a driver) don't count. Returns a function that stops listening.
 */
export function watchUserMapMoves(map: google.maps.Map, container: HTMLElement, onUserMove: () => void): () => void {
  const drag = map.addListener("dragstart", onUserMove);
  const wheel = () => onUserMove();
  const pinch = (event: TouchEvent) => {
    if (event.touches.length > 1) onUserMove();
  };
  const keys = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "+", "-", "="].includes(event.key)) onUserMove();
  };
  container.addEventListener("wheel", wheel, { passive: true });
  container.addEventListener("touchstart", pinch, { passive: true });
  container.addEventListener("keydown", keys);
  return () => {
    drag.remove();
    container.removeEventListener("wheel", wheel);
    container.removeEventListener("touchstart", pinch);
    container.removeEventListener("keydown", keys);
  };
}

/** Initials for a map marker, e.g. "Maria Santos" → "MS". */
export function driverInitials(name: string | null | undefined) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";
}
