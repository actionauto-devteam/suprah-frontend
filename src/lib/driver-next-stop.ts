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

type PlaceLookupOptions = { getToken: () => Promise<string | null | undefined>; mapboxToken?: string | null };

/**
 * Where a load stop is on the map, most exact first: the pin the dispatcher
 * placed in Create Load, then the address looked up (lookupPlacePosition).
 * Null when it can't be placed.
 */
export async function resolveStopPosition(place: LoadPlace, options: PlaceLookupOptions): Promise<StopPosition | null> {
  const pin = placePin(place);
  if (pin) return pin;
  const query = placeAddressText(place);
  return query ? lookupPlacePosition(query, options) : null;
}

/**
 * Where a US place or address is (2026-11-12): the server's place service
 * first (Amazon Location once it's switched on, Google until then). Mapbox's
 * geocoder in the browser only when the server has no place service set up or
 * can't be reached, so with Amazon on every lookup goes through Amazon.
 */
export async function lookupPlacePosition(query: string, options: PlaceLookupOptions): Promise<StopPosition | null> {
  const text = query.trim();
  if (!text) return null;
  try {
    const token = await options.getToken();
    if (token) {
      const response = await apiClient.get("/api/driver-tracking/places/lookup", {
        params: { q: text.slice(0, 200) },
        headers: { Authorization: `Bearer ${token}` },
      });
      const position = validPosition(response.data?.data?.position);
      if (position) return position;
      // The server's service answered and found nothing: no second lookup.
      if (response.data?.data?.available !== false) return null;
    }
  } catch {
    // Falls back to Mapbox below.
  }

  const mapboxToken = options.mapboxToken?.trim();
  if (mapboxToken) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1&country=US`,
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
