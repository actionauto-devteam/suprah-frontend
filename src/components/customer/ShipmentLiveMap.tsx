"use client"

import * as React from "react"
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Clock, Loader2, MapPin } from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/context/ThemeContext"
import { getShipmentTracking, type CustomerShipmentTracking } from "@/lib/api/customerQuoteRequests"
import { LIVE_MAP_REFRESH_MS, arrivalLine, positionLine, updatedAgo } from "@/lib/customer-shipment-tracking"
import { addMapboxRouteLayers, routeLineFeatures } from "@/lib/load-route-lines"
import { logMapProblem } from "@/lib/map-messages"
import { SUPPORT_EMAIL } from "@/lib/support-contact"
import { userErrorMessage } from "@/lib/user-error"
import { cn } from "@/lib/utils"

/*
 * The live map on My Shipments, from pickup until delivery (decided
 * 2026-11-05): where the driver carrying the customer's car is, the delivery
 * spot, the road between them and the arrival time once road routes are on.
 * It refreshes about once a minute, and only while the page is open: React
 * Query pauses the refresh when the tab or app is in the background.
 */

const MAP_STYLE_BY_THEME = {
  dark: "mapbox://styles/mapbox/navigation-night-v1",
  light: "mapbox://styles/mapbox/streets-v12",
} as const
const SOURCE = "suprah-shipment-route"
const COLORS = { driver: "#10b981", delivery: "#e11d48" } as const

function markerElement(kind: keyof typeof COLORS, title: string) {
  const element = document.createElement("div")
  const round = kind === "driver"
  element.style.cssText = `width:${round ? 22 : 26}px;height:${round ? 22 : 26}px;border-radius:${round ? "50%" : "7px"};background:${COLORS[kind]};border:3px solid #fff;color:#fff;font:800 12px/1 system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35)`
  element.textContent = kind === "delivery" ? "D" : ""
  element.title = title
  element.setAttribute("aria-hidden", "true")
  return element
}

type Point = { lat: number; lng: number }

function LiveMapCanvas({ view }: { view: CustomerShipmentTracking }) {
  const { theme } = useTheme()
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<MapboxMap | null>(null)
  const markersRef = React.useRef<{ driver?: MapboxMarker; delivery?: MapboxMarker }>({})
  const latestRef = React.useRef(view)
  const framedRef = React.useRef(false)
  const [ready, setReady] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  latestRef.current = view

  const draw = React.useCallback(async () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const current = latestRef.current
    const driver: Point | null = current.driver?.position ?? null
    const data = {
      type: "FeatureCollection",
      features: current.route ? routeLineFeatures({ ahead: current.route, later: null }, driver) : [],
    } as never
    const source = map.getSource(SOURCE) as { setData: (value: never) => void } | undefined
    if (source) source.setData(data)
    else {
      map.addSource(SOURCE, { type: "geojson", data })
      addMapboxRouteLayers(map, SOURCE, SOURCE)
    }

    const mapboxgl = (await import("mapbox-gl")).default
    if (mapRef.current !== map) return
    const place = (kind: keyof typeof COLORS, position: Point | null, title: string) => {
      const existing = markersRef.current[kind]
      if (!position) {
        existing?.remove()
        markersRef.current[kind] = undefined
        return
      }
      if (existing) existing.setLngLat([position.lng, position.lat])
      else markersRef.current[kind] = new mapboxgl.Marker({ element: markerElement(kind, title) }).setLngLat([position.lng, position.lat]).addTo(map)
    }
    place("driver", driver, "Your driver")
    place("delivery", current.delivery, "Delivery")

    // Framed once on the driver and the delivery; after that, the customer's own panning is left alone.
    const points = [driver, current.delivery].filter((point): point is Point => Boolean(point))
    if (!framedRef.current && points.length) {
      framedRef.current = true
      const lngs = points.map((point) => point.lng).concat((current.route ?? []).map((pair) => pair[0]))
      const lats = points.map((point) => point.lat).concat((current.route ?? []).map((pair) => pair[1]))
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 48, maxZoom: 13, duration: 0 },
      )
    }
  }, [])

  React.useEffect(() => {
    if (!token?.startsWith("pk.") || !containerRef.current || mapRef.current) return
    let cancelled = false
    void (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default
        if (cancelled || !containerRef.current || !mapboxgl.supported()) {
          if (!cancelled) setFailed(true)
          return
        }
        mapboxgl.accessToken = token
        const start = latestRef.current.driver?.position ?? latestRef.current.delivery ?? { lat: 39.5, lng: -111.5 }
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE_BY_THEME[theme === "dark" ? "dark" : "light"],
          center: [start.lng, start.lat],
          zoom: 9,
          attributionControl: false,
          renderWorldCopies: false,
          // On a scrolling page: one finger scrolls, two move the map.
          cooperativeGestures: true,
        })
        mapRef.current = map
        map.on("style.load", () => void draw())
        map.on("load", () => {
          if (!cancelled) setReady(true)
        })
        map.on("error", (event) => {
          logMapProblem("My Shipments live map", event?.error ?? event)
          if (!cancelled && !map.isStyleLoaded()) setFailed(true)
        })
      } catch (error) {
        logMapProblem("My Shipments live map", error)
        if (!cancelled) setFailed(true)
      }
    })()
    const markers = markersRef.current
    return () => {
      cancelled = true
      markers.driver?.remove()
      markers.delivery?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
    // The map is created once; theme and position changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  React.useEffect(() => {
    mapRef.current?.setStyle(MAP_STYLE_BY_THEME[theme === "dark" ? "dark" : "light"])
  }, [theme])

  React.useEffect(() => {
    if (ready) void draw()
  }, [ready, view, draw])

  if (!token?.startsWith("pk.") || failed) {
    return (
      <p className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        The map isn&apos;t available right now; the steps above still show how your shipment is going. If this keeps
        happening, contact Suprah AI support at {SUPPORT_EMAIL}.
      </p>
    )
  }

  return (
    <div className="relative h-56 min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:h-64">
      <div ref={containerRef} className="h-full w-full" role="img" aria-label="Map showing where your driver is and the delivery address" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted/40 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Loading the map…
        </div>
      )}
    </div>
  )
}

/** The live map section of a shipment card, while the car is on the truck. */
export function ShipmentLiveMap({ shipmentId }: { shipmentId: string }) {
  const { getToken } = useAuth()
  const [now, setNow] = React.useState(() => Date.now())
  const { data, error, isLoading } = useQuery({
    queryKey: ["shipment-tracking", shipmentId],
    queryFn: async () => getShipmentTracking(shipmentId, await getToken()),
    refetchInterval: LIVE_MAP_REFRESH_MS,
    // Only while the page is open: no refreshing in a background tab or app.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })

  // Keeps "4 min ago" current between refreshes.
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
        <Loader2 className="size-3.5 animate-spin text-emerald-500" aria-hidden="true" />
        Finding your driver on the map…
      </p>
    )
  }
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{userErrorMessage(error, "load the live map")}</span>
      </p>
    )
  }
  if (!data?.live) return null

  const position = positionLine(data.driver, now)
  const arrival = data.eta ? arrivalLine(data.eta.arrivalAt, now) : ""

  return (
    <section aria-label="Live map" className="space-y-2">
      {arrival && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Clock className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="font-bold text-foreground">{arrival}</span>
          {data.eta?.runningLate && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              Running late
            </span>
          )}
          <span className="text-xs text-muted-foreground">({updatedAgo(data.eta?.updatedAt, now)})</span>
        </div>
      )}
      {(data.driver || data.delivery) && <LiveMapCanvas view={data} />}
      <p className={cn("flex items-start gap-1.5 text-xs", position.stale ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{position.text}</span>
      </p>
    </section>
  )
}
