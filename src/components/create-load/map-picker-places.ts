// What Create Load's "Pick on map" shows and fills in from our server's
// Amazon Location answers (2026-11-11).

/** Search starts after this many characters. */
export const PLACE_SEARCH_MIN_LENGTH = 3

export type PlaceSuggestion = { id: string; title: string; label: string }

export type Found = {
  source: "search" | "map"
  name: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  /** A searched street address or business: kept when the pin is fine-tuned. */
  exact: boolean
}

type AddressFields = { address?: unknown; city?: unknown; state?: unknown; zip?: unknown; country?: unknown }
type PlaceFields = AddressFields & { name?: unknown; exact?: unknown }

const text = (value: unknown) => String(value ?? "").trim()

/** The address at a clicked or dragged pin (GET /api/loads/address-at). No business name: the pin may be beside one. */
export function foundFromAddress(address: AddressFields): Found {
  return {
    source: "map",
    name: "",
    address: text(address.address),
    city: text(address.city),
    state: text(address.state),
    zip: text(address.zip),
    country: text(address.country),
    exact: false,
  }
}

/** A place chosen from the search box (GET /api/loads/place-details). */
export function foundFromPlace(place: PlaceFields): Found {
  return {
    source: "search",
    name: text(place.name),
    address: text(place.address),
    city: text(place.city),
    state: text(place.state),
    zip: text(place.zip),
    country: text(place.country),
    exact: place.exact === true,
  }
}

/** "100 State St, Orem, UT 84058" */
export const addressLine = (found: Pick<Found, "address" | "city" | "state" | "zip">) =>
  [found.address, found.city, [found.state, found.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
