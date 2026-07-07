"use client";

import * as React from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  useActiveEmployeeLocations,
  usePlaces,
  useManualCheckIn,
  type ActiveEmployeeLocation,
  type LocationHistoryPoint,
} from "@/hooks/useLocator";
import { sharingMeta, signalMeta, isNotablyStationary, stationaryMinutes, formatStationaryDuration } from "./LocatorMapLegend";
import { LocatorMap } from "./LocatorMap";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deptLabel } from "@/lib/departments";

function popupSharingDuration(sinceIso?: string) {
  if (!sinceIso) return "";
  try {
    const totalMin = Math.max(0, Math.round((Date.now() - parseISO(sinceIso).getTime()) / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h === 0 ? `${m}m` : `${h}h ${m}m`;
  } catch {
    return "";
  }
}

const MAP_CENTER = { lat: 39.8283, lng: -98.5795 };
const PLACES_SOURCE_ID = "locator-places";
const TRAIL_SOURCE_ID = "locator-trail";
const OVERLAP_METERS = 12;
const SPIRAL_OFFSETS: [number, number][] = [
  [0, 0], [18, 0], [-18, 0], [0, -18], [18, -18], [-18, -18], [0, 18], [18, 18], [-18, 18],
];

export type MapFocus = (lat: number, lng: number) => void;

function circlePolygon(lat: number, lng: number, radiusM: number, points = 48): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadiusM = 6371000;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusM * Math.cos(angle)) / (earthRadiusM * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusM * Math.sin(angle)) / earthRadiusM;
    coords.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
  }
  return coords;
}

/** Rough planar distance in meters — good enough at dealership-lot scale. */
function approxMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (a.lat - b.lat) * 111320;
  const dLng = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Deterministic, zoom-independent pixel offsets for markers sitting on top of
 * each other. Computed purely from real-world distance (never from the
 * current screen projection), so pins never "jump" between an averaged
 * cluster position and their true position while zooming.
 */
function computeOffsets(locs: ActiveEmployeeLocation[]): Map<string, [number, number]> {
  const offsets = new Map<string, [number, number]>();
  const sorted = [...locs].sort((a, b) => a.userId.localeCompare(b.userId));
  const assigned = new Set<string>();
  sorted.forEach((loc) => {
    if (assigned.has(loc.userId) || !loc.coords) return;
    const group = sorted.filter(
      (l) => !assigned.has(l.userId) && l.coords && approxMeters(l.coords, loc.coords) <= OVERLAP_METERS,
    );
    group.forEach((g, i) => {
      offsets.set(g.userId, SPIRAL_OFFSETS[i % SPIRAL_OFFSETS.length]);
      assigned.add(g.userId);
    });
  });
  return offsets;
}

/**
 * GPS accuracy "halo" scale relative to the marker's own diameter — deliberately qualitative
 * (tight/loose), not a to-scale meters conversion. A to-scale geo-anchored circle was tried
 * first and rejected: it drifted away from the marker whenever the overlap-avoidance spiral
 * offset (see computeOffsets) nudged the marker's *screen* position, since the circle was a
 * real map-anchored polygon while the marker's shift is purely a pixel offset. Rendering the
 * halo as a sibling element inside the marker's own DOM wrapper instead guarantees it always
 * stays centered on the avatar, in exchange for not being literally to-scale.
 */
function haloScale(accuracyM?: number): number | null {
  if (typeof accuracyM !== "number" || accuracyM <= 0) return null;
  if (accuracyM <= 15) return 1.3;
  if (accuracyM <= 40) return 1.7;
  if (accuracyM <= 100) return 2.1;
  return 2.5;
}

const STATE_HEX: Record<string, string> = {
  sharing: "#22c55e",
  paused_break: "#f97316",
  paused_manual: "#f59e0b",
  declined_permission: "#ef4444",
  off_duty: "#9ca3af",
};

function initialsOf(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Popup content is injected via mapbox-gl's setHTML (raw innerHTML, not React) — every piece of
 * user-controlled text (name, job title, department, place name, even the client-reported
 * connection type) MUST be escaped here or it's a stored-XSS vector on the live map. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function buildPopupHtml(loc: ActiveEmployeeLocation, place?: { name: string }) {
  const meta = sharingMeta(loc.sharingState);
  const color = STATE_HEX[loc.sharingState] ?? STATE_HEX.off_duty;
  const lastSeen = (() => {
    try {
      return formatDistanceToNowStrict(parseISO(loc.lastSeenAt), { addSuffix: true });
    } catch {
      return "";
    }
  })();
  const where =
    loc.sharingState === "sharing"
      ? loc.drivingSessionId
        ? `🚗 Driving${typeof loc.speedMph === "number" ? ` · ${loc.speedMph} mph` : ""}`
        : place
          ? `At ${place.name}`
          : typeof loc.speedMph === "number" && loc.speedMph > 3
            ? `On the move · ${loc.speedMph} mph`
            : "Sharing location"
      : meta.label;

  const subLine = [loc.jobTitle, loc.department ? deptLabel(loc.department) : undefined].filter(Boolean).join(" · ");
  const signal = signalMeta(loc);
  const duration = loc.sharingState === "sharing" ? popupSharingDuration(loc.sharingSince) : "";

  const stationaryMin = stationaryMinutes(loc);
  const statRows = [
    duration ? `Sharing for ${duration}` : null,
    typeof loc.speedMph === "number" ? `${loc.speedMph} mph` : null,
    typeof loc.batteryLevel === "number" ? `🔋 ${loc.batteryLevel}%${loc.isCharging ? " ⚡" : ""}` : null,
    signal.label,
    loc.deviceType ? (loc.deviceType === "mobile" ? "📱 Phone" : "💻 Computer") : null,
    isNotablyStationary(loc) && stationaryMin !== null ? `⚓ Stayed put ${formatStationaryDuration(stationaryMin)}` : null,
  ].filter((r): r is string => !!r);

  const safeUserName = escapeHtml(loc.userName);
  const safeSubLine = escapeHtml(subLine);
  const safeWhere = escapeHtml(where);
  const safeStatRows = statRows.map(escapeHtml);

  return `
    <div style="font-size:12px;line-height:1.45;padding:2px 4px;min-width:170px;color:#111827">
      <div style="font-weight:700;margin-bottom:2px;color:#111827">${safeUserName}</div>
      ${safeSubLine ? `<div style="color:#6b7280;font-size:10.5px;margin-bottom:3px">${safeSubLine}</div>` : ""}
      <div style="color:${color};font-weight:600;font-size:11px;margin-bottom:3px">${safeWhere}</div>
      ${safeStatRows.length > 0 ? `<div style="color:#374151;font-size:10px;margin-bottom:3px">${safeStatRows.join(" &nbsp;·&nbsp; ")}</div>` : ""}
      <div style="color:#9ca3af;font-size:10px">Updated ${lastSeen}</div>
    </div>`;
}

interface Props {
  selectedUserId?: string | null;
  onSelectUser?: (userId: string) => void;
  historyPoints?: LocationHistoryPoint[];
  focusRef?: React.MutableRefObject<MapFocus | null>;
}

export function LocatorLiveMapSection({ selectedUserId, onSelectUser, historyPoints = [], focusRef }: Props) {
  const { theme } = useTheme();

  const { data: locations = [], isLoading } = useActiveEmployeeLocations(true);
  const { data: places = [] } = usePlaces();
  const { mutate: checkIn, isPending: checkingIn } = useManualCheckIn();
  const [checkInTarget, setCheckInTarget] = React.useState("");

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, {
    marker: any; popup: any; circleEl: HTMLDivElement; haloEl: HTMLDivElement;
    lastState: string; lastSelected: boolean; lastHaloScale: number | null;
  }>>(new Map());
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const [mapNotice, setMapNotice] = React.useState<string | null>(null);

  const selectRef = React.useRef(onSelectUser);
  selectRef.current = onSelectUser;

  const placesRef = React.useRef(places);
  placesRef.current = places;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const sharingCount = locations.filter((l) => l.sharingState === "sharing").length;

  function handleCheckIn() {
    if (!checkInTarget) return;
    checkIn(checkInTarget, {
      onSuccess: () => toast.success("Checked in"),
      onError: () => toast.error("Could not check in"),
    });
  }

  // ── Map init ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!mapboxToken || !mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !mapRef.current) return;

      if (!mapboxToken.startsWith("pk.")) {
        setMapNotice("Invalid Mapbox token. Use a public token starting with pk.");
        return;
      }
      if (!mapboxgl.supported()) {
        setMapNotice("Mapbox requires WebGL. Please enable hardware acceleration.");
        return;
      }

      mapboxgl.accessToken = mapboxToken;
      mapThemeRef.current = theme;
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
        center: [MAP_CENTER.lng, MAP_CENTER.lat],
        zoom: 4,
        attributionControl: false,
      });

      mapInstanceRef.current = map;
      setMapNotice("Loading map tiles...");
      map.on("load", () => map.resize());
      map.on("idle", () => setMapNotice(null));
      map.on("error", (e: any) => setMapNotice(e?.error?.message || "Map failed to load"));

      if (focusRef) {
        focusRef.current = (lat: number, lng: number) => {
          map.flyTo({ center: [lng, lat], zoom: 15, essential: true });
          mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        };
      }
    };

    initMap();
    return () => {
      cancelled = true;
      if (focusRef) focusRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapboxToken]);

  // ── Theme switch ────────────────────────────────────────────────────
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapThemeRef.current === theme) return;
    mapThemeRef.current = theme;
    setMapNotice("Applying theme...");
    map.setStyle(theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12");
    map.once("idle", () => setMapNotice(null));
  }, [theme]);

  // ── Avatar markers — stable identity, position/state updated in place, ──
  // ── zoom-independent fixed-pixel offsets for overlapping pins. No       ──
  // ── clustering-by-projection, so nothing "jumps" while zooming.         ──
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const markers = markersRef.current;

    const run = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!map.isStyleLoaded()) {
        map.once("idle", run);
        return;
      }

      const visible = locations.filter((l) => l.coords && l.sharingState !== "off_duty");
      const offsets = computeOffsets(visible);
      const nextIds = new Set(visible.map((l) => l.userId));

      // remove markers for people no longer visible
      markers.forEach((entry, userId) => {
        if (!nextIds.has(userId)) {
          entry.marker.remove();
          entry.popup.remove();
          markers.delete(userId);
        }
      });

      visible.forEach((loc) => {
        const color = STATE_HEX[loc.sharingState] ?? STATE_HEX.off_duty;
        const isSelected = loc.userId === selectedUserId;
        const offset = offsets.get(loc.userId) ?? [0, 0];
        const place = loc.currentPlaceId ? placesRef.current.find((p) => p._id === loc.currentPlaceId) : undefined;
        const existing = markers.get(loc.userId);

        const haloScaleNow = haloScale(loc.accuracyM);

        if (existing) {
          existing.marker.setLngLat([loc.coords.lng, loc.coords.lat]);
          if (typeof existing.marker.setOffset === "function") existing.marker.setOffset(offset);
          existing.popup.setHTML(buildPopupHtml(loc, place));

          if (existing.lastState !== loc.sharingState) {
            existing.circleEl.style.borderColor = color;
            existing.lastState = loc.sharingState;
          }
          if (existing.lastSelected !== isSelected) {
            const size = isSelected ? 46 : 36;
            existing.circleEl.style.width = `${size}px`;
            existing.circleEl.style.height = `${size}px`;
            existing.circleEl.style.borderWidth = isSelected ? "4px" : "3px";
            existing.circleEl.style.boxShadow = isSelected
              ? "0 0 0 3px rgba(37,99,235,0.35), 0 3px 8px rgba(0,0,0,.35)"
              : "0 2px 6px rgba(0,0,0,.3)";
            existing.lastSelected = isSelected;
          }
          if (existing.lastHaloScale !== haloScaleNow) {
            const size = isSelected ? 46 : 36;
            existing.haloEl.style.display = haloScaleNow ? "block" : "none";
            if (haloScaleNow) {
              const haloSize = Math.round(size * haloScaleNow);
              existing.haloEl.style.width = `${haloSize}px`;
              existing.haloEl.style.height = `${haloSize}px`;
            }
            existing.lastHaloScale = haloScaleNow;
          }
          return;
        }

        const size = isSelected ? 46 : 36;
        const wrapper = document.createElement("div");
        wrapper.style.cursor = "pointer";
        wrapper.style.position = "relative";
        wrapper.style.width = `${size}px`;
        wrapper.style.height = `${size}px`;

        // GPS-accuracy halo — a sibling of the avatar circle inside the same wrapper, so it
        // always stays perfectly centered on the marker even when the marker itself is nudged
        // by the overlap-avoidance pixel offset (see the comment on haloScale()).
        const haloEl = document.createElement("div");
        haloEl.style.position = "absolute";
        haloEl.style.top = "50%";
        haloEl.style.left = "50%";
        haloEl.style.borderRadius = "9999px";
        haloEl.style.background = "rgba(59,130,246,0.15)";
        haloEl.style.border = "1px solid rgba(59,130,246,0.3)";
        haloEl.style.pointerEvents = "none";
        haloEl.style.display = haloScaleNow ? "block" : "none";
        if (haloScaleNow) {
          const haloSize = Math.round(size * haloScaleNow);
          haloEl.style.width = `${haloSize}px`;
          haloEl.style.height = `${haloSize}px`;
        }
        haloEl.style.transform = "translate(-50%, -50%)";
        wrapper.appendChild(haloEl);

        const circleEl = document.createElement("div");
        circleEl.style.position = "relative";
        circleEl.style.zIndex = "1";
        circleEl.style.width = "100%";
        circleEl.style.height = "100%";
        circleEl.style.borderRadius = "9999px";
        circleEl.style.border = `3px solid ${color}`;
        circleEl.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
        circleEl.style.overflow = "hidden";
        circleEl.style.background = "#f3f4f6";
        circleEl.style.display = "flex";
        circleEl.style.alignItems = "center";
        circleEl.style.justifyContent = "center";
        circleEl.style.transition = "width .15s, height .15s, box-shadow .15s";

        if (loc.userAvatar) {
          const img = document.createElement("img");
          img.src = loc.userAvatar;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          circleEl.appendChild(img);
        } else {
          const span = document.createElement("span");
          span.textContent = initialsOf(loc.userName);
          span.style.fontSize = "12px";
          span.style.fontWeight = "900";
          span.style.color = "#111827";
          circleEl.appendChild(span);
        }
        wrapper.appendChild(circleEl);

        if (loc.sharingState === "sharing") {
          const dot = document.createElement("span");
          dot.style.position = "absolute";
          dot.style.bottom = "-1px";
          dot.style.right = "-1px";
          dot.style.width = "11px";
          dot.style.height = "11px";
          dot.style.borderRadius = "9999px";
          dot.style.background = color;
          dot.style.border = "2px solid white";
          wrapper.appendChild(dot);
        }

        wrapper.addEventListener("click", () => selectRef.current?.(loc.userId));

        const popup = new mapboxgl.Popup({ offset: [0, -(size / 2) - 6], closeButton: false, closeOnClick: false })
          .setHTML(buildPopupHtml(loc, place));
        wrapper.addEventListener("mouseenter", () => {
          popup.setLngLat([loc.coords.lng, loc.coords.lat]).addTo(map);
        });
        wrapper.addEventListener("mouseleave", () => popup.remove());

        const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center", offset })
          .setLngLat([loc.coords.lng, loc.coords.lat])
          .addTo(map);

        markers.set(loc.userId, {
          marker, popup, circleEl, haloEl,
          lastState: loc.sharingState, lastSelected: isSelected, lastHaloScale: haloScaleNow,
        });
      });
    };

    run();
  }, [locations, selectedUserId]);

  // ── History trail for the selected employee (same map) ──────────────
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const removeTrail = () => {
      if (map.getLayer(`${TRAIL_SOURCE_ID}-line`)) map.removeLayer(`${TRAIL_SOURCE_ID}-line`);
      if (map.getLayer(`${TRAIL_SOURCE_ID}-pts`)) map.removeLayer(`${TRAIL_SOURCE_ID}-pts`);
      if (map.getSource(TRAIL_SOURCE_ID)) map.removeSource(TRAIL_SOURCE_ID);
    };

    const render = async () => {
      if (!map.isStyleLoaded()) return;
      if (historyPoints.length === 0) {
        removeTrail();
        return;
      }
      const mapboxgl = (await import("mapbox-gl")).default;
      const coords = historyPoints.map((h) => [h.coords.lng, h.coords.lat] as [number, number]);
      const geojson = {
        type: "FeatureCollection" as const,
        features: [
          { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } },
          ...coords.map((c, i) => ({
            type: "Feature" as const,
            properties: { edge: i === 0 || i === coords.length - 1 ? 1 : 0 },
            geometry: { type: "Point" as const, coordinates: c },
          })),
        ],
      };

      const source = map.getSource(TRAIL_SOURCE_ID);
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data: geojson });
        map.addLayer({
          id: `${TRAIL_SOURCE_ID}-line`,
          type: "line",
          source: TRAIL_SOURCE_ID,
          filter: ["==", "$type", "LineString"],
          paint: { "line-color": "#3b82f6", "line-width": 3, "line-opacity": 0.85 },
        });
        map.addLayer({
          id: `${TRAIL_SOURCE_ID}-pts`,
          type: "circle",
          source: TRAIL_SOURCE_ID,
          filter: ["==", "$type", "Point"],
          paint: {
            "circle-radius": ["case", ["==", ["get", "edge"], 1], 6, 3],
            "circle-color": ["case", ["==", ["get", "edge"], 1], "#2563eb", "#93c5fd"],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      if (coords.length > 1) {
        const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }
    };

    render();
    map.on("styledata", render);
    return () => map.off("styledata", render);
  }, [historyPoints]);

  // ── Places overlay ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const renderPlaces = () => {
      if (!map.isStyleLoaded()) return;
      const features = placesRef.current.map((p) => ({
        type: "Feature" as const,
        properties: { name: p.name, color: p.color || "#3b82f6" },
        geometry: { type: "Polygon" as const, coordinates: [circlePolygon(p.coords.lat, p.coords.lng, p.radiusM)] },
      }));
      const geojson = { type: "FeatureCollection" as const, features };

      const source = map.getSource(PLACES_SOURCE_ID);
      if (source) {
        source.setData(geojson);
        return;
      }

      map.addSource(PLACES_SOURCE_ID, { type: "geojson", data: geojson });
      map.addLayer({
        id: `${PLACES_SOURCE_ID}-fill`,
        type: "fill",
        source: PLACES_SOURCE_ID,
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: `${PLACES_SOURCE_ID}-outline`,
        type: "line",
        source: PLACES_SOURCE_ID,
        paint: { "line-color": ["get", "color"], "line-width": 2 },
      });
    };

    renderPlaces();
    map.on("styledata", renderPlaces);
    return () => map.off("styledata", renderPlaces);
  }, [places, mapNotice]);

  const zoomMap = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(Math.max(2, Math.min(18, map.getZoom() + delta)));
  };

  const centerOnFirstSharing = () => {
    const map = mapInstanceRef.current;
    const target = locations.find((l) => l.sharingState === "sharing");
    if (!map || !target) return;
    map.flyTo({ center: [target.coords.lng, target.coords.lat], zoom: 14, essential: true });
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {places.length > 0 && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Select value={checkInTarget} onValueChange={setCheckInTarget}>
            <SelectTrigger className="h-8 text-xs w-full xs:w-40 sm:w-48">
              <SelectValue placeholder="Check in at…" />
            </SelectTrigger>
            <SelectContent>
              {places.map((p) => (
                <SelectItem key={p._id} value={p._id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!checkInTarget || checkingIn}
            onClick={handleCheckIn}
            className="h-8 text-[11px] font-bold gap-1.5 shrink-0"
          >
            {checkingIn ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
            Check In
          </Button>
        </div>
      )}

      <LocatorMap
        mapboxToken={mapboxToken}
        mapRef={mapRef}
        onZoomIn={() => zoomMap(1)}
        onZoomOut={() => zoomMap(-1)}
        onCenter={centerOnFirstSharing}
        mapNotice={mapNotice}
        activeCount={sharingCount}
      />

      {!isLoading && locations.filter((l) => l.sharingState !== "off_duty").length === 0 && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Nobody is sharing their location yet. Turn on <span className="font-semibold">My Location</span> to appear on the map.
        </p>
      )}
    </div>
  );
}
