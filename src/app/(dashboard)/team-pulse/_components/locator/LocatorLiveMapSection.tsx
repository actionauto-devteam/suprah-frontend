"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Popup as LeafletPopup,
  TileLayer as LeafletTileLayer,
  LayerGroup as LeafletLayerGroup,
  Circle as LeafletCircle,
  LeafletMouseEvent,
} from "leaflet";
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

const TILE_URL = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

// The map's default view is the company's own Utah HQ (see the "Action Auto (HQ)" company
// Place), NOT an auto-computed fit over wherever everyone currently is. This org has staff in
// two real, far-apart regions (Utah and the Philippines) — fitting bounds to include both forces
// an extremely low zoom, at which even genuinely-separate nearby cities visually collapse onto
// each other. That's honest map behavior, not a bug, but it read as "the map is broken" — so the
// default view now shows the home region clearly, with a separate affordance (see `elsewhere`
// below) to fly out to anyone sharing from elsewhere instead of forcing everyone into one view.
const DEFAULT_MAP_VIEW = { lat: 40.349619, lng: -112.073198, zoom: 10.5 };
const FAR_REGION_THRESHOLD_MI = 300;
// A "last known spot" pin is only useful while recent — a days-old pin (stale device,
// abandoned test account, dead ping loop) is just clutter, especially paired with a name
// that can never resolve. Keeps the live map map to what's actually still relevant; the
// roster's own "Last seen X ago" text is unaffected — this only trims map markers.
const MAP_PIN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type MapFocus = (lat: number, lng: number) => void;

const MATCH_CHUNK_SIZE = 100;

// Snaps a raw GPS breadcrumb trail onto the actual road network using OSRM's public Match API
// (osrm-project.org — free, no key; the same open-source engine Mapbox's own paid Map Matching
// API is built on, so this is a like-for-like replacement, not a downgrade). Coordinates are
// [lat, lng] (Leaflet convention) in and out; OSRM's wire format wants lng,lat like Mapbox's did.
async function matchToRoads(coords: [number, number][]): Promise<[number, number][]> {
  const chunks: [number, number][][] = [];
  for (let i = 0; i < coords.length; i += MATCH_CHUNK_SIZE - 1) {
    const chunk = coords.slice(i, i + MATCH_CHUNK_SIZE);
    if (chunk.length > 1) chunks.push(chunk);
  }

  const matchedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const coordStr = chunk.map(([lat, lng]) => `${lng},${lat}`).join(";");
        const radiuses = chunk.map(() => "25").join(";");
        const url = `https://router.project-osrm.org/match/v1/driving/${coordStr}?geometries=geojson&overview=full&radiuses=${radiuses}`;
        const res = await fetch(url);
        if (!res.ok) return chunk;
        const data = await res.json();
        const matched = data?.code === "Ok" ? data.matchings?.[0]?.geometry?.coordinates : null;
        return Array.isArray(matched) && matched.length > 1
          ? (matched.map(([lng, lat]: [number, number]) => [lat, lng]) as [number, number][])
          : chunk;
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

  // Above this, the dot is worth flagging as "approximate" rather than letting an admin
  // assume a slightly-off pin means the app itself is broken — matches haloScale()'s own
  // "notably imprecise" tier so the chip and the visual halo agree with each other.
  const gpsAccuracy = typeof loc.accuracyM === "number" && loc.accuracyM > 40
    ? popupChip(pal, "GPS", `±${Math.round(loc.accuracyM)}m — approximate`)
    : null;

  const chips = [
    duration ? popupChip(pal, "Sharing For", duration) : null,
    typeof loc.speedMph === "number" ? popupChip(pal, "Speed", `${loc.speedMph} mph`) : null,
    typeof loc.batteryLevel === "number" ? popupChip(pal, "Battery", `${loc.batteryLevel}%${loc.isCharging ? " ⚡" : ""}`) : null,
    loc.sharingState === "sharing" ? popupChip(pal, "Signal", signal.label) : null,
    loc.deviceType ? popupChip(pal, "Device", loc.deviceType === "mobile" ? "📱 Phone" : "💻 Computer") : null,
    distanceMi !== null ? popupChip(pal, "Distance", `${formatDistanceMi(distanceMi)} away`) : null,
    gpsAccuracy,
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

        <div style="margin-top:7px;padding-top:6px;border-top:1px solid ${pal.divider};color:${pal.muted};font-size:9.5px">${place.radiusM}m geofence radius${place.warningRadiusM ? ` &middot; ${place.warningRadiusM}m warning zone` : ""}</div>
      </div>
    </div>`;
}

interface Props {
  selectedUserId?: string | null;
  onSelectUser?: (userId: string) => void;
  onClearSelection?: () => void;
  historyPoints?: LocationHistoryPoint[];
  /** Off-road personnel (Lot Tech) get their raw GPS breadcrumb trail — forcing driving-profile
   * road matching onto someone walking/driving around a vehicle lot (not a mapped road) produces
   * a "route jumps backward" artifact: it tries to snap slow/near-stationary noise onto the
   * nearest driveable road and can zig-zag doing so. Defaults to true (road-snapping stays on
   * for everyone else, e.g. sales reps driving to appointments). Same trade-off as before the
   * move off Mapbox — this flag was never about per-point indoor/outdoor detection, just a
   * department-level toggle, and still is. */
  snapHistoryToRoads?: boolean;
  focusRef?: React.MutableRefObject<MapFocus | null>;
  myUserId?: string | null;
  placePickMode?: boolean;
  onPlacePicked?: (lat: number, lng: number) => void;
  draftPlace?: Place | null;
}

export function LocatorLiveMapSection({
  selectedUserId, onSelectUser, onClearSelection, historyPoints = [], snapHistoryToRoads = true, focusRef,
  myUserId, placePickMode, onPlacePicked, draftPlace,
}: Props) {
  const { theme } = useTheme();

  const { data: locations = [], isLoading } = useActiveEmployeeLocations(true);
  const { data: places = [] } = usePlaces();
  const [jumpTarget, setJumpTarget] = React.useState("");
  const [zoom, setZoom] = React.useState(DEFAULT_MAP_VIEW.zoom);
  const [isMaximized, setIsMaximized] = React.useState(false);
  // The Leaflet map itself is created inside an async effect (dynamic `import("leaflet")`), so
  // on first mount every other effect below can run BEFORE `mapInstanceRef.current` exists and
  // silently no-op — with nothing in their own dependency arrays to guarantee a retry once the
  // map actually becomes ready. This flips exactly once, right when the map is constructed, and
  // is included as a dependency everywhere so each effect is guaranteed at least one real run.
  const [mapReady, setMapReady] = React.useState(false);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  const tileLayerRef = React.useRef<LeafletTileLayer | null>(null);
  const markersRef = React.useRef<Map<string, {
    marker: LeafletMarker; popup: LeafletPopup; circleEl: HTMLDivElement; haloEl: HTMLDivElement; approxEl: HTMLSpanElement;
    lastState: string; lastSelected: boolean; lastHaloScale: number | null; lastApprox: boolean; isSelf: boolean;
  }>>(new Map());
  const placeMarkersRef = React.useRef<Map<string, { marker: LeafletMarker; layerGroup: LeafletLayerGroup; haloCircle: LeafletCircle; mainCircle: LeafletCircle; warningCircle: LeafletCircle | null; badgeEl: HTMLDivElement; popup: LeafletPopup }>>(new Map());
  const trailLayerRef = React.useRef<LeafletLayerGroup | null>(null);
  const locationsRef = React.useRef(locations);
  locationsRef.current = locations;

  // Init goes through an explicit state machine instead of a single "notice" string so a
  // hung `import("leaflet")`/tile fetch (flaky connection, blocked CDN, etc.) can't leave the
  // user staring at a loading placeholder forever — it always resolves to either "ready" or a
  // dismissible, retryable failure within MAP_INIT_TIMEOUT_MS.
  const [mapStatus, setMapStatus] = React.useState<"loading" | "ready" | "error" | "timeout" | "tilesFailed">("loading");
  const [retryKey, setRetryKey] = React.useState(0);
  const retryMap = React.useCallback(() => setRetryKey((k) => k + 1), []);

  const MAP_NOTICE_TEXT: Record<"loading" | "error" | "timeout" | "tilesFailed", string> = {
    loading: "Loading map…",
    error: "Couldn't initialize the map.",
    timeout: "The map is taking longer than expected to load.",
    tilesFailed: "Map tiles failed to load — check your connection.",
  };
  const mapNotice = mapStatus === "ready" ? null : MAP_NOTICE_TEXT[mapStatus];

  const selectRef = React.useRef(onSelectUser);
  selectRef.current = onSelectUser;
  const clearSelectionRef = React.useRef(onClearSelection);
  clearSelectionRef.current = onClearSelection;

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

  const sharingCount = locations.filter((l) => l.sharingState === "sharing").length;
  const myLocation = myUserId ? locations.find((l) => l.userId === myUserId) : undefined;
  const stateCounts = React.useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const l of locations) counts[l.sharingState] = (counts[l.sharingState] ?? 0) + 1;
    return counts;
  }, [locations]);

  // People sharing from far outside the home region (see DEFAULT_MAP_VIEW) — surfaced as an
  // explicit "N elsewhere" affordance instead of folding them into the default view, which is
  // what used to force the map to zoom out to a near-useless level. Real-world distance, not
  // screen pixels — has nothing to do with the marker-clustering approaches tried (and reverted)
  // before, and doesn't hide or merge anyone's individual marker.
  const elsewhere = React.useMemo(
    () => locations.filter((l) => l.coords && haversineMi(DEFAULT_MAP_VIEW, l.coords) > FAR_REGION_THRESHOLD_MI),
    [locations],
  );

  function flyToPlace(place: Place) {
    mapInstanceRef.current?.flyTo([place.coords.lat, place.coords.lng], 16);
  }

  function handleJumpToPlace() {
    const place = places.find((p) => p._id === jumpTarget);
    if (place) flyToPlace(place);
  }

  function viewElsewhere() {
    const map = mapInstanceRef.current;
    if (!map || elsewhere.length === 0) return;
    const bounds = elsewhere.map((l) => [l.coords.lat, l.coords.lng] as [number, number]);
    map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 12, duration: 0.8 });
  }

  function goHome() {
    mapInstanceRef.current?.flyTo([DEFAULT_MAP_VIEW.lat, DEFAULT_MAP_VIEW.lng], DEFAULT_MAP_VIEW.zoom);
  }

  // Hard ceiling on the "loading" state — a hung dynamic import or a tile CDN that never
  // responds must not leave the map stuck on a loading placeholder indefinitely.
  const MAP_INIT_TIMEOUT_MS = 12000;
  // How long to wait, once the map itself is up, for at least one tile to actually paint
  // before treating the tile layer as failed (vs. just the normal brief blank-tile flash).
  const TILE_LOAD_GRACE_MS = 8000;

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;
    setMapStatus("loading");

    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !mapInstanceRef.current) setMapStatus("timeout");
    }, MAP_INIT_TIMEOUT_MS);

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [DEFAULT_MAP_VIEW.lat, DEFAULT_MAP_VIEW.lng],
          zoom: DEFAULT_MAP_VIEW.zoom,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          zoomControl: false,
          attributionControl: true,
        });
        mapInstanceRef.current = map;

        const tileLayer = L.tileLayer(TILE_URL[theme], {
          subdomains: "abcd",
          maxZoom: MAX_ZOOM,
          attribution: TILE_ATTRIBUTION,
          // Raster tiles always show a brief blank/white flash while a new tile image loads —
          // normal for any slippy map (Google Maps/OSM do the same), not specific to this app.
          // These options trade a little extra network/memory for noticeably less of it: keep a
          // wider ring of already-loaded tiles around the viewport so panning/zooming out reuses
          // them instead of blanking, and don't throw away/refetch tiles on every intermediate
          // frame of a zoom gesture, only once it settles.
          keepBuffer: 4,
          updateWhenZooming: false,
          detectRetina: true,
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        clearTimeout(timeoutId);
        setMapReady(true);
        setMapStatus("ready");
        map.on("zoom", () => setZoom(map.getZoom()));

        // If literally every tile in the first load errors out (blocked CDN, offline, DNS
        // issue) the map itself is "ready" but shows nothing useful — surface that distinctly
        // from a genuine init failure, rather than leaving a silently blank gray box.
        let sawSuccessfulTile = false;
        tileLayer.on("tileload", () => {
          sawSuccessfulTile = true;
        });
        const tileGraceId = window.setTimeout(() => {
          if (!cancelled && !sawSuccessfulTile) setMapStatus("tilesFailed");
        }, TILE_LOAD_GRACE_MS);
        tileLayer.once("tileload", () => clearTimeout(tileGraceId));

        // Container size can change without the window resizing (maximize toggle, device
        // rotation, sidebar collapse) — Leaflet doesn't auto-detect that, so without this the
        // canvas keeps rendering at its old size until something else triggers a recalculation.
        if (typeof ResizeObserver !== "undefined" && mapRef.current) {
          const observer = new ResizeObserver(() => map.invalidateSize());
          observer.observe(mapRef.current);
          resizeObserverRef.current = observer;
        }

        map.on("click", (e: LeafletMouseEvent) => {
          if (placePickModeRef.current) {
            onPlacePickedRef.current?.(e.latlng.lat, e.latlng.lng);
            return;
          }
          clearSelectionRef.current?.();
        });

        if (focusRef) {
          focusRef.current = (lat: number, lng: number) => {
            map.flyTo([lat, lng], 15);
            mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          };
        }
      } catch {
        clearTimeout(timeoutId);
        if (!cancelled) setMapStatus("error");
      }
    };

    initMap();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      setMapReady(false);
      if (focusRef) focusRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  React.useEffect(() => {
    document.body.style.overflow = isMaximized ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMaximized]);

  React.useEffect(() => {
    tileLayerRef.current?.setUrl(TILE_URL[theme]);
  }, [theme]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const markers = markersRef.current;

      const visible = locations.filter(
        (l) => l.coords && Date.now() - new Date(l.lastSeenAt).getTime() <= MAP_PIN_MAX_AGE_MS,
      );

      const nextIds = new Set(visible.map((l) => l.userId));
      const viewerCoords = myLocation?.coords ?? null;

      const boxShadowFor = (isSelected: boolean, isSelf: boolean) => {
        if (isSelected) return "0 0 0 3px rgba(37,99,235,0.35), 0 3px 8px rgba(0,0,0,.35)";
        if (isSelf) return "0 0 0 2px rgba(37,99,235,0.5), 0 2px 6px rgba(0,0,0,.3)";
        return "0 2px 6px rgba(0,0,0,.3)";
      };

      markers.forEach((entry, userId) => {
        if (!nextIds.has(userId)) {
          map.removeLayer(entry.marker);
          map.removeLayer(entry.popup);
          markers.delete(userId);
        }
      });

      // Every visible person always gets their own marker at their own true coordinate, at
      // every zoom level — no clustering into a synthetic averaged/anchored group position.
      // Multiple clustering rewrites (11th/12th/13th/19th/21st passes) each reintroduced this
      // same bug in a new shape — hiding someone's real marker behind a merged badge always
      // means their icon isn't at their real spot. Overlapping markers at very low zoom simply
      // stack (z-index below), same as any normal map's pins — always honest about where
      // someone actually is. Do not reintroduce clustering here again.
      visible.forEach((loc) => {
        const color = STATE_HEX[loc.sharingState] ?? STATE_HEX.off_duty;
        const isSelected = loc.userId === selectedUserId;
        const isSelf = !!myUserId && loc.userId === myUserId;
        const isLastSeen = loc.sharingState === "off_duty";
        const latLng: [number, number] = [loc.coords.lat, loc.coords.lng];
        const place = loc.currentPlaceId ? placesRef.current.find((p) => p._id === loc.currentPlaceId) : undefined;
        const existing = markers.get(loc.userId);

        const haloScaleNow = haloScale(loc.accuracyM);
        // Same "loose" tier haloScale() already uses — surfaced as a visible badge on the
        // icon itself (not just inside the hover popup), so a genuinely weak-signal pin
        // reads as "approximate" instead of looking like a bug when someone glances at the map.
        const isApprox = typeof loc.accuracyM === "number" && loc.accuracyM > 100;
        const zIndex = isSelected ? 30 : isSelf ? 20 : 10;

        if (existing) {
          existing.marker.setLatLng(latLng);
          existing.popup.setLatLng(latLng);
          existing.popup.setContent(buildPopupHtml(loc, place, viewerCoords, isSelf, theme));
          const el = existing.marker.getElement();
          if (el) {
            el.style.opacity = isLastSeen ? "0.55" : "1";
            el.style.zIndex = String(zIndex);
          }

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
          if (existing.lastApprox !== isApprox) {
            existing.approxEl.style.display = isApprox ? "flex" : "none";
            existing.lastApprox = isApprox;
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
        wrapper.style.zIndex = String(zIndex);

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

        const approxEl = document.createElement("span");
        approxEl.title = "Approximate location — weak GPS signal right now";
        approxEl.textContent = "~";
        approxEl.style.position = "absolute";
        approxEl.style.top = "-2px";
        approxEl.style.left = "-2px";
        approxEl.style.width = "13px";
        approxEl.style.height = "13px";
        approxEl.style.borderRadius = "9999px";
        approxEl.style.background = "#f59e0b";
        approxEl.style.border = "2px solid white";
        approxEl.style.color = "#ffffff";
        approxEl.style.fontSize = "9px";
        approxEl.style.fontWeight = "900";
        approxEl.style.lineHeight = "1";
        approxEl.style.display = isApprox ? "flex" : "none";
        approxEl.style.alignItems = "center";
        approxEl.style.justifyContent = "center";
        approxEl.style.zIndex = "2";
        wrapper.appendChild(approxEl);

        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          selectRef.current?.(loc.userId);
        });

        const marker = L.marker(latLng, {
          icon: L.divIcon({ html: wrapper, className: "locator-marker-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
        }).addTo(map);

        const popup = L.popup({ offset: [0, -(size / 2) - 6], closeButton: false, autoClose: false, closeOnClick: false, className: "locator-popup" })
          .setLatLng(latLng)
          .setContent(buildPopupHtml(loc, place, viewerCoords, isSelf, theme));

        // The close button lives inside popup content that gets replaced wholesale on every
        // `.setContent()` call (every live location update — as often as every few seconds) —
        // Leaflet swaps the inner HTML, which destroys whatever specific button element a
        // direct listener was attached to. Binding once, on the popup's own stable outer
        // container (which `setContent()` never replaces, only its inner content), and
        // delegating by checking the click target survives every future content refresh.
        popup.once("add", () => {
          popup.getElement()?.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest(".popup-close-btn")) {
              e.stopPropagation();
              clearSelectionRef.current?.();
            }
          });
        });

        markers.set(loc.userId, {
          marker, popup, circleEl, haloEl, approxEl, isSelf,
          lastState: loc.sharingState, lastSelected: isSelected, lastHaloScale: haloScaleNow, lastApprox: isApprox,
        });
      });

      markers.forEach((entry, userId) => {
        if (userId === selectedUserId) entry.popup.addTo(map);
        else map.removeLayer(entry.popup);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [locations, places, selectedUserId, myUserId, myLocation, theme, mapReady]);

  // Identifies WHICH trail is currently on screen (who + what span of time) — not the specific
  // array reference, which changes on every background refetch of the exact same trail (React
  // Query's staleTime/refetch-on-focus keeps producing fresh arrays for identical data). Only a
  // genuinely new trail (different person, or a different date range for the same person) should
  // ever recenter the camera; re-fitting on every routine refresh was yanking the view back to
  // whoever's trail is showing — which defaults to your OWN — every time it silently refreshed,
  // fighting any manual pan/zoom you'd just done.
  const historyFitKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let cancelled = false;

    const paintTrail = async (L: typeof import("leaflet"), coords: [number, number][]) => {
      trailLayerRef.current?.remove();
      const group = L.layerGroup();

      L.polyline(coords, { color: "#3b82f6", weight: 3, opacity: 0.85 }).addTo(group);
      coords.forEach((c, i) => {
        const isEdge = i === 0 || i === coords.length - 1;
        L.circleMarker(c, {
          radius: isEdge ? 6 : 3,
          color: "#ffffff",
          weight: 1.5,
          fillColor: isEdge ? "#2563eb" : "#93c5fd",
          fillOpacity: 1,
        }).addTo(group);
      });

      group.addTo(map);
      trailLayerRef.current = group;
    };

    (async () => {
      if (historyPoints.length === 0) {
        trailLayerRef.current?.remove();
        trailLayerRef.current = null;
        historyFitKeyRef.current = null;
        return;
      }
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      const coords = historyPoints.map((h) => [h.coords.lat, h.coords.lng] as [number, number]);
      await paintTrail(L, coords);

      const subject = selectedUserId ?? myUserId ?? "";
      const fitKey = `${subject}:${historyPoints[0].recordedAt}:${historyPoints[historyPoints.length - 1].recordedAt}`;
      if (coords.length > 1 && historyFitKeyRef.current !== fitKey) {
        historyFitKeyRef.current = fitKey;
        map.fitBounds(coords, { padding: [50, 50], maxZoom: 16 });
      }

      if (snapHistoryToRoads && coords.length > 1) {
        const matched = await matchToRoads(coords);
        if (cancelled) return;
        await paintTrail(L, matched);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyPoints, snapHistoryToRoads, mapReady, selectedUserId, myUserId]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const placeMarkers = placeMarkersRef.current;
      const nextIds = new Set(overlayPlaces.map((p) => p._id));

      placeMarkers.forEach((entry, id) => {
        if (!nextIds.has(id)) {
          map.removeLayer(entry.marker);
          map.removeLayer(entry.layerGroup);
          map.removeLayer(entry.popup);
          placeMarkers.delete(id);
        }
      });

      const hereNowFor = (placeId: string) =>
        locationsRef.current.filter((l) => l.sharingState === "sharing" && l.currentPlaceId === placeId).length;

      overlayPlaces.forEach((p) => {
        const color = p.color || "#3b82f6";
        const latLng: [number, number] = [p.coords.lat, p.coords.lng];
        const existing = placeMarkers.get(p._id);
        if (existing) {
          existing.marker.setLatLng(latLng);
          existing.badgeEl.style.background = color;
          existing.badgeEl.style.boxShadow = `0 2px 8px ${color}80, 0 0 0 3px ${color}33`;
          existing.badgeEl.innerHTML = placeIconSvg(p.icon);
          existing.popup.setLatLng(latLng);
          const labelEl = existing.badgeEl.nextElementSibling as HTMLDivElement | null;
          if (labelEl) labelEl.textContent = p.name;
          // Radius/color previously only applied at first render — editing an existing
          // place's geofence (or live-previewing a draft's radius slider) never moved
          // these circles, so the map kept showing the OLD size until a full reload.
          existing.haloCircle.setLatLng(latLng).setRadius(p.radiusM * 1.4).setStyle({ color, fillColor: color });
          existing.mainCircle.setLatLng(latLng).setRadius(p.radiusM).setStyle({ color, fillColor: color });
          if (p.warningRadiusM) {
            if (existing.warningCircle) {
              existing.warningCircle.setLatLng(latLng).setRadius(p.warningRadiusM).setStyle({ color });
            } else {
              existing.warningCircle = L.circle(latLng, {
                radius: p.warningRadiusM, color, weight: 1.5, dashArray: "6 6", fillOpacity: 0,
              }).addTo(existing.layerGroup);
            }
          } else if (existing.warningCircle) {
            existing.layerGroup.removeLayer(existing.warningCircle);
            existing.warningCircle = null;
          }
          return;
        }

        const geofence = L.layerGroup();
        const haloCircle = L.circle(latLng, { radius: p.radiusM * 1.4, color, weight: 0, fillColor: color, fillOpacity: 0.1 }).addTo(geofence);
        const mainCircle = L.circle(latLng, { radius: p.radiusM, color, weight: 2.5, fillColor: color, fillOpacity: 0.16 }).addTo(geofence);
        // Dashed, unfilled — the wider "still nearby" ring (see resolveCurrentPlace's
        // exit hysteresis). Deliberately styled distinct from the solid hard-boundary
        // rings above so it reads as "buffer," not as a second real boundary.
        const warningCircle = p.warningRadiusM
          ? L.circle(latLng, { radius: p.warningRadiusM, color, weight: 1.5, dashArray: "6 6", fillOpacity: 0 }).addTo(geofence)
          : null;
        geofence.addTo(map);

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

        const popup = L.popup({ offset: [0, -34], closeButton: false, autoClose: false, closeOnClick: false, className: "locator-popup" })
          .setLatLng(latLng);

        wrapper.addEventListener("mouseenter", () => {
          popup.setContent(buildPlacePopupHtml(overlayPlacesRef.current.find((op) => op._id === p._id) ?? p, hereNowFor(p._id), theme));
          popup.addTo(map);
        });
        wrapper.addEventListener("mouseleave", () => map.removeLayer(popup));

        wrapper.addEventListener("click", (e) => {
          e.stopPropagation();
          map.flyTo(latLng, 16);
        });

        const marker = L.marker(latLng, {
          icon: L.divIcon({ html: wrapper, className: "locator-marker-icon", iconSize: [30, 49], iconAnchor: [15, 49] }),
        }).addTo(map);

        placeMarkers.set(p._id, { marker, layerGroup: geofence, haloCircle, mainCircle, warningCircle, badgeEl, popup });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [overlayPlaces, theme, mapReady]);

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
    map.flyTo([myLocation.coords.lat, myLocation.coords.lng], 15);
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      { }
      <style>{`
        .locator-marker-icon { background: transparent; border: none; }
        .locator-popup .leaflet-popup-content-wrapper { background: transparent; box-shadow: none; padding: 0; border-radius: 14px; }
        .locator-popup .leaflet-popup-content { margin: 0; }
        .locator-popup .leaflet-popup-tip { display: none; }
        .locator-popup .popup-close-btn { pointer-events: auto; }
        .locator-popup .popup-close-btn:hover { opacity: .8; }
      `}</style>

      <LocatorMap
        mapRef={mapRef}
        onZoomIn={() => zoomMap(1)}
        onZoomOut={() => zoomMap(-1)}
        onCenter={centerOnMe}
        mapNotice={mapNotice}
        mapNoticeLoading={mapStatus === "loading"}
        onRetryMap={mapStatus !== "loading" && mapStatus !== "ready" ? retryMap : undefined}
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
        elsewhereCount={elsewhere.length}
        onViewElsewhere={viewElsewhere}
        onGoHome={goHome}
      />

      {!isLoading && locations.filter((l) => l.sharingState !== "off_duty").length === 0 && (
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Nobody is sharing their location yet. Turn on <span className="font-semibold">My Location</span> to appear on the map.
        </p>
      )}
    </div>
  );
}
