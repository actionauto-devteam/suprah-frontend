"use client"

import * as React from "react"
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Clock, Loader2, LocateFixed, MapPin, Minus, Navigation, Plus } from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { useTheme } from "@/context/ThemeContext"
import { getShipmentTracking, type CustomerShipmentTracking } from "@/lib/api/customerQuoteRequests"
import {
  CUSTOMER_LOCATION_EVENT,
  FOLLOW_ZOOM,
  LIVE_MAP_REFRESH_MS,
  arrivalLine,
  liveMapCamera,
  positionLine,
  updatedAgo,
  withLivePosition,
  type LivePositionUpdate,
} from "@/lib/customer-shipment-tracking"
import { stopsFollowing } from "@/lib/map-follow"
import { addMapCredit } from "@/lib/base-map"
import { withinTripRange } from "@/lib/driver-next-stop"
import { initializeSocket } from "@/lib/socket.client"
import { addMapboxRouteLayers, routeLineFeatures } from "@/lib/load-route-lines"
import { logMapProblem } from "@/lib/map-messages"
import { SUPPORT_EMAIL } from "@/lib/support-contact"
import { userErrorMessage } from "@/lib/user-error"
import { cn } from "@/lib/utils"

/*
 * The live map on My Shipments, from pickup until delivery (decided
 * 2026-11-05): where the driver carrying the customer's car is, the delivery
 * point (a red "D", like Driver Tracker), the road between them and the
 * arrival time once road routes are on. Until then a dashed line joins the
 * driver to the delivery point, as Driver Tracker does with the next stop.
 * The driver moves the moment their phone reports a new position; a refresh
 * about once a minute, only while the page is open, catches anything missed.
 *
 * The map follows the driver, like a ride-hailing app, until the customer
 * drags it to look around; Follow driver brings it back (2026-11-06). It moves
 * freely with one finger or the mouse, with no "ctrl + scroll" or "two
 * fingers" note covering it, and has + and − buttons big enough for a phone.
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

/** The driver, the delivery point and the road between them, for framing the map. */
function framingBounds(view: CustomerShipmentTracking): [[number, number], [number, number]] | null {
  const points = [view.driver?.position ?? null, view.delivery].filter((point): point is Point => Boolean(point))
  const lngs = points.map((point) => point.lng).concat((view.route ?? []).map((pair) => pair[0]))
  const lats = points.map((point) => point.lat).concat((view.route ?? []).map((pair) => pair[1]))
  if (!lngs.length) return null
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

function LiveMapCanvas({ view }: { view: CustomerShipmentTracking }) {
  const { theme } = useTheme()
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<MapboxMap | null>(null)
  const markersRef = React.useRef<{ driver?: MapboxMarker; delivery?: MapboxMarker }>({})
  const latestRef = React.useRef(view)
  // Follows the driver until the customer drags the map to look around.
  const [following, setFollowing] = React.useState(true)
  const followingRef = React.useRef(true)
  // Centred on the driver once since following (re)started; delivery point
  // shown once while the driver's location is on its way.
  const startedRef = React.useRef(false)
  const deliveryShownRef = React.useRef(false)
  // The customer's own drag or zoom is under way: following waits for it.
  const gestureRef = React.useRef(false)
  const [ready, setReady] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  latestRef.current = view

  const moveCamera = React.useCallback((map: MapboxMap, animate: boolean) => {
    const current = latestRef.current
    const move = liveMapCamera({
      following: followingRef.current,
      started: startedRef.current,
      driver: current.driver?.position ?? null,
      delivery: current.delivery,
      deliveryShown: deliveryShownRef.current,
      currentZoom: map.getZoom(),
    })
    if (!move || gestureRef.current) return
    // Animations are skipped for people who turned on reduced motion.
    if (move.zoom === undefined) {
      map.easeTo({ center: move.center, duration: 1000 })
      return
    }
    if (move.target === "driver") startedRef.current = true
    else deliveryShownRef.current = true
    if (animate) map.easeTo({ center: move.center, zoom: move.zoom, duration: 600 })
    else map.jumpTo({ center: move.center, zoom: move.zoom })
  }, [])

  const setFollowingMode = React.useCallback(
    (on: boolean) => {
      if (!on && !followingRef.current) return
      followingRef.current = on
      setFollowing(on)
      const map = mapRef.current
      if (!map) return
      // While following, zooming keeps the driver in the middle of the map.
      const zoomOptions = on ? ({ around: "center" } as const) : undefined
      map.scrollZoom.disable()
      map.scrollZoom.enable(zoomOptions)
      map.touchZoomRotate.enable(zoomOptions)
      if (on) {
        startedRef.current = false
        moveCamera(map, true)
      }
    },
    [moveCamera],
  )

  const draw = React.useCallback(async () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const current = latestRef.current
    const driver: Point | null = current.driver?.position ?? null
    // Without a road route, a dashed line to the delivery point (on a trip scale only).
    const directLine =
      !current.route && driver && current.delivery && withinTripRange(driver, current.delivery)
        ? [{ type: "Feature", properties: { kind: "route-later" }, geometry: { type: "LineString", coordinates: [[driver.lng, driver.lat], [current.delivery.lng, current.delivery.lat]] } }]
        : []
    const data = {
      type: "FeatureCollection",
      features: current.route ? routeLineFeatures({ ahead: current.route, later: null }, driver) : directLine,
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
    place("delivery", current.delivery, "Delivery point")

    // Follows the driver (straight there the first time, gliding after);
    // once the customer looks around, their view is left alone.
    moveCamera(map, false)
  }, [moveCamera])

  // "Show both" frames the driver and the delivery point, so it stops following.
  const showOverview = React.useCallback(() => {
    if (latestRef.current.driver) setFollowingMode(false)
    const bounds = framingBounds(latestRef.current)
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: FOLLOW_ZOOM, duration: 600 })
  }, [setFollowingMode])

  const zoomBy = React.useCallback((step: 1 | -1, event: React.MouseEvent) => {
    const map = mapRef.current
    // Passing the click marks it as the customer's zoom, so following waits for it.
    if (step > 0) map?.zoomIn(undefined, { originalEvent: event.nativeEvent })
    else map?.zoomOut(undefined, { originalEvent: event.nativeEvent })
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
        const first = latestRef.current
        const start = first.driver?.position ?? first.delivery ?? { lat: 39.5, lng: -111.5 }
        let startZoom = 9
        if (first.driver) startZoom = FOLLOW_ZOOM
        else if (first.delivery) startZoom = 12
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: MAP_STYLE_BY_THEME[theme === "dark" ? "dark" : "light"],
          center: [start.lng, start.lat],
          zoom: startZoom,
          attributionControl: false,
          renderWorldCopies: false,
          // Moves with one finger or the mouse, with no "ctrl + scroll" or
          // "two fingers" note over it. North stays up: no turning or tilting.
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          // Following starts on, so zooming keeps the driver in the middle.
          scrollZoom: { around: "center" },
          touchZoomRotate: { around: "center" },
        })
        map.touchZoomRotate.disableRotation()
        // The quiet (i) map credit Mapbox requires, beside the logo and clear
        // of the buttons at the bottom right (2026-11-12).
        addMapCredit(map, mapboxgl, "bottom-left")
        map.keyboard.disableRotation()
        mapRef.current = map
        map.on("dragstart", (event) => {
          if (event.originalEvent) gestureRef.current = true
          if (stopsFollowing(event.originalEvent)) setFollowingMode(false)
        })
        // The map's types leave it out, but a zoom the customer makes carries its event.
        map.on("zoomstart", (event) => {
          if ((event as { originalEvent?: Event }).originalEvent) gestureRef.current = true
        })
        // Arrow keys move the map the way a drag does.
        map.on("movestart", (event) => {
          const original = event.originalEvent as Event | undefined
          if (original?.type === "keydown" && stopsFollowing(original as KeyboardEvent)) setFollowingMode(false)
        })
        map.on("moveend", () => {
          gestureRef.current = false
        })
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
    <div className="space-y-1.5">
      <div className="relative h-56 min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:h-64">
        <div ref={containerRef} className="h-full w-full" role="img" aria-label="Map showing where your driver is and the delivery point" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-muted/40 text-xs text-muted-foreground" role="status">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Loading the map…
          </div>
        )}
        {ready && (
          <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-background/90 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={(event) => zoomBy(1, event)}
              className="flex size-9 items-center justify-center text-foreground hover:bg-muted max-sm:size-11"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <span aria-hidden="true" className="h-px bg-border/60" />
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={(event) => zoomBy(-1, event)}
              className="flex size-9 items-center justify-center text-foreground hover:bg-muted max-sm:size-11"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {ready && (view.driver || view.delivery) && (
          <div className="absolute bottom-2 right-2 z-10 flex flex-wrap justify-end gap-1.5">
            {(view.delivery || !view.driver) && (
              <button
                type="button"
                onClick={showOverview}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 px-2.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm hover:bg-background max-sm:min-h-11"
              >
                <LocateFixed className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {view.driver ? "Show both" : "Show delivery point"}
              </button>
            )}
            {view.driver && (
              // Says "Following driver" with a live dot while the map follows
              // them, so it's clear it's on (2026-11-10).
              <button
                type="button"
                aria-pressed={following}
                title={following ? "Stop following your driver" : "Follow your driver"}
                onClick={() => setFollowingMode(!following)}
                className={cn(
                  "flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm backdrop-blur-sm max-sm:min-h-11",
                  following
                    ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                    : "border-border/60 bg-background/90 text-foreground hover:bg-background",
                )}
              >
                {following ? (
                  <span className="relative flex size-2 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex size-full rounded-full bg-white opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-white" />
                  </span>
                ) : (
                  <Navigation className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                )}
                {following ? "Following driver" : "Follow driver"}
              </button>
            )}
          </div>
        )}
      </div>
      {ready && view.driver && !following && (
        <p role="status" className="text-xs text-muted-foreground">
          The map stopped following your driver while you look around. Tap or click Follow driver to go back to them.
        </p>
      )}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Map key">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-full border-2 border-white shadow-sm" style={{ background: COLORS.driver }} />
          Your driver
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-[4px] border-2 border-white text-[11px] font-black leading-none text-white shadow-sm" style={{ background: COLORS.delivery }}>
            D
          </span>
          {view.delivery ? "Delivery point" : "Delivery point (not on the map yet)"}
        </li>
      </ul>
    </div>
  )
}

/** The live map section of a shipment card, while the car is on the truck. */
export function ShipmentLiveMap({ shipmentId }: { shipmentId: string }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [now, setNow] = React.useState(() => Date.now())
  const queryKey = React.useMemo(() => ["shipment-tracking", shipmentId], [shipmentId])
  const { data, error, isLoading } = useQuery({
    queryKey,
    queryFn: async () => getShipmentTracking(shipmentId, await getToken()),
    refetchInterval: LIVE_MAP_REFRESH_MS,
    // Only while the page is open: no refreshing in a background tab or app.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
  })

  // The driver moves the moment their phone reports a new position; after a
  // reconnect, the latest is fetched in case some were missed.
  React.useEffect(() => {
    let active = true
    let socket: ReturnType<typeof initializeSocket> | null = null
    const onPosition = (update: LivePositionUpdate) => {
      if (update?.quoteId !== shipmentId) return
      queryClient.setQueryData<CustomerShipmentTracking>(queryKey, (current) => withLivePosition(current, update, shipmentId))
      setNow(Date.now())
    }
    const onReconnect = () => void queryClient.invalidateQueries({ queryKey })
    void (async () => {
      const token = await getToken()
      if (!token || !active) return
      socket = initializeSocket(token)
      socket.on(CUSTOMER_LOCATION_EVENT, onPosition)
      socket.on("connect", onReconnect)
    })()
    return () => {
      active = false
      socket?.off(CUSTOMER_LOCATION_EVENT, onPosition)
      socket?.off("connect", onReconnect)
    }
  }, [getToken, queryClient, queryKey, shipmentId])

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
