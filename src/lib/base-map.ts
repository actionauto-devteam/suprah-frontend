/*
 * The map drawn under Create Load's "Pick on map" and the Driver Tracker trip
 * history (2026-11-11). Amazon Location's map when its browser key is set up,
 * otherwise Mapbox, which already works on the live site, so both features
 * keep working until the Amazon setup is ready:
 *
 *   NEXT_PUBLIC_AMAZON_LOCATION_API_KEY  Amazon Location browser key, limited to
 *                                        this site's addresses and to map tiles
 *   NEXT_PUBLIC_AMAZON_LOCATION_REGION   the key's AWS region (default us-west-2)
 *
 * Amazon's map is drawn with MapLibre (open source). Its background worker is
 * served from public/vendor/maplibre-gl-<version>/, because the bundler can't
 * work out its address; tests/base-map.test.mjs checks it matches the
 * installed MapLibre after an upgrade.
 */

export type LngLat = { lat: number; lng: number }
export type BaseMapTheme = "light" | "dark"
/** "satellite" shows photos with road names, to find the right gate or dock. */
export type BaseMapView = "map" | "satellite"
export type BaseMapProvider = "amazon" | "mapbox"

const AMAZON_KEY = process.env.NEXT_PUBLIC_AMAZON_LOCATION_API_KEY?.trim() ?? ""
const AMAZON_REGION = process.env.NEXT_PUBLIC_AMAZON_LOCATION_REGION?.trim() ?? ""
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? ""

export const MAPLIBRE_VERSION = "6.16.0"
export const MAPLIBRE_WORKER_URL = `/vendor/maplibre-gl-${MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`

/** Amazon when its key is set, then Mapbox, otherwise no map. */
export function chooseBaseMap(settings: { amazonKey?: string; mapboxToken?: string }): BaseMapProvider | null {
  if (settings.amazonKey?.trim()) return "amazon"
  if (settings.mapboxToken?.trim()) return "mapbox"
  return null
}

export const BASE_MAP_PROVIDER = chooseBaseMap({ amazonKey: AMAZON_KEY, mapboxToken: MAPBOX_TOKEN })

export function amazonRegion(raw: string | undefined): string {
  const region = String(raw ?? "").trim()
  return /^[a-z]{2}(-[a-z]+)+-\d$/.test(region) ? region : "us-west-2"
}

/** Amazon Location's map style: Standard (light or dark), or Hybrid for satellite. */
export function amazonStyleUrl(options: { key: string; region: string; theme: BaseMapTheme; view: BaseMapView }): string {
  const style = options.view === "satellite" ? "Hybrid" : "Standard"
  const params = new URLSearchParams()
  if (style === "Standard") params.set("color-scheme", options.theme === "dark" ? "Dark" : "Light")
  params.set("key", options.key)
  return `https://maps.geo.${amazonRegion(options.region)}.amazonaws.com/v2/styles/${style}/descriptor?${params.toString()}`
}

/** The Mapbox styles the other maps use (customer shipment map), plus satellite. */
export function mapboxStyleUrl(theme: BaseMapTheme, view: BaseMapView): string {
  if (view === "satellite") return "mapbox://styles/mapbox/satellite-streets-v12"
  return theme === "dark" ? "mapbox://styles/mapbox/navigation-night-v1" : "mapbox://styles/mapbox/streets-v12"
}

export interface BaseMarker {
  setPosition(position: LngLat): void
  position(): LngLat
  onDragEnd(listener: (position: LngLat) => void): void
  remove(): void
}

export interface BaseMap {
  provider: BaseMapProvider
  /** Runs now if the style is loaded, and again after every style change (for drawn lines). */
  onStyleReady(listener: () => void): void
  onClick(listener: (position: LngLat) => void): void
  /** A problem before the map first loaded (for example the key was refused). */
  onLoadError(listener: () => void): void
  addMarker(position: LngLat, options?: { draggable?: boolean; color?: string; element?: HTMLElement; title?: string }): BaseMarker
  flyTo(position: LngLat, zoom: number): void
  fitTo(points: LngLat[], options?: { padding?: number; maxZoom?: number }): void
  center(): LngLat
  setLook(theme: BaseMapTheme, view: BaseMapView): void
  /** Draws or updates a line; call it from onStyleReady. */
  setLine(id: string, points: LngLat[], options: { color: string; width?: number }): void
  remove(): void
}

// The parts of MapLibre's and Mapbox's map and marker this file uses; both
// libraries share these. Their own types differ in detail, hence the casts below.
type MapEvent = { lngLat?: { lat: number; lng: number } }
type LibraryMap = {
  on(type: string, listener: (event: MapEvent) => void): unknown
  once(type: string, listener: () => void): unknown
  isStyleLoaded(): boolean | void
  flyTo(options: { center: [number, number]; zoom: number; essential?: boolean }): unknown
  fitBounds(bounds: [[number, number], [number, number]], options: { padding: number; maxZoom: number; duration: number }): unknown
  getCenter(): { lat: number; lng: number }
  setStyle(style: string): unknown
  getSource(id: string): { setData(data: object): unknown } | undefined
  addSource(id: string, source: object): unknown
  getLayer(id: string): unknown
  addLayer(layer: object): unknown
  addControl(control: unknown, position?: string): unknown
  remove(): void
}
type LibraryMarker = {
  setLngLat(position: [number, number]): LibraryMarker
  getLngLat(): { lat: number; lng: number }
  addTo(map: unknown): LibraryMarker
  on(type: string, listener: () => void): unknown
  remove(): void
}
type Library = {
  Map: new (options: object) => LibraryMap
  Marker: new (options?: object) => LibraryMarker
  NavigationControl: new (options?: object) => unknown
  AttributionControl: new (options?: object) => unknown
}

async function loadLibrary(provider: BaseMapProvider): Promise<Library> {
  if (provider === "amazon") {
    const maplibre = await import("maplibre-gl")
    await import("maplibre-gl/dist/maplibre-gl.css")
    maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL)
    return maplibre as unknown as Library
  }
  const mapboxgl = (await import("mapbox-gl")).default
  mapboxgl.accessToken = MAPBOX_TOKEN
  return mapboxgl as unknown as Library
}

const toPair = (position: LngLat): [number, number] => [position.lng, position.lat]

/** Creates the map, or returns null when no map is set up or this browser can't draw one. */
export async function createBaseMap(
  container: HTMLElement,
  options: { center: LngLat; zoom: number; theme: BaseMapTheme; view?: BaseMapView },
): Promise<BaseMap | null> {
  const provider = BASE_MAP_PROVIDER
  if (!provider) return null
  const library = await loadLibrary(provider)
  const styleFor = (theme: BaseMapTheme, view: BaseMapView) =>
    provider === "amazon" ? amazonStyleUrl({ key: AMAZON_KEY, region: AMAZON_REGION, theme, view }) : mapboxStyleUrl(theme, view)

  let look = { theme: options.theme, view: options.view ?? "map" }
  const map = new library.Map({
    container,
    style: styleFor(look.theme, look.view),
    center: toPair(options.center),
    zoom: options.zoom,
    attributionControl: false,
  })
  map.addControl(new library.NavigationControl({ showCompass: false }), "top-right")
  // The map data credit (Mapbox, OpenStreetMap, Amazon) as a small (i) button
  // that shows it when tapped (2026-11-12). Their terms require the credit on
  // the map, so it isn't removed. MapLibre (Amazon's map) opens it at first,
  // so it's closed once the map has loaded; Mapbox starts closed.
  map.addControl(new library.AttributionControl({ compact: true }), "bottom-right")
  map.once("load", () => {
    container.querySelectorAll(".maplibregl-compact-show").forEach((element) => {
      element.classList.remove("maplibregl-compact-show")
      element.removeAttribute("open")
    })
  })

  let loaded = false
  map.once("load", () => {
    loaded = true
  })

  return {
    provider,
    onStyleReady(listener) {
      map.on("style.load", () => listener())
      if (map.isStyleLoaded()) listener()
    },
    onClick(listener) {
      map.on("click", (event) => {
        if (event.lngLat) listener({ lat: event.lngLat.lat, lng: event.lngLat.lng })
      })
    },
    onLoadError(listener) {
      map.on("error", () => {
        if (!loaded) listener()
      })
    },
    addMarker(position, markerOptions = {}) {
      const marker = new library.Marker({
        draggable: Boolean(markerOptions.draggable),
        ...(markerOptions.element ? { element: markerOptions.element } : { color: markerOptions.color ?? "#059669" }),
      })
        .setLngLat(toPair(position))
        .addTo(map)
      return {
        setPosition: (next) => {
          marker.setLngLat(toPair(next))
        },
        position: () => {
          const at = marker.getLngLat()
          return { lat: at.lat, lng: at.lng }
        },
        onDragEnd: (listener) => {
          marker.on("dragend", () => {
            const at = marker.getLngLat()
            listener({ lat: at.lat, lng: at.lng })
          })
        },
        remove: () => marker.remove(),
      }
    },
    flyTo(position, zoom) {
      map.flyTo({ center: toPair(position), zoom, essential: true })
    },
    fitTo(points, fitOptions = {}) {
      if (points.length === 0) return
      const lngs = points.map((point) => point.lng)
      const lats = points.map((point) => point.lat)
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: fitOptions.padding ?? 48, maxZoom: fitOptions.maxZoom ?? 15, duration: 0 },
      )
    },
    center() {
      const at = map.getCenter()
      return { lat: at.lat, lng: at.lng }
    },
    setLook(theme, view) {
      if (look.theme === theme && look.view === view) return
      look = { theme, view }
      map.setStyle(styleFor(theme, view))
    },
    setLine(id, points, lineOptions) {
      const data = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: points.map(toPair) },
      }
      const source = map.getSource(id)
      if (source) source.setData(data)
      else map.addSource(id, { type: "geojson", data })
      if (!map.getLayer(id)) {
        map.addLayer({
          id,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": lineOptions.color, "line-width": lineOptions.width ?? 4, "line-opacity": 0.9 },
        })
      }
    },
    remove() {
      map.remove()
    },
  }
}
