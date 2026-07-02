import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
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
  listeners: Set<() => void>;
};

const runtime: SharingRuntime = {
  sharingState: "off_duty",
  lastPingAt: null,
  error: null,
  watchId: null,
  lastSentAt: 0,
  manuallyPaused: false,
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

function clearWatch() {
  if (runtime.watchId !== null) {
    navigator.geolocation.clearWatch(runtime.watchId);
    runtime.watchId = null;
  }
}

export function useLocationSharing({ eligible, onBreak }: { eligible: boolean; onBreak: boolean }) {
  const { getToken } = useAuth();
  const [sharingState, setSharingState] = useState(runtime.sharingState);
  const [lastPingAt, setLastPingAt] = useState(runtime.lastPingAt);
  const [error, setError] = useState(runtime.error);

  const syncFromRuntime = useRef(() => {
    setSharingState(runtime.sharingState);
    setLastPingAt(runtime.lastPingAt);
    setError(runtime.error);
  });

  const sendPing = useCallback(
    async (position: GeolocationPosition) => {
      try {
        const token = await getToken();
        const battery = await readBatteryInfo();
        const { data } = await apiClient.pingLocation(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading ?? undefined,
            speedMph: position.coords.speed != null ? Math.round(position.coords.speed * MPS_TO_MPH) : undefined,
            accuracyM: position.coords.accuracy ?? undefined,
            connectivity: navigator.onLine ? "online" : "offline",
            ...battery,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        runtime.sharingState = data?.data?.sharingState ?? "sharing";
        runtime.lastPingAt = new Date().toISOString();
        runtime.error = null;
        notifyListeners();
      } catch (err: any) {
        runtime.error = err?.response?.data?.message || err?.message || "Failed to share location";
        notifyListeners();
      }
    },
    [getToken],
  );

  const startWatch = useCallback(() => {
    if (runtime.watchId !== null || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - runtime.lastSentAt >= PING_INTERVAL_MS) {
          runtime.lastSentAt = now;
          sendPing(position);
        }
      },
      (err) => {
        runtime.error = `Location error: ${err.message}`;
        runtime.sharingState = err.code === err.PERMISSION_DENIED ? "declined_permission" : runtime.sharingState;
        clearWatch();
        notifyListeners();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    runtime.watchId = id;
  }, [sendPing]);

  const setPausedState = useCallback(
    async (reason: "manual" | "break") => {
      clearWatch();
      runtime.sharingState = reason === "break" ? "paused_break" : "paused_manual";
      notifyListeners();
      try {
        const token = await getToken();
        await apiClient.pauseLocationSharing({ reason }, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // best-effort — local pause already stopped the watch
      }
    },
    [getToken],
  );

  const resumeSharing = useCallback(async () => {
    runtime.manuallyPaused = false;
    if (!eligible || onBreak) return;
    try {
      const token = await getToken();
      await apiClient.resumeLocationSharing({ headers: { Authorization: `Bearer ${token}` } });
      runtime.sharingState = "sharing";
      notifyListeners();
      startWatch();
    } catch (err: any) {
      runtime.error = err?.response?.data?.message || err?.message || "Failed to resume sharing";
      notifyListeners();
    }
  }, [eligible, onBreak, getToken, startWatch]);

  const pauseManually = useCallback(() => {
    runtime.manuallyPaused = true;
    setPausedState("manual");
  }, [setPausedState]);

  useEffect(() => {
    const sync = syncFromRuntime.current;
    runtime.listeners.add(sync);
    sync();
    return () => {
      runtime.listeners.delete(sync);
    };
  }, []);

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
    startWatch();
    if (runtime.sharingState !== "sharing") {
      runtime.sharingState = "sharing";
      notifyListeners();
    }
  }, [eligible, onBreak, startWatch, setPausedState]);

  return { sharingState, lastPingAt, error, pauseManually, resumeSharing };
}
