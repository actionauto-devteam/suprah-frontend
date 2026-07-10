"use client";

import * as React from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import {
  useActiveEmployeeLocations,
  usePlaces,
  type ActiveEmployeeLocation,
  type LocationHistoryPoint,
  type Place,
} from "@/hooks/useLocator";
import { sharingMeta, signalMeta, isNotablyStationary, stationaryMinutes, formatStationaryDuration } from "./LocatorMapLegend";
import { LocatorMap } from "./LocatorMap";
import { deptLabel } from "@/lib/departments";
import { haversineMi, formatDistanceMi } from "@/lib/geo";

// Matches the icon presets a place can be created with (see PlacesAdminPanel's ICON_PRESETS) —
// kept as plain emoji glyphs (not SVGs) since place markers are built as raw DOM/HTML, same
// as the avatar markers and popups in this file.
const PLACE_ICON_GLYPH: Record<string, string> = {
  MapPin: "📍", Building2: "🏢", Warehouse: "🏬", Car: "🚗", Wrench: "🔧", ParkingCircle: "🅿️",
};
function placeGlyph(icon?: string) {
  return PLACE_ICON_GLYPH[icon || ""] || PLACE_ICON_GLYPH.MapPin;
}

const MIN_ZOOM = 2;
const MAX_ZOOM = 18;
// Belt-and-suspenders on top of the meter-based offset below: whatever the current zoom,
// never nudge a marker away from its raw true coordinate at all until zoomed in enough
// (city/neighborhood level) that overlap is an actual on-screen problem worth solving.
const ZOOM_OFFSET_THRESHOLD = 14;

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
// Real-world METERS, not screen pixels — deliberately. An earlier version nudged overlapping
// avatars apart with a fixed *pixel* offset (mapbox Marker's `offset` option), which is a
// constant screen-space shift independent of zoom. At a zoomed-out view where one pixel can
// represent many kilometers, that same "small" pixel nudge scattered people who were all
// genuinely in the same building across an entire continent on screen. A meter-based geo
// offset instead moves the *coordinate itself* by a few real meters, so it's imperceptible
// zoomed out (correctly reads as "same spot") and only becomes visually distinguishable once
// zoomed in enough that a few meters actually is a few screen pixels.
const SPIRAL_OFFSETS_M: [number, number][] = [
  [0, 0], [3.5, 0], [-3.5, 0], [0, -3.5], [3.5, -3.5], [-3.5, -3.5], [0, 3.5], [3.5, 3.5], [-3.5, 3.5],
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

/** Converts a small real-world meter offset into a lngLat delta at the given latitude —
 * used to nudge overlapping avatars apart by an actual (tiny) geo distance instead of a
 * zoom-breaking screen-pixel shift. */
function metersToLngLatDelta(lat: number, dxM: number, dyM: number): [number, number] {
  const dLat = dyM / 111320;
  const dLng = dxM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [dLng, dLat];
}

// Mapbox's Map Matching API caps a single request at 100 coordinates.
const MATCH_CHUNK_SIZE = 100;

/**
 * Snaps a raw breadcrumb trail onto actual road geometry using Mapbox's Map Matching API
 * (same account/token as the base map tiles) — a straight line between GPS pings otherwise
 * cuts across blocks/lots/water instead of following the street the person actually drove.
 * Chunks into groups of <=100 points (the API's per-request limit) and stitches the matched
 * geometry back together; any chunk that fails to match (too sparse/far apart for the
 * `driving` profile — e.g. a big gap from an offline stretch) falls back to its own raw
 * straight segment rather than breaking the whole trail.
 */
async function matchToRoads(coords: [number, number][], token: string): Promise<[number, number][]> {
  const chunks: [number, number][][] = [];
  for (let i = 0; i < coords.length; i += MATCH_CHUNK_SIZE - 1) {
    const chunk = coords.slice(i, i + MATCH_CHUNK_SIZE);
    if (chunk.length > 1) chunks.push(chunk);
  }

  const matchedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const coordStr = chunk.map(([lng, lat]) => `${lng},${lat}`).join(";");
        // radiuses tells the matcher how far each raw point may realistically be from the
        // true road (consumer GPS is commonly 10-30m off) — the API's own default (5m) is
        // tight enough that ordinary GPS noise alone causes spurious "NoMatch" failures on
        // real breadcrumb data. tidy=true lets it drop/reorder noisy points instead of
        // failing the whole chunk over one bad sample.
        const radiuses = chunk.map(() => "25").join(";");
        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordStr}?geometries=geojson&overview=full&tidy=true&radiuses=${radiuses}&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return chunk;
        const data = await res.json();
        const matched = data?.code === "Ok" ? data.matchings?.[0]?.geometry?.coordinates : null;
        return Array.isArray(matched) && matched.length > 1 ? (matched as [number, number][]) : chunk;
      } catch {
        return chunk;
      }
    }),
  );

  return matchedChunks.flat();
}

/** Rough planar distance in meters — good enough at dealership-lot scale. */
function approxMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (a.lat - b.lat) * 111320;
  const dLng = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Deterministic, zoom-independent METER offsets (see SPIRAL_OFFSETS_M) for markers sitting
 * on top of each other. Computed purely from real-world distance (never from the current
 * screen projection), so pins never "jump" between an averaged cluster position and their
 * true position while zooming.
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
      offsets.set(g.userId, SPIRAL_OFFSETS_M[i % SPIRAL_OFFSETS_M.length]);
      assigned.add(g.userId);
    });
  });
  return offsets;
}

/**
 * GPS accuracy "halo" scale relative to the marker's own diameter — deliberately qualitative
 * (tight/loose), not a to-scale meters conversion. A to-scale geo-anchored circle was tried
 * first and rejected: it drifted away from the marker's own DOM wrapper in edge cases.
 * Rendering the halo as a sibling element inside the marker's own DOM wrapper instead
 * guarantees it always stays centered on the avatar, in exchange for not being literally
 * to-scale.
 *
 * Kept intentionally tight (max ~1.5x the avatar's own diameter) — a large halo reads as "this
 * person could be anywhere in this big blob," which is exactly the "location looks inaccurate"
 * complaint this is meant to avoid. The marker's own dot is always the true, exact coordinate;
 * this ring is only ever a subtle "how tightly do we trust this" accent around it.
 */
function haloScale(accuracyM?: number): number | null {
  if (typeof accuracyM !== "number" || accuracyM <= 0) return null;
  if (accuracyM <= 15) return 1.15;
  if (accuracyM <= 40) return 1.28;
  if (accuracyM <= 100) return 1.4;
  return 1.5;
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

const POPUP_PALETTE = {
  light: {
    bg: "#ffffff", border: "rgba(15,23,42,0.08)", shadow: "0 8px 24px rgba(15,23,42,0.14)",
    text: "#0f172a", muted: "#64748b", chipBg: "rgba(15,23,42,0.045)", divider: "rgba(15,23,42,0.08)",
  },
  dark: {
    bg: "#18181b", border: "rgba(255,255,255,0.08)", shadow: "0 8px 24px rgba(0,0,0,0.5)",
    text: "#f8fafc", muted: "#a1a1aa", chipBg: "rgba(255,255,255,0.06)", divider: "rgba(255,255,255,0.08)",
  },
};

function popupChip(pal: typeof POPUP_PALETTE.light, label: string, value: string) {
  return `
    <div style="background:${pal.chipBg};border-radius:8px;padding:4px 7px;min-width:0">
      <div style="font-size:8px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${pal.muted};line-height:1">${label}</div>
      <div style="font-size:11px;font-weight:700;color:${pal.text};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div>
    </div>`;
}

function buildPopupHtml(
  loc: ActiveEmployeeLocation,
  place: { name: string; color?: string } | undefined,
  viewerCoords: { lat: number; lng: number } | null | undefined,
  isSelf: boolean | undefined,
  theme: "light" | "dark",
) {
  const pal = POPUP_PALETTE[theme];
  const meta = sharingMeta(loc.sharingState);
  const color = STATE_HEX[loc.sharingState] ?? STATE_HEX.off_duty;
  const isLastSeen = loc.sharingState === "off_duty";
  const lastSeen = (() => {
    try {
      return formatDistanceToNowStrict(parseISO(loc.lastSeenAt), { addSuffix: true });
    } catch {
      return "";
    }
  })();
  const isDriving = loc.sharingState === "sharing" && !!loc.drivingSessionId;
  const where =
    loc.sharingState === "sharing"
      ? isDriving
        ? `Driving${typeof loc.speedMph === "number" ? ` · ${loc.speedMph} mph` : ""}`
        : place
          ? `At ${place.name}`
          : typeof loc.speedMph === "number" && loc.speedMph > 3
            ? `On the move · ${loc.speedMph} mph`
            : "Sharing location"
      : isLastSeen
        ? `Last seen ${lastSeen}`
        : meta.label;
  const whereGlyph = isDriving ? "🚗" : loc.sharingState === "sharing" ? (place ? "📍" : "🧭") : isLastSeen ? "🕐" : "⏸";

  const subLine = [loc.jobTitle, loc.department ? deptLabel(loc.department) : undefined].filter(Boolean).join(" · ");
  const signal = signalMeta(loc);
  const duration = loc.sharingState === "sharing" ? popupSharingDuration(loc.sharingSince) : "";
  const distanceMi = !isSelf && viewerCoords ? haversineMi(viewerCoords, loc.coords) : null;
  const stationaryMin = stationaryMinutes(loc);

  const chips = [
    duration ? popupChip(pal, "Sharing For", duration) : null,
    typeof loc.speedMph === "number" ? popupChip(pal, "Speed", `${loc.speedMph} mph`) : null,
    typeof loc.batteryLevel === "number" ? popupChip(pal, "Battery", `${loc.batteryLevel}%${loc.isCharging ? " ⚡" : ""}`) : null,
    loc.sharingState === "sharing" ? popupChip(pal, "Signal", signal.label) : null,
    loc.deviceType ? popupChip(pal, "Device", loc.deviceType === "mobile" ? "📱 Phone" : "💻 Computer") : null,
    distanceMi !== null ? popupChip(pal, "Distance", `${formatDistanceMi(distanceMi)} away`) : null,
  ].filter((c): c is string => !!c);

  const safeUserName = escapeHtml(loc.userName);
  const safeSubLine = escapeHtml(subLine);
  const safeWhere = escapeHtml(where);
  const initials = escapeHtml(initialsOf(loc.userName));
  const safeAvatar = loc.userAvatar ? escapeHtml(loc.userAvatar) : "";

  const avatarHtml = safeAvatar
    ? `<img src="${safeAvatar}" style="width:34px;height:34px;border-radius:9999px;object-fit:cover;border:2px solid ${color}" />`
    : `<div style="width:34px;height:34px;border-radius:9999px;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ${color}">${initials}</div>`;

  return `
    <div style="position:relative;font-family:inherit;font-size:12px;line-height:1.4;min-width:206px;max-width:240px;background:${pal.bg};color:${pal.text};border-radius:14px;overflow:hidden;box-shadow:${pal.shadow};border:1px solid ${pal.border}">
      <button type="button" class="popup-close-btn" aria-label="Close" style="position:absolute;top:7px;right:7px;width:18px;height:18px;border-radius:9999px;border:none;background:${pal.chipBg};color:${pal.muted};display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;cursor:pointer;z-index:1">✕</button>
      <div style="height:4px;background:${color}"></div>
      <div style="padding:10px 12px 9px">
        <div style="display:flex;align-items:center;gap:8px;padding-right:16px">
          ${avatarHtml}
          <div style="min-width:0;flex:1">
            <div style="font-weight:800;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeUserName}</div>
            ${safeSubLine ? `<div style="color:${pal.muted};font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeSubLine}</div>` : ""}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:5px;margin-top:8px;background:${color}14;border:1px solid ${color}33;border-radius:8px;padding:4px 8px">
          <span style="font-size:12px;line-height:1">${whereGlyph}</span>
          <span style="color:${color};font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeWhere}</span>
        </div>

        ${chips.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:7px">${chips.join("")}</div>` : ""}

        ${isNotablyStationary(loc) && stationaryMin !== null ? `
          <div style="display:flex;align-items:center;gap:4px;margin-top:7px;color:#0ea5e9;font-size:9.5px;font-weight:700">
            <span>⚓</span><span>Stayed put ${escapeHtml(formatStationaryDuration(stationaryMin))} — GPS is just settled, not stuck</span>
          </div>` : ""}

        <div style="margin-top:7px;padding-top:6px;border-top:1px solid ${pal.divider};color:${pal.muted};font-size:9.5px">Updated ${escapeHtml(lastSeen)}</div>
      </div>
    </div>`;
}

interface Props {
  selectedUserId?: string | null;
  onSelectUser?: (userId: string) => void;
  onClearSelection?: () => void;
  historyPoints?: LocationHistoryPoint[];
  focusRef?: React.MutableRefObject<MapFocus | null>;
  myUserId?: string | null;
  placePickMode?: boolean;
  onPlacePicked?: (lat: number, lng: number) => void;
  draftPlace?: Place | null;
}

export function LocatorLiveMapSection({
  selectedUserId, onSelectUser, onClearSelection, historyPoints = [], focusRef,
  myUserId, placePickMode, onPlacePicked, draftPlace,
}: Props) {
  const { theme } = useTheme();

  const { data: locations = [], isLoading } = useActiveEmployeeLocations(true);
  const { data: places = [] } = usePlaces();
  const [jumpTarget, setJumpTarget] = React.useState("");
  const [zoom, setZoom] = React.useState(4);

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, {
    marker: any; popup: any; circleEl: HTMLDivElement; haloEl: HTMLDivElement;
    lastState: string; lastSelected: boolean; lastHaloScale: number | null; isSelf: boolean;
  }>>(new Map());
  const placeMarkersRef = React.useRef<Map<string, { marker: any; badgeEl: HTMLDivElement }>>(new Map());
  // The map otherwise always opens on a fixed continental-US view (MAP_CENTER, zoom 4) —
  // at that zoom, real (correct) positions a few miles apart render only a few screen
  // pixels from each other, reading as "everyone's pin is in the wrong/cramped spot until
  // you zoom way in." Fit the camera to wherever people/places actually are the first time
  // we have any to show, then leave the camera alone (don't fight the user's own pan/zoom).
  const hasAutoFitRef = React.useRef(false);
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const [mapNotice, setMapNotice] = React.useState<string | null>(null);

  const selectRef = React.useRef(onSelectUser);
  selectRef.current = onSelectUser;
  const clearSelectionRef = React.useRef(onClearSelection);
  clearSelectionRef.current = onClearSelection;
  // Read (not a dependency) inside the marker-rebuild effect, so crossing the zoom-offset
  // threshold doesn't force that fairly heavy effect to re-run on every zoom tick.
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;

  const placesRef = React.useRef(places);
  placesRef.current = places;

  const overlayPlaces = React.useMemo(
    () => (draftPlace ? [...places, draftPlace] : places),
    [places, draftPlace],
  );
  const overlayPlacesRef = React.useRef(overlayPlaces);
  overlayPlacesRef.current = overlayPlaces;

  const placePickModeRef = React.useRef(placePickMode);
  placePickModeRef.current = placePickMode;
  const onPlacePickedRef = React.useRef(onPlacePicked);
  onPlacePickedRef.current = onPlacePicked;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  const sharingCount = locations.filter((l) => l.sharingState === "sharing").length;
  const myLocation = myUserId ? locations.find((l) => l.userId === myUserId) : undefined;
  const stateCounts = React.useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const l of locations) counts[l.sharingState] = (counts[l.sharingState] ?? 0) + 1;
    return counts;
  }, [locations]);

  function flyToPlace(place: Place) {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({ center: [place.coords.lng, place.coords.lat], zoom: 16, essential: true });
  }

  function handleJumpToPlace() {
    const place = places.find((p) => p._id === jumpTarget);
    if (place) flyToPlace(place);
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
      map.on("zoom", () => setZoom(map.getZoom()));

      // Background/canvas clicks only — marker DOM elements sit on top of the canvas and
      // don't bubble into this, so it never fires from clicking a person's pin. Popup
      // visibility is driven declaratively off `selectedUserId` (see the avatar-markers
      // effect), so clicking empty map area just clears the selection — that alone closes
      // whichever popup was open, no direct popup manipulation needed here.
      map.on("click", (e: any) => {
        if (placePickModeRef.current) {
          onPlacePickedRef.current?.(e.lngLat.lat, e.lngLat.lng);
          return;
        }
        clearSelectionRef.current?.();
      });

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

      // Off-duty-but-has-coords people stay on the map as dimmed "last known spot" pins
      // (Life360-style) instead of vanishing entirely — coords are never cleared on stop.
      const visible = locations.filter((l) => l.coords);

      if (!hasAutoFitRef.current) {
        const fitPoints: [number, number][] = [
          ...visible.map((l) => [l.coords.lng, l.coords.lat] as [number, number]),
          ...placesRef.current.map((p) => [p.coords.lng, p.coords.lat] as [number, number]),
        ];
        if (fitPoints.length > 0) {
          hasAutoFitRef.current = true;
          if (fitPoints.length === 1) {
            map.flyTo({ center: fitPoints[0], zoom: 14, essential: true });
          } else {
            const bounds = fitPoints.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(fitPoints[0], fitPoints[0]));
            map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
          }
        }
      }
      const offsets = computeOffsets(visible);
      const nextIds = new Set(visible.map((l) => l.userId));
      const viewerCoords = myLocation?.coords ?? null;

      const boxShadowFor = (isSelected: boolean, isSelf: boolean) => {
        if (isSelected) return "0 0 0 3px rgba(37,99,235,0.35), 0 3px 8px rgba(0,0,0,.35)";
        if (isSelf) return "0 0 0 2px rgba(37,99,235,0.5), 0 2px 6px rgba(0,0,0,.3)";
        return "0 2px 6px rgba(0,0,0,.3)";
      };

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
        const isSelf = !!myUserId && loc.userId === myUserId;
        const isLastSeen = loc.sharingState === "off_duty";
        const offsetM = zoomRef.current >= ZOOM_OFFSET_THRESHOLD ? (offsets.get(loc.userId) ?? [0, 0]) : [0, 0];
        const [dLng, dLat] = metersToLngLatDelta(loc.coords.lat, offsetM[0], offsetM[1]);
        const lngLat: [number, number] = [loc.coords.lng + dLng, loc.coords.lat + dLat];
        const place = loc.currentPlaceId ? placesRef.current.find((p) => p._id === loc.currentPlaceId) : undefined;
        const existing = markers.get(loc.userId);

        const haloScaleNow = haloScale(loc.accuracyM);

        if (existing) {
          existing.marker.setLngLat(lngLat);
          existing.popup.setLngLat(lngLat);
          existing.popup.setHTML(buildPopupHtml(loc, place, viewerCoords, isSelf, theme));
          existing.marker.getElement().style.opacity = isLastSeen ? "0.55" : "1";

          if (existing.lastState !== loc.sharingState) {
            existing.circleEl.style.borderColor = color;
            existing.circleEl.style.borderStyle = isLastSeen ? "dashed" : "solid";
            existing.lastState = loc.sharingState;
          }
          if (existing.lastSelected !== isSelected) {
            const size = isSelected ? 46 : 36;
            existing.circleEl.style.width = `${size}px`;
            existing.circleEl.style.height = `${size}px`;
            existing.circleEl.style.borderWidth = isSelected ? "4px" : "3px";
            existing.circleEl.style.boxShadow = boxShadowFor(isSelected, isSelf);
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
        wrapper.style.opacity = isLastSeen ? "0.55" : "1";

        // GPS-accuracy halo — a sibling of the avatar circle inside the same wrapper, so it
        // always stays perfectly centered on the marker regardless of the overlap-avoidance
        // geo offset baked into this marker's own lngLat (see the comment on haloScale()).
        const haloEl = document.createElement("div");
        haloEl.style.position = "absolute";
        haloEl.style.top = "50%";
        haloEl.style.left = "50%";
        haloEl.style.borderRadius = "9999px";
        haloEl.style.background = "rgba(59,130,246,0.10)";
        haloEl.style.border = "1px solid rgba(59,130,246,0.35)";
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
        circleEl.style.border = `3px ${isLastSeen ? "dashed" : "solid"} ${color}`;
        circleEl.style.boxShadow = boxShadowFor(isSelected, isSelf);
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

        const popup = new mapboxgl.Popup({ offset: [0, -(size / 2) - 6], closeButton: false, closeOnClick: false, className: "locator-popup" })
          .setLngLat(lngLat)
          .setHTML(buildPopupHtml(loc, place, viewerCoords, isSelf, theme));

        // Mapbox's native close button is off (closeButton: false) in favor of the one drawn
        // inside buildPopupHtml, since the popup content is otherwise pointer-events:none (see
        // the .locator-popup CSS below) so it never steals clicks meant for the map underneath.
        // The "open" event only fires once the popup's DOM actually exists to query.
        popup.on("open", () => {
          const closeBtn = popup.getElement()?.querySelector<HTMLButtonElement>(".popup-close-btn");
          closeBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            clearSelectionRef.current?.();
          });
        });

        // Click-only (no hover) — hovering used to also open the popup as a "desktop
        // progressive enhancement," but the popup sits right next to the marker and could
        // itself catch mouseenter/mouseleave, fighting the marker's own hover state and
        // flickering open/closed. Click just selects this person; popup open/closed state
        // is driven declaratively below (kept in sync with `selectedUserId` on every render)
        // rather than toggled imperatively here, so it can't desync from the actual selection.
        // stopPropagation is load-bearing: marker elements are siblings of the map canvas
        // inside the same canvas container mapbox listens on for its own "click" handler
        // (the map's background click — used to clear the selection, see the map init
        // effect) — without this, every marker click also bubbled into that handler and
        // cleared the selection it had just set, which is why the popup never actually
        // stayed open even though the zoom-in still happened.
        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          selectRef.current?.(loc.userId);
        });

        const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
          .setLngLat(lngLat)
          .addTo(map);

        markers.set(loc.userId, {
          marker, popup, circleEl, haloEl, isSelf,
          lastState: loc.sharingState, lastSelected: isSelected, lastHaloScale: haloScaleNow,
        });
      });

      // Popup visibility is a pure function of selection — always exactly one open (the
      // selected person's, top-of-icon via the popup's own offset), everyone else's closed.
      markers.forEach((entry, userId) => {
        if (userId === selectedUserId) entry.popup.addTo(map);
        else entry.popup.remove();
      });
    };

    run();
  }, [locations, places, selectedUserId, myUserId, myLocation, theme]);

  // ── History trail for the selected employee (same map) ──────────────
  // Renders instantly as a straight line between raw breadcrumb points, then upgrades in
  // place to a road-snapped path once Mapbox's Map Matching API responds (progressive
  // enhancement — never blocks or removes the trail while that request is in flight).
  // The matching fetch itself is only ever kicked off once per historyPoints change (kept
  // out of the styledata-bound repaint below), so a theme switch or tile reload can't
  // re-trigger a fresh network request every time the style reloads.
  const trailGeojsonRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    let cancelled = false;

    const removeTrail = () => {
      trailGeojsonRef.current = null;
      if (map.getLayer(`${TRAIL_SOURCE_ID}-line`)) map.removeLayer(`${TRAIL_SOURCE_ID}-line`);
      if (map.getLayer(`${TRAIL_SOURCE_ID}-pts`)) map.removeLayer(`${TRAIL_SOURCE_ID}-pts`);
      if (map.getSource(TRAIL_SOURCE_ID)) map.removeSource(TRAIL_SOURCE_ID);
    };

    const trailGeojson = (lineCoords: [number, number][], pointCoords: [number, number][]) => ({
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: lineCoords } },
        ...pointCoords.map((c, i) => ({
          type: "Feature" as const,
          properties: { edge: i === 0 || i === pointCoords.length - 1 ? 1 : 0 },
          geometry: { type: "Point" as const, coordinates: c },
        })),
      ],
    });

    // Re-adds the source/layers from whatever geometry we've already computed — bound to
    // styledata so the trail survives a style reload (theme switch), but never re-fetches.
    const repaint = () => {
      if (!map.isStyleLoaded() || !trailGeojsonRef.current) return;
      const geojson = trailGeojsonRef.current;
      const source = map.getSource(TRAIL_SOURCE_ID);
      if (source) {
        source.setData(geojson);
        return;
      }
      map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data: geojson });
      map.addLayer({
        id: `${TRAIL_SOURCE_ID}-line`,
        type: "line",
        source: TRAIL_SOURCE_ID,
        filter: ["==", "$type", "LineString"],
        layout: { "line-join": "round", "line-cap": "round" },
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
    };

    const run = async () => {
      if (historyPoints.length === 0) {
        removeTrail();
        return;
      }
      const mapboxgl = (await import("mapbox-gl")).default;
      const coords = historyPoints.map((h) => [h.coords.lng, h.coords.lat] as [number, number]);

      // Instant straight-line render — never left waiting on the network.
      trailGeojsonRef.current = trailGeojson(coords, coords);
      repaint();

      if (coords.length > 1) {
        const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }

      // Upgrade to a road-snapped line in place once matching resolves — the point dots
      // always stay at the raw recorded coordinates, only the connecting line is replaced.
      if (mapboxToken && coords.length > 1) {
        const matched = await matchToRoads(coords, mapboxToken);
        if (cancelled) return;
        trailGeojsonRef.current = trailGeojson(matched, coords);
        repaint();
      }
    };

    run();
    map.on("styledata", repaint);
    return () => {
      cancelled = true;
      map.off("styledata", repaint);
    };
  }, [historyPoints, mapboxToken]);

  // ── Places overlay — geofence circle + a highlighted icon badge at the ──
  // ── center of every company place, clickable to fly straight to it.     ──
  React.useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const placeMarkers = placeMarkersRef.current;

    const renderPlaces = () => {
      if (!map.isStyleLoaded()) return;
      const features = overlayPlacesRef.current.map((p) => ({
        type: "Feature" as const,
        properties: { name: p.name, color: p.color || "#3b82f6" },
        geometry: { type: "Polygon" as const, coordinates: [circlePolygon(p.coords.lat, p.coords.lng, p.radiusM)] },
      }));
      const geojson = { type: "FeatureCollection" as const, features };

      const source = map.getSource(PLACES_SOURCE_ID);
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(PLACES_SOURCE_ID, { type: "geojson", data: geojson });
        // Soft outer glow first (wide, faint line) so the geofence edge reads as
        // "highlighted" rather than a flat thin outline, then a crisp inner fill+line on top.
        map.addLayer({
          id: `${PLACES_SOURCE_ID}-glow`,
          type: "line",
          source: PLACES_SOURCE_ID,
          paint: { "line-color": ["get", "color"], "line-width": 9, "line-blur": 4, "line-opacity": 0.35 },
        });
        map.addLayer({
          id: `${PLACES_SOURCE_ID}-fill`,
          type: "fill",
          source: PLACES_SOURCE_ID,
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.16 },
        });
        map.addLayer({
          id: `${PLACES_SOURCE_ID}-outline`,
          type: "line",
          source: PLACES_SOURCE_ID,
          paint: { "line-color": ["get", "color"], "line-width": 2.5 },
        });
      }

      // Icon badge + label per place, stable identity keyed by place id.
      const run = async () => {
        const mapboxgl = (await import("mapbox-gl")).default;
        const nextIds = new Set(overlayPlacesRef.current.map((p) => p._id));

        placeMarkers.forEach((entry, id) => {
          if (!nextIds.has(id)) {
            entry.marker.remove();
            placeMarkers.delete(id);
          }
        });

        overlayPlacesRef.current.forEach((p) => {
          const color = p.color || "#3b82f6";
          const existing = placeMarkers.get(p._id);
          if (existing) {
            existing.marker.setLngLat([p.coords.lng, p.coords.lat]);
            existing.badgeEl.style.background = color;
            existing.badgeEl.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 3px ${color}33`;
            existing.badgeEl.textContent = placeGlyph(p.icon);
            const labelEl = existing.badgeEl.nextElementSibling as HTMLDivElement | null;
            if (labelEl) labelEl.textContent = p.name;
            return;
          }

          const wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.flexDirection = "column";
          wrapper.style.alignItems = "center";
          wrapper.style.gap = "3px";
          wrapper.style.cursor = "pointer";
          wrapper.style.pointerEvents = "auto";

          const badgeEl = document.createElement("div");
          badgeEl.style.width = "30px";
          badgeEl.style.height = "30px";
          badgeEl.style.borderRadius = "9999px";
          badgeEl.style.display = "flex";
          badgeEl.style.alignItems = "center";
          badgeEl.style.justifyContent = "center";
          badgeEl.style.fontSize = "15px";
          badgeEl.style.background = color;
          badgeEl.style.border = "2.5px solid white";
          badgeEl.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 3px ${color}33`;
          badgeEl.textContent = placeGlyph(p.icon);
          wrapper.appendChild(badgeEl);

          const labelEl = document.createElement("div");
          labelEl.style.fontSize = "9.5px";
          labelEl.style.fontWeight = "800";
          labelEl.style.color = "#ffffff";
          labelEl.style.background = "rgba(15,23,42,0.72)";
          labelEl.style.padding = "1.5px 6px";
          labelEl.style.borderRadius = "9999px";
          labelEl.style.whiteSpace = "nowrap";
          labelEl.style.maxWidth = "110px";
          labelEl.style.overflow = "hidden";
          labelEl.style.textOverflow = "ellipsis";
          labelEl.textContent = p.name;
          wrapper.appendChild(labelEl);

          wrapper.addEventListener("click", (e) => {
            e.stopPropagation();
            map.flyTo({ center: [p.coords.lng, p.coords.lat], zoom: 16, essential: true });
          });

          const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
            .setLngLat([p.coords.lng, p.coords.lat])
            .addTo(map);

          placeMarkers.set(p._id, { marker, badgeEl });
        });
      };
      run();
    };

    renderPlaces();
    map.on("styledata", renderPlaces);
    return () => map.off("styledata", renderPlaces);
  }, [overlayPlaces, mapNotice]);

  const zoomMap = (delta: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, map.getZoom() + delta)));
  };

  const centerOnMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (!myLocation?.coords) {
      toast.error("You're not sharing your location right now");
      return;
    }
    map.flyTo({ center: [myLocation.coords.lng, myLocation.coords.lat], zoom: 15, essential: true });
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Neutralize mapbox-gl's default white popup chrome so our own themed card (built in
          buildPopupHtml) is the entire visible surface — no mismatched frame behind it.
          pointer-events:none is load-bearing: without it, the popup's own DOM sits right next
          to the marker and can itself receive mouseenter/mouseleave, fighting with the marker's
          hover handlers and causing a rapid open/close flicker. The one carve-out is the close
          button drawn inside buildPopupHtml, which needs to stay clickable. */}
      <style>{`
        .locator-popup { pointer-events: none; }
        .locator-popup .mapboxgl-popup-content { background: transparent; box-shadow: none; padding: 0; border-radius: 14px; }
        .locator-popup .mapboxgl-popup-tip { display: none; }
        .locator-popup .popup-close-btn { pointer-events: auto; }
        .locator-popup .popup-close-btn:hover { opacity: .8; }
      `}</style>

      <LocatorMap
        mapboxToken={mapboxToken}
        mapRef={mapRef}
        onZoomIn={() => zoomMap(1)}
        onZoomOut={() => zoomMap(-1)}
        onCenter={centerOnMe}
        mapNotice={mapNotice}
        activeCount={sharingCount}
        stateCounts={stateCounts}
        zoomInDisabled={zoom >= MAX_ZOOM}
        zoomOutDisabled={zoom <= MIN_ZOOM}
        pickModeActive={!!placePickMode}
        places={places}
        jumpTarget={jumpTarget}
        onJumpTargetChange={setJumpTarget}
        onJump={handleJumpToPlace}
      />

      {!isLoading && locations.filter((l) => l.sharingState !== "off_duty").length === 0 && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Nobody is sharing their location yet. Turn on <span className="font-semibold">My Location</span> to appear on the map.
        </p>
      )}
    </div>
  );
}
