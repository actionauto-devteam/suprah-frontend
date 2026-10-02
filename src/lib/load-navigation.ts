export type LoadPlace = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  /** Exact spot picked on the map in Create Load. */
  coordinates?: { lat?: number | null; lng?: number | null } | null;
  /** Google's place ID when the spot is the searched place itself. */
  placeId?: string | null;
} | null | undefined;

export type LoadNavigationTarget = {
  stop: "pickup" | "delivery";
  label: string;
  url: string;
};

type NavigableLoad = {
  status?: string | null;
  pickupLocation?: LoadPlace;
  deliveryLocation?: LoadPlace;
} | null | undefined;

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** "1234 Main St, Dallas, TX 75201" from a load stop. */
export function placeAddressText(place: LoadPlace): string {
  return [clean(place?.address), clean(place?.city), [clean(place?.state), clean(place?.zip)].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

/** The stop's exact pin, when the dispatcher placed one. */
export function placePin(place: LoadPlace): { lat: number; lng: number } | null {
  const lat = Number(place?.coordinates?.lat);
  const lng = Number(place?.coordinates?.lng);
  return place?.coordinates && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

/**
 * The stop the driver's map shows: the pickup while the load is Assigned or
 * Accepted, the delivery while Picked Up or In-Transit. Unlike navigation, an
 * Assigned load counts, so the driver can see where the pickup is before
 * accepting.
 */
export function nextStopForMap(load: NavigableLoad): { kind: "pickup" | "delivery"; place: LoadPlace } | null {
  if (!load) return null;
  const status = String(load.status ?? "");
  if (status === "Assigned" || status === "Accepted") return { kind: "pickup", place: load.pickupLocation };
  if (status === "Picked Up" || status === "In-Transit") return { kind: "delivery", place: load.deliveryLocation };
  return null;
}

/**
 * Where the driver should navigate next (business rule, 2026-09-30): the
 * pickup once the load is Accepted, the delivery while Picked Up or
 * In-Transit. Nothing for other statuses. Uses Google Maps URLs, which need no
 * API key, open the Google Maps app on phones, and start from the phone's own
 * location, so no GPS is added to the link.
 *
 * Most exact first: Google's place ID (the searched place, unmoved), then the
 * pin the dispatcher placed (a gate or dock), then the typed address.
 */
export function loadNavigationTarget(load: NavigableLoad): LoadNavigationTarget | null {
  if (!load) return null;
  const status = String(load.status ?? "");
  const stop = status === "Accepted" ? "pickup" : status === "Picked Up" || status === "In-Transit" ? "delivery" : null;
  if (!stop) return null;

  const place = stop === "pickup" ? load.pickupLocation : load.deliveryLocation;
  const address = placeAddressText(place);
  const pinned = placePin(place);
  const pin = pinned ? `${pinned.lat.toFixed(6)},${pinned.lng.toFixed(6)}` : "";
  const placeId = clean(place?.placeId);

  let target: string;
  if (placeId && (address || pin)) {
    target = `destination=${encodeURIComponent(address || pin)}&destination_place_id=${encodeURIComponent(placeId)}`;
  } else if (pin) {
    target = `destination=${encodeURIComponent(pin)}`;
  } else if (address) {
    target = `destination=${encodeURIComponent(address)}`;
  } else {
    return null;
  }

  return {
    stop,
    label: stop === "pickup" ? "Open pickup in Google Maps" : "Open delivery in Google Maps",
    url: `https://www.google.com/maps/dir/?api=1&${target}&travelmode=driving&dir_action=navigate`,
  };
}

export const GOOGLE_MAPS_TRUCK_NOTE =
  "Google Maps directions don't check truck height, weight or hazmat limits. Follow posted restrictions.";
