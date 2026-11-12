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
  /** The map data credit as plain text, shown under the map (mapCreditText). */
  credit(): string
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
  // No credit button on the map: the page shows the credit as plain text under
  // it (mapCreditText, 2026-11-12).

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
    credit() {
      return mapCreditText(map as unknown as StyledSources, provider)
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

// ─── The live maps (2026-11-12) ──────────────────────────────────────────────
// Driver Tracker, the driver's dashboard and the available-load map draw their
// own layers, so they take the map library itself: MapLibre with Amazon's
// style when its key is set, otherwise Mapbox, the same choice as above. Both
// libraries share the calls those maps make. Google is no longer used.

export type LiveMapLibrary = typeof import("mapbox-gl").default
export const LIVE_MAP_PROVIDER: BaseMapProvider | null = BASE_MAP_PROVIDER

let liveLibrary: Promise<LiveMapLibrary> | null = null

/** The live maps' library, loaded once; null when no map is set up. */
export function loadLiveMapLibrary(): Promise<LiveMapLibrary> | null {
  if (!BASE_MAP_PROVIDER) return null
  if (!liveLibrary) liveLibrary = loadLibrary(BASE_MAP_PROVIDER).then((library) => library as unknown as LiveMapLibrary)
  return liveLibrary
}

/** A live map's style: Amazon's when its key is set, otherwise that map's own Mapbox style. */
export function liveMapStyle(theme: BaseMapTheme, mapboxStyles: { light: string; dark: string }): string {
  return BASE_MAP_PROVIDER === "amazon"
    ? amazonStyleUrl({ key: AMAZON_KEY, region: AMAZON_REGION, theme, view: "map" })
    : mapboxStyles[theme]
}

type StyledMap = { getStyle?: () => { layers?: Array<{ type?: string; layout?: Record<string, unknown> }> } | undefined }

// Style expressions start with one of these; a font list never does.
const EXPRESSION_OPERATORS = new Set(["get", "literal", "step", "match", "case", "coalesce", "interpolate", "array", "string", "concat", "format"])

/** The font list a map style uses for its own labels, or undefined when it has none. */
export function styleTextFont(map: StyledMap): string[] | undefined {
  for (const layer of map.getStyle?.()?.layers ?? []) {
    let font = layer.type === "symbol" ? layer.layout?.["text-font"] : undefined
    if (Array.isArray(font) && font[0] === "literal" && Array.isArray(font[1])) font = font[1]
    if (!Array.isArray(font) || font.length === 0 || EXPRESSION_OPERATORS.has(font[0])) continue
    if (font.every((name) => typeof name === "string")) return font as string[]
  }
  return undefined
}

/**
 * The font for labels drawn on a live map (cluster counts, driver initials).
 * Amazon's map only has its own fonts, so those labels use the style's font
 * there; Mapbox keeps its default.
 */
export function liveMapLabelFont(map: StyledMap): string[] | undefined {
  return BASE_MAP_PROVIDER === "amazon" ? styleTextFont(map) : undefined
}

// ─── The map data credit (2026-11-12) ────────────────────────────────────────
// The map providers' terms (Mapbox, OpenStreetMap, Amazon) require their
// credit with the map. Instead of the (i) button on the map, which people
// tapped by accident, it's a plain line of text under the map: nothing to
// click, and nothing covering the map.

// Any map with a style (Mapbox or MapLibre); only the sources' credits are read.
type StyledSources = { getStyle?: () => unknown }

const DEFAULT_CREDIT: Record<BaseMapProvider, string> = {
  mapbox: "© Mapbox © OpenStreetMap",
  amazon: "© Amazon Location Service © OpenStreetMap",
}

const ENTITIES: Record<string, string> = { "&copy;": "©", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " }

/** The loaded style's credit as plain text, without links or "Improve this map"; the provider's usual credit until the style has loaded. */
export function mapCreditText(map: StyledSources | null | undefined, provider: BaseMapProvider | null = BASE_MAP_PROVIDER): string {
  const parts: string[] = []
  const style = map?.getStyle?.() as { sources?: Record<string, { attribution?: unknown } | undefined> } | undefined
  const sources = style?.sources ?? {}
  for (const source of Object.values(sources)) {
    const html = typeof source?.attribution === "string" ? source.attribution : ""
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ")
      .replace(/improve this map/gi, " ")
    for (const piece of text.split("©")) {
      const name = piece.replace(/\s+/g, " ").trim()
      if (name && !parts.includes(name)) parts.push(name)
    }
  }
  if (parts.length > 0) return parts.map((name) => `© ${name}`).join(" ")
  return provider ? DEFAULT_CREDIT[provider] : ""
}
