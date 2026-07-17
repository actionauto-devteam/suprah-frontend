"use client";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
import { PLACE_ICON_PRESETS } from "./placeIcons";
import { deptLabel } from "@/lib/departments";
import { haversineMi, formatDistanceMi } from "@/lib/geo";

// Real Lucide SVG icon (same set the admin picker uses) instead of an emoji glyph — emoji
// renders inconsistently (font, color, even presence) across OS/browsers, an actual SVG
// looks identical everywhere and matches the rest of the app's icon language.
function placeIconSvg(icon?: string) {
  const Icon = PLACE_ICON_PRESETS[icon || ""] || PLACE_ICON_PRESETS.MapPin;
  return renderToStaticMarkup(React.createElement(Icon, { style: { width: 15, height: 15, color: "#ffffff" } }));
}

const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

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
const CLUSTER_RADIUS_PX = 45;
const CLUSTER_AVATAR_SIZE = 26;
const CLUSTER_AVATAR_OVERLAP = 10;
const CLUSTER_STACK_MAX = 3;
// A "last known spot" pin is only useful while recent — a days-old pin (stale device,
// abandoned test account, dead ping loop) is just clutter, especially paired with a name
// that can never resolve. Keeps the live map map to what's actually still relevant; the
// roster's own "Last seen X ago" text is unaffected — this only trims map markers.
const MAP_PIN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Deterministic, purely-local pixel-distance clustering — no dependency on Mapbox's async
// tile/worker pipeline (the previous cluster:true GeoJSON source + querySourceFeatures
// approach could report an empty result before its internal tiles finished building, which
// hid every single marker until it settled — this can't have that failure mode since
// map.project() is synchronous camera math, never tied to tile/style loading). Grouping
// self-adjusts with zoom for free: at low zoom, far-apart people become pixel-close and
// merge into a stack; at high zoom the same real-world distance spreads back out in pixels
// and they separate again, with no manual max-zoom cutoff needed.
function groupByPixelDistance(
  visible: ActiveEmployeeLocation[],
  project: (lngLat: [number, number]) => { x: number; y: number },
  pinnedIds: Set<string>,
): ActiveEmployeeLocation[][] {
  const sorted = [...visible].sort((a, b) => a.userId.localeCompare(b.userId));
  const points = new Map(sorted.map((l) => [l.userId, project([l.coords.lng, l.coords.lat])]));
  const assigned = new Set<string>();
  const groups: ActiveEmployeeLocation[][] = [];

  for (const loc of sorted) {
    if (pinnedIds.has(loc.userId)) {
      groups.push([loc]);
      assigned.add(loc.userId);
    }
  }

  for (const loc of sorted) {
    if (assigned.has(loc.userId)) continue;
    const p1 = points.get(loc.userId)!;
    const group = [loc];
    assigned.add(loc.userId);
    for (const other of sorted) {
      if (assigned.has(other.userId)) continue;
      const p2 = points.get(other.userId)!;
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_PX) {
        group.push(other);
        assigned.add(other.userId);
      }
    }
    groups.push(group);
  }
  return groups;
}

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

const MATCH_CHUNK_SIZE = 100;

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
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function stackAvatarBadge(member: { userAvatar?: string; userName: string }, size: number) {
  return member.userAvatar
    ? `<img src="${escapeHtml(member.userAvatar)}" style="width:${size}px;height:${size}px;border-radius:9999px;object-fit:cover;border:2px solid #ffffff;display:block;background:#e5e7eb" />`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:#64748b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.4)}px;font-weight:900;border:2px solid #ffffff">${escapeHtml(initialsOf(member.userName || "?"))}</div>`;
}

// Renders a Slack/Discord-style overlapping avatar stack for a Mapbox cluster bubble instead
// of a plain numbered circle — the boss's own feedback ("stack their icons rather than
// number") for people who are grouped together on the map at the current zoom.
function buildClusterStackHtml(members: { userAvatar?: string; userName: string }[], totalCount: number) {
  const shown = members.slice(0, CLUSTER_STACK_MAX);
  const step = CLUSTER_AVATAR_SIZE - CLUSTER_AVATAR_OVERLAP;
  const avatarsHtml = shown
    .map((m, i) => `<div style="position:absolute;left:${i * step}px;top:0;z-index:${shown.length - i}">${stackAvatarBadge(m, CLUSTER_AVATAR_SIZE)}</div>`)
    .join("");
  const extra = totalCount - shown.length;
  const badgeLeft = shown.length * step;
  const extraHtml = extra > 0
    ? `<div style="position:absolute;left:${badgeLeft}px;top:0;height:${CLUSTER_AVATAR_SIZE}px;min-width:${CLUSTER_AVATAR_SIZE}px;padding:0 4px;border-radius:9999px;background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;border:2px solid #ffffff;box-sizing:border-box">+${extra}</div>`
    : "";
  const width = badgeLeft + (extra > 0 ? CLUSTER_AVATAR_SIZE + 4 : CLUSTER_AVATAR_SIZE);
  return `<div style="position:relative;height:${CLUSTER_AVATAR_SIZE}px;width:${width}px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))">${avatarsHtml}${extraHtml}</div>`;
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

function buildPlacePopupHtml(place: Place, hereNow: number, theme: "light" | "dark") {
  const pal = POPUP_PALETTE[theme];
  const color = place.color || "#3b82f6";
  const safeName = escapeHtml(place.name);
  const safeAddress = place.address ? escapeHtml(place.address) : "";
  const safeDescription = place.description ? escapeHtml(place.description) : "";

  return `
    <div style="font-family:inherit;font-size:12px;line-height:1.4;min-width:190px;max-width:240px;background:${pal.bg};color:${pal.text};border-radius:14px;overflow:hidden;box-shadow:${pal.shadow};border:1px solid ${pal.border}">
      <div style="height:4px;background:${color}"></div>
      <div style="padding:10px 12px 9px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:30px;height:30px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${placeIconSvg(place.icon)}</div>
          <div style="min-width:0;flex:1">
            <div style="font-weight:800;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeName}</div>
            ${safeAddress ? `<div style="color:${pal.muted};font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeAddress}</div>` : ""}
          </div>
        </div>

        ${safeDescription ? `<div style="margin-top:7px;color:${pal.muted};font-size:10.5px;line-height:1.4">${safeDescription}</div>` : ""}

        <div style="display:flex;align-items:center;gap:5px;margin-top:8px;background:${color}14;border:1px solid ${color}33;border-radius:8px;padding:4px 8px">
          <span style="color:${color};font-weight:700;font-size:11px">${hereNow > 0 ? `${hereNow} here now` : "Nobody here right now"}</span>
        </div>

        <div style="margin-top:7px;padding-top:6px;border-top:1px solid ${pal.divider};color:${pal.muted};font-size:9.5px">${place.radiusM}m geofence radius</div>
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
  const [bearing, setBearing] = React.useState(0);
  const [isMaximized, setIsMaximized] = React.useState(false);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, {
    marker: any; popup: any; circleEl: HTMLDivElement; haloEl: HTMLDivElement;
    lastState: string; lastSelected: boolean; lastHaloScale: number | null; isSelf: boolean;
  }>>(new Map());
  const placeMarkersRef = React.useRef<Map<string, { marker: any; badgeEl: HTMLDivElement; popup: any }>>(new Map());
  const locationsRef = React.useRef(locations);
  locationsRef.current = locations;
  const clusterMarkersRef = React.useRef<Map<string, { marker: any; el: HTMLDivElement }>>(new Map());
  const hasAutoFitRef = React.useRef(false);
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null);
  const [mapNotice, setMapNotice] = React.useState<string | null>(null);
  const [viewGeneration, setViewGeneration] = React.useState(0);
  const viewUpdateRafRef = React.useRef<number | null>(null);
  // Coalesces the many zoom/move ticks a single drag or pinch gesture fires into at most one
  // regroup per animation frame — recomputing only on zoomend/moveend (gesture-end) made
  // clustering visibly "pop" into place only after you let go, instead of tracking the
  // gesture live.
  const scheduleViewUpdate = React.useCallback(() => {
    if (viewUpdateRafRef.current !== null) return;
    viewUpdateRafRef.current = requestAnimationFrame(() => {
      viewUpdateRafRef.current = null;
      setViewGeneration((g) => g + 1);
    });
  }, []);

  const selectRef = React.useRef(onSelectUser);
  selectRef.current = onSelectUser;
  const clearSelectionRef = React.useRef(onClearSelection);
  clearSelectionRef.current = onClearSelection;
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

  React.useEffect(() => {
    if (!mapboxToken || !mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;

    let loadTimeout: number | undefined;

    const initMap = async () => {
      try {
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

        // Mapbox's "idle" event is the only thing that clears the loading notice — if the
        // style/tile request stalls or fails silently without emitting an "error" event, the
        // notice would otherwise stay stuck forever. This timeout guarantees the user always
        // sees a terminal state.
        loadTimeout = window.setTimeout(() => {
          if (!map.isStyleLoaded()) {
            setMapNotice("Map style not loaded. Check token or network.");
          }
        }, 8000);

        map.on("load", () => {
          window.clearTimeout(loadTimeout);
          map.resize();
        });
        map.on("idle", () => {
          window.clearTimeout(loadTimeout);
          setMapNotice(null);
        });
        map.on("error", (e: any) => {
          window.clearTimeout(loadTimeout);
          const status = e?.error?.status;
          const message = e?.error?.message || "Map failed to load";
          setMapNotice(status ? `${message} (HTTP ${status})` : message);
        });
        map.on("zoom", () => setZoom(map.getZoom()));
        map.on("rotate", () => setBearing(map.getBearing()));
        map.on("zoom", scheduleViewUpdate);
        map.on("move", scheduleViewUpdate);

        // Container size can change without the window resizing (maximize toggle, device
        // rotation, sidebar collapse) — Mapbox only auto-detects the very first layout, so
        // without this the canvas keeps rendering at its old size until something else
        // happens to call resize().
        if (typeof ResizeObserver !== "undefined" && mapRef.current) {
          const observer = new ResizeObserver(() => map.resize());
          observer.observe(mapRef.current);
          resizeObserverRef.current = observer;
        }

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
      } catch {
        if (!cancelled) setMapNotice("Failed to initialize map");
      }
    };

    initMap();
    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      if (focusRef) focusRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (viewUpdateRafRef.current !== null) {
        cancelAnimationFrame(viewUpdateRafRef.current);
        viewUpdateRafRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapboxToken, scheduleViewUpdate]);

  React.useEffect(() => {
    document.body.style.overflow = isMaximized ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMaximized]);

  const resetNorth = () => {
    mapInstanceRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 300 });
  };

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mapThemeRef.current === theme) return;
    mapThemeRef.current = theme;
    setMapNotice("Applying theme...");
    map.setStyle(theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12");
    const themeTimeout = window.setTimeout(() => setMapNotice(null), 8000);
    map.once("idle", () => {
      window.clearTimeout(themeTimeout);
      setMapNotice(null);
    });
    return () => window.clearTimeout(themeTimeout);
  }, [theme]);

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

      const visible = locations.filter(
        (l) => l.coords && Date.now() - new Date(l.lastSeenAt).getTime() <= MAP_PIN_MAX_AGE_MS,
      );

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
      const nextIds = new Set(visible.map((l) => l.userId));
      const viewerCoords = myLocation?.coords ?? null;

      const boxShadowFor = (isSelected: boolean, isSelf: boolean) => {
        if (isSelected) return "0 0 0 3px rgba(37,99,235,0.35), 0 3px 8px rgba(0,0,0,.35)";
        if (isSelf) return "0 0 0 2px rgba(37,99,235,0.5), 0 2px 6px rgba(0,0,0,.3)";
        return "0 2px 6px rgba(0,0,0,.3)";
      };

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
        const lngLat: [number, number] = [loc.coords.lng, loc.coords.lat];
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

        popup.on("open", () => {
          const closeBtn = popup.getElement()?.querySelector<HTMLButtonElement>(".popup-close-btn");
          closeBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            clearSelectionRef.current?.();
          });
        });

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

      markers.forEach((entry, userId) => {
        if (userId === selectedUserId) entry.popup.addTo(map);
        else entry.popup.remove();
      });

      const pinnedIds = new Set<string>();
      if (selectedUserId) pinnedIds.add(selectedUserId);
      if (myUserId) pinnedIds.add(myUserId);
      const groups = groupByPixelDistance(visible, (lngLat) => map.project(lngLat), pinnedIds);
      const clusterGroups = groups.filter((g) => g.length > 1);

      const hiddenIds = new Set<string>();
      for (const g of clusterGroups) for (const l of g) hiddenIds.add(l.userId);
      markers.forEach((entry, userId) => {
        entry.marker.getElement().style.display = hiddenIds.has(userId) ? "none" : "";
      });

      const clusterMarkers = clusterMarkersRef.current;
      const nextClusterKeys = new Set(clusterGroups.map((g) => g.map((l) => l.userId).sort().join("|")));
      clusterMarkers.forEach((entry, key) => {
        if (!nextClusterKeys.has(key)) {
          entry.marker.remove();
          clusterMarkers.delete(key);
        }
      });

      clusterGroups.forEach((group) => {
        const sortedGroup = [...group].sort((a, b) => a.userId.localeCompare(b.userId));
        const key = sortedGroup.map((l) => l.userId).join("|");
        const anchor = sortedGroup[0];
        const lngLat: [number, number] = [anchor.coords.lng, anchor.coords.lat];
        const html = buildClusterStackHtml(
          sortedGroup.slice(0, CLUSTER_STACK_MAX).map((l) => ({ userAvatar: l.userAvatar, userName: l.userName })),
          sortedGroup.length,
        );

        const existingCluster = clusterMarkers.get(key);
        if (existingCluster) {
          existingCluster.marker.setLngLat(lngLat);
          existingCluster.el.innerHTML = html;
          return;
        }

        const el = document.createElement("div");
        el.style.cursor = "pointer";
        el.innerHTML = html;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          map.easeTo({ center: lngLat, zoom: Math.min(MAX_ZOOM, map.getZoom() + 3) });
        });
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map);
        clusterMarkers.set(key, { marker, el });
      });
    };

    run();
  }, [locations, places, selectedUserId, myUserId, myLocation, theme, viewGeneration]);

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

      trailGeojsonRef.current = trailGeojson(coords, coords);
      repaint();

      if (coords.length > 1) {
        const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }

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

      const run = async () => {
        const mapboxgl = (await import("mapbox-gl")).default;
        const nextIds = new Set(overlayPlacesRef.current.map((p) => p._id));

        placeMarkers.forEach((entry, id) => {
          if (!nextIds.has(id)) {
            entry.marker.remove();
            entry.popup.remove();
            placeMarkers.delete(id);
          }
        });

        const hereNowFor = (placeId: string) =>
          locationsRef.current.filter((l) => l.sharingState === "sharing" && l.currentPlaceId === placeId).length;

        overlayPlacesRef.current.forEach((p) => {
          const color = p.color || "#3b82f6";
          const existing = placeMarkers.get(p._id);
          if (existing) {
            existing.marker.setLngLat([p.coords.lng, p.coords.lat]);
            existing.badgeEl.style.background = color;
            existing.badgeEl.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 3px ${color}33`;
            existing.badgeEl.innerHTML = placeIconSvg(p.icon);
            existing.popup.setLngLat([p.coords.lng, p.coords.lat]);
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
          badgeEl.style.background = color;
          badgeEl.style.border = "2.5px solid white";
          badgeEl.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 3px ${color}33`;
          badgeEl.innerHTML = placeIconSvg(p.icon);
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

          const popup = new mapboxgl.Popup({ offset: [0, -34], closeButton: false, closeOnClick: false, className: "locator-popup" })
            .setLngLat([p.coords.lng, p.coords.lat]);

          wrapper.addEventListener("mouseenter", () => {
            popup.setHTML(buildPlacePopupHtml(overlayPlacesRef.current.find((op) => op._id === p._id) ?? p, hereNowFor(p._id), mapThemeRef.current ?? "light"));
            popup.addTo(map);
          });
          wrapper.addEventListener("mouseleave", () => popup.remove());

          wrapper.addEventListener("click", (e) => {
            e.stopPropagation();
            map.flyTo({ center: [p.coords.lng, p.coords.lat], zoom: 16, essential: true });
          });

          const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
            .setLngLat([p.coords.lng, p.coords.lat])
            .addTo(map);

          placeMarkers.set(p._id, { marker, badgeEl, popup });
        });
      };
      run();
    };

    renderPlaces();
    map.on("styledata", renderPlaces);
    return () => map.off("styledata", renderPlaces);
  }, [overlayPlaces, mapNotice, theme]);

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
      { }
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
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized((v) => !v)}
        bearing={bearing}
        onResetNorth={resetNorth}
      />

      {!isLoading && locations.filter((l) => l.sharingState !== "off_duty").length === 0 && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Nobody is sharing their location yet. Turn on <span className="font-semibold">My Location</span> to appear on the map.
        </p>
      )}
    </div>
  );
}
