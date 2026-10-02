"use client"

import * as React from "react"
import { Crosshair, Loader2, MapPinned } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  createGoogleMap,
  GOOGLE_MAPS_KEY_REJECTED,
  googleMapsConfig,
  latLngLiteral,
  loadGoogleMaps,
  loadGooglePlaces,
  onGoogleMapsAuthFailure,
  type MapCamera,
} from "@/lib/google-maps"

// ─── Create Load: "Pick on map" ──────────────────────────────────────────────
// The dispatcher searches for the place or clicks the map, then drags the pin
// to the exact spot (gate, dock, building). Location Name (for a business),
// Address, City, State, ZIP and Country are filled from Google; everything else
// on the stop stays for the dispatcher. The pin is saved with the load and the
// driver's "Open in Google Maps" navigates to it.
//
// Shown only when Google Maps is set up (lib/google-maps.ts). The search box
// needs "Places API (New)"; without it the dispatcher can still click the map.

const GOOGLE_MAPS = googleMapsConfig()
const US_CENTER: [number, number] = [-98.5795, 39.8283]

export const mapPickerAvailable = Boolean(GOOGLE_MAPS)

type Position = { lat: number; lng: number }

export type PickedLocation = {
  name: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  coordinates: Position
  placeId?: string
}

type Found = {
  source: "search" | "map"
  name: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  placeId?: string
  /** A searched street address or business: kept when the pin is fine-tuned. */
  exact: boolean
}

type Lookup = "idle" | "pending" | "empty" | "unavailable" | "failed"

function fromPlace(place: google.maps.places.Place): Found {
  const components = place.addressComponents ?? []
  const part = (type: string, short = false) => {
    const match = components.find((component) => component.types.includes(type))
    return ((short ? match?.shortText : match?.longText) ?? "").trim()
  }
  const street = [part("street_number"), part("route", true)].filter(Boolean).join(" ")
  const types = place.types ?? []
  const business = types.includes("establishment") || types.includes("point_of_interest")
  return {
    source: "search",
    name: business ? (place.displayName ?? "").trim() : "",
    address: street,
    city:
      part("locality") ||
      part("postal_town") ||
      part("sublocality") ||
      part("administrative_area_level_3") ||
      part("neighborhood"),
    state: part("administrative_area_level_1", true),
    zip: part("postal_code"),
    country: part("country", true),
    placeId: place.id,
    exact: Boolean(street) || business,
  }
}

const addressLine = (found: Found) =>
  [found.address, found.city, [found.state, found.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")

interface LocationMapPickerProps {
  title: string
  initialPosition?: Position | null
  onClose: () => void
  onApply: (picked: PickedLocation) => void
}

export function LocationMapPicker({ title, initialPosition, onClose, onApply }: LocationMapPickerProps) {
  const { getToken } = useAuth()
  const { theme } = useTheme()
  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const searchRef = React.useRef<HTMLDivElement | null>(null)
  const [pin, setPin] = React.useState<Position | null>(initialPosition ?? null)
  const [found, setFound] = React.useState<Found | null>(null)
  const [adjusted, setAdjusted] = React.useState(false)
  const [lookup, setLookup] = React.useState<Lookup>("idle")
  const [mapStatus, setMapStatus] = React.useState<{ kind: "loading" | "ready" | "error"; message?: string }>({ kind: "loading" })
  const [searchNote, setSearchNote] = React.useState<string | null>(null)

  // Read by the map's event listeners, which are set up once per map.
  const pinRef = React.useRef<Position | null>(initialPosition ?? null)
  const foundRef = React.useRef<Found | null>(null)
  const getTokenRef = React.useRef(getToken)
  const lookUpAtPinRef = React.useRef<(() => void) | null>(null)
  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    const config = GOOGLE_MAPS
    const container = mapRef.current
    const searchContainer = searchRef.current
    if (!config || !container) return
    let cancelled = false
    let camera: MapCamera | null = null
    let lookupRequest = 0

    const updateFound = (next: Found | null) => {
      foundRef.current = next
      setFound(next)
    }

    const stopAuthWatch = onGoogleMapsAuthFailure(() => {
      if (!cancelled) setMapStatus({ kind: "error", message: GOOGLE_MAPS_KEY_REJECTED })
    })

    const lookUpAddress = async (position: Position) => {
      const request = ++lookupRequest
      setLookup("pending")
      setAdjusted(false)
      try {
        const token = await getTokenRef.current()
        const response = await apiClient.get("/api/loads/address-at", {
          params: { lat: position.lat, lng: position.lng },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (cancelled || request !== lookupRequest) return
        const data = response.data?.data
        const address = data?.address
        if (!address) {
          updateFound(null)
          setLookup(data?.available === false ? "unavailable" : "empty")
          return
        }
        updateFound({
          source: "map",
          name: "",
          address: String(address.address ?? ""),
          city: String(address.city ?? ""),
          state: String(address.state ?? ""),
          zip: String(address.zip ?? ""),
          country: String(address.country ?? ""),
          placeId: undefined,
          exact: false,
        })
        setLookup("idle")
      } catch {
        if (cancelled || request !== lookupRequest) return
        updateFound(null)
        setLookup("failed")
      }
    }

    void (async () => {
      let libraries
      try {
        libraries = await loadGoogleMaps(config)
      } catch {
        if (!cancelled) setMapStatus({ kind: "error", message: "Google Maps couldn't load. Check the connection and try again." })
        return
      }
      if (cancelled || !mapRef.current) return

      const start = pinRef.current
      const created = createGoogleMap(libraries, mapRef.current, {
        config,
        theme: theme === "dark" ? "dark" : "light",
        center: start ? [start.lng, start.lat] : US_CENTER,
        zoom: start ? 18 : 4,
      })
      camera = created.camera
      const map = created.map
      // Satellite helps find the right gate or dock.
      map.setOptions({
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: { mapTypeIds: ["roadmap", "hybrid"] },
        draggableCursor: "crosshair",
      })
      const marker = new libraries.marker.AdvancedMarkerElement({
        map: start ? map : null,
        position: start,
        gmpDraggable: true,
        title: "Drag to the exact spot",
      })

      const placePin = (position: Position) => {
        marker.position = position
        marker.map = map
        pinRef.current = position
        setPin(position)
        const current = foundRef.current
        if (current?.source === "search" && current.exact) {
          // Fine-tuning a searched address or business: keep its address; the
          // driver navigates to the pin, so Google's place ID no longer applies.
          updateFound({ ...current, placeId: undefined })
          setAdjusted(true)
          return
        }
        void lookUpAddress(position)
      }
      lookUpAtPinRef.current = () => {
        if (pinRef.current) void lookUpAddress(pinRef.current)
      }

      marker.addEventListener("gmp-dragend", () => {
        const position = latLngLiteral(marker.position)
        if (position) placePin(position)
      })
      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        const position = event.latLng?.toJSON()
        if (position) placePin(position)
      })
      map.addListener("tilesloaded", () => {
        if (!cancelled) setMapStatus({ kind: "ready" })
      })

      // Search box (Places API (New)).
      let places: google.maps.PlacesLibrary
      try {
        places = await loadGooglePlaces(config)
      } catch {
        if (!cancelled) setSearchNote("Search isn't available yet. Click the map where the driver should go.")
        return
      }
      if (cancelled || !searchContainer) return
      const search = new places.PlaceAutocompleteElement({ includedRegionCodes: ["us"] })
      search.style.width = "100%"
      searchContainer.replaceChildren(search)
      search.addEventListener("gmp-select", (event) => {
        void (async () => {
          try {
            const place = event.placePrediction.toPlace()
            await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location", "addressComponents", "types"] })
            if (cancelled) return
            lookupRequest += 1 // A pending pin lookup no longer applies.
            const next = fromPlace(place)
            updateFound(next)
            setLookup("idle")
            setAdjusted(false)
            setSearchNote(null)
            const position = latLngLiteral(place.location)
            if (!position) return
            marker.position = position
            marker.map = map
            pinRef.current = position
            setPin(position)
            map.panTo(position)
            map.setZoom(next.exact ? 18 : 13)
          } catch {
            if (!cancelled) setSearchNote("That place couldn't be loaded. Try again, or click the map where the driver should go.")
          }
        })()
      })
    })()

    return () => {
      cancelled = true
      stopAuthWatch()
      lookUpAtPinRef.current = null
      searchContainer?.replaceChildren()
      camera?.remove()
    }
  }, [theme])

  const busy = lookup === "pending"
  const apply = () => {
    if (!pin) return
    onApply({
      name: found?.name ?? "",
      address: found?.address ?? "",
      city: found?.city ?? "",
      state: found?.state ?? "",
      zip: found?.zip ?? "",
      country: found?.country ?? "",
      coordinates: { lat: Number(pin.lat.toFixed(7)), lng: Number(pin.lng.toFixed(7)) },
      placeId: found?.placeId,
    })
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="size-5" /> {title}
          </DialogTitle>
          <DialogDescription>
            Search for the place, or click the map. Then drag the pin to the exact spot the driver should go, such as
            the gate or dock. The address fields are filled for you and stay editable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div ref={searchRef} className="min-h-10" aria-label="Search for a place" />
          {searchNote && <p className="text-xs text-muted-foreground">{searchNote}</p>}

          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <div ref={mapRef} className="h-[50vh] min-h-72 w-full" />
            {mapStatus.kind !== "ready" && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 px-4 text-center" role="status">
                {mapStatus.kind === "loading" ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading the map…
                  </span>
                ) : (
                  <span className="max-w-sm text-sm text-muted-foreground">{mapStatus.message}</span>
                )}
              </div>
            )}
          </div>

          <div className="min-h-16 rounded-xl border border-border/60 bg-muted/10 p-3 text-sm" aria-live="polite">
            {!pin ? (
              <p className="text-muted-foreground">No spot picked yet.</p>
            ) : busy ? (
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Looking up the address…
              </p>
            ) : found ? (
              <div className="space-y-1">
                {found.name && <p className="font-semibold">{found.name}</p>}
                <p>{addressLine(found) || "No street address at this spot."}</p>
                {adjusted && (
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <Crosshair className="size-3.5 text-primary" />
                    Pin moved to the exact spot. The address above stays; the driver navigates to the pin.
                    <button
                      type="button"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                      onClick={() => lookUpAtPinRef.current?.()}
                    >
                      Use the address at the pin instead
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {lookup === "idle"
                  ? "This is the saved pin. Drag it, click the map or search to move it."
                  : lookup === "unavailable"
                  ? "Addresses can't be looked up yet. The pin will be saved; fill in the address fields yourself."
                  : lookup === "failed"
                    ? "The address lookup didn't work. The pin will be saved; check the address fields."
                    : "No street address was found at this spot. The pin will be saved; fill in the address fields yourself."}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={apply} disabled={!pin || busy}>
            Use this spot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
