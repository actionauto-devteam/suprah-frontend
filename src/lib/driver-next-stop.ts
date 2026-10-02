import { apiClient } from "@/lib/api-client";
import { distanceMiles } from "@/lib/driver-load-compatibility";
import { placeAddressText, placePin, type LoadPlace } from "@/lib/load-navigation";

export type StopPosition = { lat: number; lng: number };

const validPosition = (value: unknown): StopPosition | null => {
  const item = value as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(item?.lat);
  const lng = Number(item?.lng);
  return item && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

/**
 * Where a load stop is on the map, most exact first: the pin the dispatcher
 * placed in Create Load, then Google (backend, server key), then Mapbox's
 * geocoder while the maps still run on Mapbox. Null when none can place it.
 */
export async function resolveStopPosition(
  place: LoadPlace,
  options: { getToken: () => Promise<string | null | undefined>; mapboxToken?: string | null },
): Promise<StopPosition | null> {
  const pin = placePin(place);
  if (pin) return pin;
  const query = placeAddressText(place);
  if (!query) return null;

  try {
    const token = await options.getToken();
    if (token) {
      const response = await apiClient.get("/api/driver-tracking/places/lookup", {
        params: { q: query.slice(0, 200) },
        headers: { Authorization: `Bearer ${token}` },
      });
      const position = validPosition(response.data?.data?.position);
      if (position) return position;
    }
  } catch {
    // Falls back to Mapbox below.
  }

  const mapboxToken = options.mapboxToken?.trim();
  if (mapboxToken) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1&country=US`,
      );
      const json = await response.json();
      const center = json?.features?.[0]?.center;
      if (Array.isArray(center)) return validPosition({ lng: center[0], lat: center[1] });
    } catch {
      // No position: the stop is listed under the map without a pin.
    }
  }
  return null;
}

/**
 * Wider than the continental US. A driver and a stop further apart than this
 * (a phone tested abroad, a bad address) aren't framed together or joined by
 * a line: one view would span the globe and the line would wrap the wrong way.
 */
export const MAX_STOP_LINE_MILES = 3000;

export function withinTripRange(from: StopPosition, to: StopPosition): boolean {
  return distanceMiles(from, to) <= MAX_STOP_LINE_MILES;
}

/** "20 s", "3 min", "2 h" for the GPS status chip. */
export function formatShortAge(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.round(seconds));
  if (wholeSeconds < 60) return `${wholeSeconds} s`;
  const minutes = Math.round(wholeSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(wholeSeconds / 3600)} h`;
}

/** "About 12 mi away (straight line)". Road distance needs routing, a later phase. */
export function describeStopDistance(from: StopPosition | null | undefined, to: StopPosition | null | undefined): string | null {
  if (!from || !to) return null;
  const miles = distanceMiles(from, to);
  if (miles < 0.2) return "Less than 0.2 mi away (straight line)";
  return `About ${miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString("en-US")} mi away (straight line)`;
}
