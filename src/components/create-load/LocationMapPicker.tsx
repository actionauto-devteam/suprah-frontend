"use client"

import * as React from "react"
import { Crosshair, Loader2, MapPinned, Search } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/context/ThemeContext"
import { userErrorMessage } from "@/lib/user-error"
import { BASE_MAP_PROVIDER, createBaseMap, type BaseMap, type BaseMarker, type BaseMapView } from "@/lib/base-map"
import {
  addressLine,
  foundFromAddress,
  foundFromPlace,
  PLACE_SEARCH_MIN_LENGTH,
  type Found,
  type PlaceSuggestion,
} from "@/components/create-load/map-picker-places"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ─── Create Load: "Pick on map" ──────────────────────────────────────────────
// The dispatcher searches for the place or clicks the map, then drags the pin
// to the exact spot (gate, dock, building). Location Name (for a business),
// Address, City, State, ZIP and Country are filled in; everything else on the
// stop stays for the dispatcher. The pin is saved with the load and the
// driver's "Open in Google Maps" navigates to it.
//
// Amazon Location since 2026-11-11: search and addresses come from our server
// (Amazon places), and the map is Amazon's, or Mapbox until the Amazon browser
// key is set up (lib/base-map). No Google place ID is saved any more; the
// driver navigates to the pin and address.

export const mapPickerAvailable = BASE_MAP_PROVIDER !== null

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

type Lookup = "idle" | "pending" | "empty" | "unavailable" | "failed"

const US_CENTER: Position = { lat: 39.8283, lng: -98.5795 }
const SEARCH_DELAY_MS = 350

interface LocationMapPickerProps {
  title: string
  initialPosition?: Position | null
  onClose: () => void
  onApply: (picked: PickedLocation) => void
}

export function LocationMapPicker({ title, initialPosition, onClose, onApply }: LocationMapPickerProps) {
  const { getToken } = useAuth()
  const { theme } = useTheme()
  const mapTheme = theme === "dark" ? "dark" : "light"
  // The map's box. A pop-up window adds its content a moment after it opens,
  // so the map is made once the box is on the page (2026-11-12).
  const [mapContainer, setMapContainer] = React.useState<HTMLDivElement | null>(null)
  const [pin, setPin] = React.useState<Position | null>(initialPosition ?? null)
  const [found, setFound] = React.useState<Found | null>(null)
  const [adjusted, setAdjusted] = React.useState(false)
  const [lookup, setLookup] = React.useState<Lookup>("idle")
  const [mapStatus, setMapStatus] = React.useState<{ kind: "loading" | "ready" | "error"; message?: string }>({ kind: "loading" })
  const [view, setView] = React.useState<BaseMapView>("map")

  // Search box
  const listId = React.useId()
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<PlaceSuggestion[]>([])
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [searching, setSearching] = React.useState(false)
  const [listOpen, setListOpen] = React.useState(false)
  const [searchNote, setSearchNote] = React.useState<string | null>(null)

  // Read by the map's listeners, which are set up once per map.
  const baseMapRef = React.useRef<BaseMap | null>(null)
  const markerRef = React.useRef<BaseMarker | null>(null)
  const pinRef = React.useRef<Position | null>(initialPosition ?? null)
  const foundRef = React.useRef<Found | null>(null)
  const getTokenRef = React.useRef(getToken)
  const lookupRequest = React.useRef(0)
  const searchRequest = React.useRef(0)
  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const authHeaders = React.useCallback(async () => {
    const token = await getTokenRef.current()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const updateFound = React.useCallback((next: Found | null) => {
    foundRef.current = next
    setFound(next)
  }, [])

  const lookUpAddress = React.useCallback(
    async (position: Position) => {
      const request = ++lookupRequest.current
      setLookup("pending")
      setAdjusted(false)
      try {
        const response = await apiClient.get("/api/loads/address-at", {
          params: { lat: position.lat, lng: position.lng },
          headers: await authHeaders(),
        })
        if (request !== lookupRequest.current) return
        const data = response.data?.data
        if (!data?.address) {
          updateFound(null)
          setLookup(data?.available === false ? "unavailable" : "empty")
          return
        }
        updateFound(foundFromAddress(data.address))
        setLookup("idle")
      } catch {
        if (request !== lookupRequest.current) return
        updateFound(null)
        setLookup("failed")
      }
    },
    [authHeaders, updateFound],
  )

  const showPin = React.useCallback((position: Position) => {
    pinRef.current = position
    setPin(position)
    const map = baseMapRef.current
    if (!map) return
    if (markerRef.current) markerRef.current.setPosition(position)
    else {
      const marker = map.addMarker(position, { draggable: true })
      marker.onDragEnd((next) => placePinRef.current(next))
      markerRef.current = marker
    }
  }, [])

  // A click or a drag: keep a searched address when only fine-tuning, otherwise look it up.
  const placePin = React.useCallback(
    (position: Position) => {
      showPin(position)
      const current = foundRef.current
      if (current?.source === "search" && current.exact) {
        setAdjusted(true)
        return
      }
      void lookUpAddress(position)
    },
    [lookUpAddress, showPin],
  )
  const placePinRef = React.useRef(placePin)
  React.useEffect(() => {
    placePinRef.current = placePin
  }, [placePin])

  // The map, created once; the theme and Map/Satellite change its look.
  React.useEffect(() => {
    const container = mapContainer
    if (!container) return
    let cancelled = false
    void (async () => {
      let map: BaseMap | null = null
      try {
        const start = pinRef.current
        map = await createBaseMap(container, {
          center: start ?? US_CENTER,
          zoom: start ? 17 : 4,
          theme: mapTheme,
        })
      } catch {
        map = null
      }
      if (cancelled) {
        map?.remove()
        return
      }
      if (!map) {
        setMapStatus({ kind: "error", message: "The map couldn't load. Check the connection and try again." })
        return
      }
      baseMapRef.current = map
      map.onLoadError(() => {
        if (!cancelled) setMapStatus({ kind: "error", message: "The map couldn't load. Check the connection and try again." })
      })
      map.onStyleReady(() => {
        if (!cancelled) setMapStatus({ kind: "ready" })
      })
      map.onClick((position) => placePinRef.current(position))
      if (pinRef.current) showPin(pinRef.current)
    })()
    return () => {
      cancelled = true
      markerRef.current = null
      baseMapRef.current?.remove()
      baseMapRef.current = null
    }
    // The map is made once its box exists; its look follows the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer])

  React.useEffect(() => {
    baseMapRef.current?.setLook(mapTheme, view)
  }, [mapTheme, view])

  // Search as the dispatcher types (after a short pause).
  React.useEffect(() => {
    const text = query.trim()
    const request = ++searchRequest.current
    if (text.length < PLACE_SEARCH_MIN_LENGTH) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const near = baseMapRef.current?.center()
        const response = await apiClient.get("/api/loads/place-search", {
          params: { q: text, ...(near ? { lat: near.lat, lng: near.lng } : {}) },
          headers: await authHeaders(),
        })
        if (request !== searchRequest.current) return
        const data = response.data?.data
        if (data?.available === false) {
          setResults([])
          setSearchNote("Search isn't available yet. Click the map where the driver should go.")
        } else {
          const places: PlaceSuggestion[] = Array.isArray(data?.places) ? data.places : []
          setResults(places)
          setActiveIndex(places.length ? 0 : -1)
          setListOpen(true)
          setSearchNote(places.length ? null : "Nothing found. Try another name or address, or click the map.")
        }
      } catch (error) {
        if (request !== searchRequest.current) return
        setResults([])
        setSearchNote(userErrorMessage(error, "search for that place"))
      } finally {
        if (request === searchRequest.current) setSearching(false)
      }
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [query, authHeaders])

  const choose = async (suggestion: PlaceSuggestion) => {
    setListOpen(false)
    setQuery(suggestion.title)
    searchRequest.current += 1 // Typing the title shouldn't search again.
    setSearching(false)
    lookupRequest.current += 1 // A pending pin lookup no longer applies.
    setLookup("pending")
    try {
      const response = await apiClient.get("/api/loads/place-details", {
        params: { id: suggestion.id },
        headers: await authHeaders(),
      })
      const place = response.data?.data?.place
      const next = place ? foundFromPlace(place) : null
      if (!next || !place.position) {
        setLookup("idle")
        setSearchNote("That place couldn't be loaded. Try again, or click the map where the driver should go.")
        return
      }
      updateFound(next)
      setLookup("idle")
      setAdjusted(false)
      setSearchNote(null)
      showPin(place.position)
      baseMapRef.current?.flyTo(place.position, next.exact ? 17 : 13)
    } catch (error) {
      setLookup("idle")
      setSearchNote(userErrorMessage(error, "load that place"))
    }
  }

  const onSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!listOpen || results.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1))
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault()
      void choose(results[activeIndex])
    } else if (event.key === "Escape") {
      setListOpen(false)
    }
  }

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
    })
  }

  const showList = listOpen && results.length > 0

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
          <div className="relative">
            <label htmlFor={`${listId}-input`} className="sr-only">
              Search for a business or address
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={`${listId}-input`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setListOpen(true)
              }}
              onKeyDown={onSearchKey}
              onBlur={() => window.setTimeout(() => setListOpen(false), 150)}
              onFocus={() => results.length && setListOpen(true)}
              placeholder="Search for a business or address"
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
              className="h-11 pl-9 pr-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            {showList && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Places found"
                className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
              >
                {results.map((result, index) => (
                  <li
                    key={result.id}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void choose(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${index === activeIndex ? "bg-muted" : ""}`}
                  >
                    <p className="font-medium text-foreground">{result.title}</p>
                    {result.label && result.label !== result.title && (
                      <p className="text-xs text-muted-foreground">{result.label}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {searchNote && <p className="text-xs text-muted-foreground" role="status">{searchNote}</p>}

          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <div ref={setMapContainer} className="h-[50vh] min-h-72 w-full cursor-crosshair" />
            <div className="absolute left-2 top-2 z-10 inline-flex overflow-hidden rounded-lg border border-border/70 bg-background/95 text-xs font-semibold shadow-sm" role="group" aria-label="Map style">
              {(["map", "satellite"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={`min-h-9 px-3 ${view === option ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                >
                  {option === "map" ? "Map" : "Satellite"}
                </button>
              ))}
            </div>
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
                      onClick={() => pinRef.current && void lookUpAddress(pinRef.current)}
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
