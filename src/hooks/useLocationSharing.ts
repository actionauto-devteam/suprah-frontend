import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { getDeviceType } from "@/lib/device";
import { withMinDuration } from "@/lib/utils";
import type { SharingState } from "./useLocator";

const PING_INTERVAL_MS = 30_000;
const MPS_TO_MPH = 2.23694;

type SharingRuntime = {
  sharingState: SharingState;
  lastPingAt: string | null;
  error: string | null;
  watchId: number | null;
  lastSentAt: number;
  manuallyPaused: boolean;
  busy: boolean;
  // True from the moment a fresh GPS watch is started until the first ping either
  // succeeds or errors out — the UI shows a "getting your location…" state for this
  // window instead of looking like sharing silently did nothing.
  awaitingFirstFix: boolean;
  listeners: Set<() => void>;
};

const runtime: SharingRuntime = {
  sharingState: "off_duty",
  lastPingAt: null,
  error: null,
  watchId: null,
  lastSentAt: 0,
  manuallyPaused: false,
  busy: false,
  awaitingFirstFix: false,
  listeners: new Set(),
};

const notifyListeners = () => runtime.listeners.forEach((l) => l());

async function readBatteryInfo(): Promise<{ batteryLevel?: number; isCharging?: boolean }> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<any> };
  if (typeof nav.getBattery !== "function") return {};
  try {
    const battery = await nav.getBattery();
    return { batteryLevel: Math.round(battery.level * 100), isCharging: battery.charging };
  } catch {
    return {};
  }
}

function readConnectionInfo(): { connectionType?: string; effectiveType?: string; downlinkMbps?: number } {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; type?: string };
  };
  const conn = nav.connection;
  if (!conn) return {};
  return {
    // Real physical medium — most browsers (esp. desktop Chrome) don't expose this at all.
    connectionType: conn.type && conn.type !== "unknown" ? conn.type : undefined,
    // Bandwidth-class heuristic ("4g"/"3g"/...) — kept separate from connectionType so it's
    // never presented as an actual cellular connection for a wired/Wi-Fi desktop.
    effectiveType: conn.effectiveType,
    downlinkMbps: typeof conn.downlink === "number" ? conn.downlink : undefined,
  };
}

function clearWatch() {
  if (runtime.watchId !== null) {
    navigator.geolocation.clearWatch(runtime.watchId);
    runtime.watchId = null;
  }
}

type AuthHeaders = { headers?: { Authorization: string } };

export function useLocationSharing({
  eligible, onBreak, getAuthHeaders,
}: {
  eligible: boolean;
  onBreak: boolean;
  /** Overrides how requests are authenticated — defaults to the main-site `useAuth()` token.
   * Callers outside the main auth context (e.g. TimeProof's CRM-mode users) pass their own
   * resolver so this hook's single module-level runtime can serve both, instead of each
   * surface running its own separate GPS-watch/ping engine that fight over sharing state. */
  getAuthHeaders?: () => Promise<AuthHeaders>;
}) {
  const { getToken } = useAuth();
  const defaultAuthHeaders = useCallback(async (): Promise<AuthHeaders> => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);
  const resolveAuthHeaders = getAuthHeaders ?? defaultAuthHeaders;
  const [sharingState, setSharingState] = useState(runtime.sharingState);
  const [lastPingAt, setLastPingAt] = useState(runtime.lastPingAt);
  const [error, setError] = useState(runtime.error);
  const [busy, setBusy] = useState(runtime.busy);
  const [awaitingFirstFix, setAwaitingFirstFix] = useState(runtime.awaitingFirstFix);

  const syncFromRuntime = useRef(() => {
    setSharingState(runtime.sharingState);
    setLastPingAt(runtime.lastPingAt);
    setError(runtime.error);
    setBusy(runtime.busy);
    setAwaitingFirstFix(runtime.awaitingFirstFix);
  });

  const sendPing = useCallback(
    async (position: GeolocationPosition) => {
      try {
        const headers = await resolveAuthHeaders();
        const battery = await readBatteryInfo();
        const { data } = await apiClient.pingLocation(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speedMph: position.coords.speed != null ? Math.round(position.coords.speed * MPS_TO_MPH) : undefined,
            accuracyM: position.coords.accuracy ?? undefined,
            connectivity: navigator.onLine ? "online" : "offline",
            deviceType: getDeviceType(),
            ...readConnectionInfo(),
            ...battery,
          },
          headers,
        );
        runtime.sharingState = data?.data?.sharingState ?? "sharing";
        runtime.lastPingAt = new Date().toISOString();
        runtime.error = null;
        runtime.awaitingFirstFix = false;
        notifyListeners();
      } catch (err: any) {
        runtime.error = err?.response?.data?.message || err?.message || "Failed to share location";
        runtime.awaitingFirstFix = false;
        notifyListeners();
      }
    },
    [resolveAuthHeaders],
  );

  // Best-effort — lets the admin know fast instead of waiting on the connection-lost cron,
  // since OS-level permission revokes never touch a guarded endpoint on their own.
  const reportPermissionDeniedToServer = useCallback(async () => {
    try {
      const headers = await resolveAuthHeaders();
      await apiClient.reportLocationPermissionDenied(headers);
    } catch {
      // best-effort
    }
  }, [resolveAuthHeaders]);

  const startWatch = useCallback(() => {
    if (runtime.watchId !== null || !navigator.geolocation) return;
    runtime.awaitingFirstFix = true;
    notifyListeners();

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - runtime.lastSentAt >= PING_INTERVAL_MS) {
          runtime.lastSentAt = now;
          sendPing(position);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Not coming back on its own — no point leaving the watch running.
          runtime.error = "Location permission was denied — check your browser/device location settings.";
          runtime.sharingState = "declined_permission";
          runtime.awaitingFirstFix = false;
          clearWatch();
          reportPermissionDeniedToServer();
        } else if (err.code === err.TIMEOUT) {
          // Usually transient (indoors/weak GPS) — the browser keeps the watch running and
          // can still succeed later, so don't kill it. Just let the UI know it's taking a while.
          runtime.error = "Still trying to get a GPS fix — this can take longer indoors or with a weak signal.";
        } else {
          runtime.error = `Location error: ${err.message}`;
          runtime.awaitingFirstFix = false;
          clearWatch();
        }
        notifyListeners();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    runtime.watchId = id;
  }, [sendPing, reportPermissionDeniedToServer]);

  const setPausedState = useCallback(
    async (reason: "manual" | "break") => {
      clearWatch();
      runtime.sharingState = reason === "break" ? "paused_break" : "paused_manual";
      notifyListeners();
      try {
        const headers = await resolveAuthHeaders();
        await withMinDuration(
          apiClient.pauseLocationSharing({ reason }, headers),
        );
      } catch {
        // best-effort — local pause already stopped the watch
      }
    },
    [resolveAuthHeaders],
  );

  // Guards against rapid repeat clicks firing overlapping pause/resume requests —
  // without this, spamming the button could race two in-flight requests and leave
  // the shared runtime.sharingState out of sync with what the server has.
  const resumeSharing = useCallback(async () => {
    if (runtime.busy) return;
    runtime.manuallyPaused = false;
    if (!eligible || onBreak) return;
    runtime.busy = true;
    notifyListeners();
    try {
      const headers = await resolveAuthHeaders();
      await withMinDuration(
        apiClient.resumeLocationSharing(headers),
      );
      runtime.sharingState = "sharing";
      startWatch();
    } catch (err: any) {
      runtime.error = err?.response?.data?.message || err?.message || "Failed to resume sharing";
    } finally {
      runtime.busy = false;
      notifyListeners();
    }
  }, [eligible, onBreak, resolveAuthHeaders, startWatch]);

  const pauseManually = useCallback(async () => {
    if (runtime.busy) return;
    runtime.manuallyPaused = true;
    runtime.busy = true;
    notifyListeners();
    try {
      await setPausedState("manual");
    } finally {
      runtime.busy = false;
      notifyListeners();
    }
  }, [setPausedState]);

  useEffect(() => {
    const sync = syncFromRuntime.current;
    runtime.listeners.add(sync);
    sync();
    return () => {
      runtime.listeners.delete(sync);
    };
  }, []);

  // Faster than waiting for watchPosition's own error callback (which only fires on the next
  // fix attempt) — reacts the moment the OS/browser permission actually flips to denied.
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;
    const handleChange = () => {
      if (permissionStatus?.state === "denied") {
        runtime.error = "Location permission was denied — check your browser/device location settings.";
        runtime.sharingState = "declined_permission";
        clearWatch();
        notifyListeners();
        reportPermissionDeniedToServer();
      }
    };
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        status.addEventListener("change", handleChange);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener("change", handleChange);
    };
  }, [reportPermissionDeniedToServer]);

  useEffect(() => {
    if (!eligible) {
      clearWatch();
      runtime.sharingState = "off_duty";
      notifyListeners();
      return;
    }
    if (onBreak) {
      setPausedState("break");
      return;
    }
    if (runtime.manuallyPaused) return;
    // Don't optimistically flip to "sharing" here — that used to happen before a single real
    // GPS fix had been sent, so the UI would claim "Sharing" while nobody else could actually
    // see you yet (still acquiring). `awaitingFirstFix` (set inside startWatch) is what the UI
    // should key off during that window; `sendPing`'s own success is what sets "sharing" for real.
    startWatch();
  }, [eligible, onBreak, startWatch, setPausedState]);

  return { sharingState, lastPingAt, error, pauseManually, resumeSharing, busy, awaitingFirstFix };
}
