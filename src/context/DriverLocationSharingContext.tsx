"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import type { DriverStatus } from "@/types/driver-tracking";

const HEARTBEAT_INTERVAL_MS = 30_000;
const POSITION_SEND_THROTTLE_MS = 10_000;
const ENABLED_KEY_PREFIX = "driver-gps-sharing-enabled";
const STATUS_KEY_PREFIX = "driver-gps-sharing-status";

interface DriverLocationSharingContextValue {
  isSharing: boolean;
  isStarting: boolean;
  shareStatus: DriverStatus;
  setShareStatus: (status: DriverStatus) => void;
  lastShareAt: string | null;
  lastCoords: { lat: number; lng: number } | null;
  shareError: string | null;
  startSharing: () => void;
  stopSharing: () => Promise<void>;
}

const DriverLocationSharingContext =
  React.createContext<DriverLocationSharingContextValue | null>(null);

function storageKey(prefix: string, userId?: string | null) {
  return `${prefix}:${userId || "unknown"}`;
}

function isShareableStatus(value: string | null): value is DriverStatus {
  return (
    value === "on-route" ||
    value === "idle" ||
    value === "on-break" ||
    value === "waiting"
  );
}

export function DriverLocationSharingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const userId = user?.id ?? null;

  // sharingEnabled is the user's persisted intent. isSharing means the
  // backend has actually confirmed at least one successful heartbeat.
  const [sharingEnabled, setSharingEnabled] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [shareStatus, setShareStatusState] =
    React.useState<DriverStatus>("idle");
  const [lastShareAt, setLastShareAt] = React.useState<string | null>(null);
  const [lastCoords, setLastCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [shareError, setShareError] = React.useState<string | null>(null);

  const watchIdRef = React.useRef<number | null>(null);
  const heartbeatTimerRef = React.useRef<number | null>(null);
  const lastCoordsRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const lastPositionSendRef = React.useRef(0);
  const statusRef = React.useRef<DriverStatus>(shareStatus);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    statusRef.current = shareStatus;
  }, [shareStatus]);

  React.useEffect(() => {
    // React Strict Mode intentionally mounts/cleans up/mounts effects in
    // development. Reset the flag on every setup so successful heartbeats
    // are still allowed to update UI state after the Strict Mode probe.
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sendHeartbeat = React.useCallback(
    async (
      coords: { lat: number; lng: number },
      statusOverride?: DriverStatus,
    ) => {
      if (!isSignedIn) return;

      const token = await getToken();
      if (!token) throw new Error("Authentication token is unavailable");

      await apiClient.post(
        "/api/driver-tracking/heartbeat",
        {
          lat: coords.lat,
          lng: coords.lng,
          status: statusOverride ?? statusRef.current,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (mountedRef.current) {
        setLastShareAt(new Date().toLocaleTimeString());
        setShareError(null);

        if ((statusOverride ?? statusRef.current) === "offline") {
          setIsSharing(false);
          setIsStarting(false);
        } else {
          // "LIVE" is only true after the server accepted the heartbeat.
          setIsSharing(false);
          setIsStarting(true);
          setSharingEnabled(true);
          setIsStarting(false);
        }
      }
    },
    [getToken, isSignedIn],
  );

  const persistEnabled = React.useCallback(
    (enabled: boolean) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(
        storageKey(ENABLED_KEY_PREFIX, userId),
        enabled ? "true" : "false",
      );
    },
    [userId],
  );

  const setShareStatus = React.useCallback(
    (status: DriverStatus) => {
      if (status === "offline") return;
      setShareStatusState(status);
      statusRef.current = status;

      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey(STATUS_KEY_PREFIX, userId), status);
      }

      if (sharingEnabled && lastCoordsRef.current) {
        void sendHeartbeat(lastCoordsRef.current, status).catch((error: any) => {
          if (mountedRef.current) {
            setShareError(
              error?.response?.data?.message ||
                error?.message ||
                "Failed to update driver status",
            );
          }
        });
      }
    },
    [sharingEnabled, sendHeartbeat, userId],
  );

  const startSharing = React.useCallback(() => {
    if (!navigator.geolocation) {
      setShareError("Geolocation is not supported on this device");
      return;
    }

    persistEnabled(true);
    setShareError(null);
    setIsSharing(false);
    setIsStarting(true);
    setSharingEnabled(true);
  }, [persistEnabled]);

  const stopSharing = React.useCallback(async () => {
    persistEnabled(false);
    setSharingEnabled(false);
    setIsStarting(false);
    setIsSharing(false);

    const coords = lastCoordsRef.current;
    if (!coords) return;

    try {
      await sendHeartbeat(coords, "offline");
    } catch (error: any) {
      if (mountedRef.current) {
        setShareError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to stop location sharing",
        );
      }
    }
  }, [persistEnabled, sendHeartbeat]);

  // Restore the driver's explicit sharing preference. For existing users that
  // have never stored a preference, an already-granted browser geolocation
  // permission is treated as an existing opt-in so tracking resumes after the
  // user signs back in or navigates between driver pages. A browser in the
  // "prompt" state is never prompted automatically; Start Sharing remains the
  // user gesture that requests permission.
  React.useEffect(() => {
    if (!isSignedIn || !userId || typeof window === "undefined") return;

    const storedStatus = localStorage.getItem(
      storageKey(STATUS_KEY_PREFIX, userId),
    );
    if (isShareableStatus(storedStatus)) {
      setShareStatusState(storedStatus);
      statusRef.current = storedStatus;
    }

    const storedEnabled = localStorage.getItem(
      storageKey(ENABLED_KEY_PREFIX, userId),
    );

    if (storedEnabled === "true") {
      setIsSharing(false);
      setIsStarting(true);
      setSharingEnabled(true);
      return;
    }
    if (storedEnabled === "false") {
      setSharingEnabled(false);
      setIsStarting(false);
      setIsSharing(false);
      return;
    }

    if (!("permissions" in navigator)) return;

    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((permission) => {
        if (cancelled) return;
        if (permission.state === "granted") {
          localStorage.setItem(
            storageKey(ENABLED_KEY_PREFIX, userId),
            "true",
          );
          setIsSharing(true);
        }
      })
      .catch(() => {
        // Some browsers do not expose geolocation through Permissions API.
        // In that case we wait for the explicit Start Sharing action.
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  // One watcher lives at the driver-layout level, so navigation between Driver
  // Account pages no longer destroys GPS tracking. A periodic heartbeat reuses
  // the last known coordinates even while the vehicle is stationary; relying
  // only on watchPosition callbacks can make lastSeenAt go stale when the
  // browser decides there has been no meaningful position change.
  React.useEffect(() => {
    if (!sharingEnabled || !isSignedIn) return;

    if (!navigator.geolocation) {
      setShareError("Geolocation is not supported on this device");
      persistEnabled(false);
      setSharingEnabled(false);
      setIsStarting(false);
      setIsSharing(false);
      return;
    }

    let cancelled = false;

    const reportPosition = (position: GeolocationPosition, force = false) => {
      if (cancelled) return;

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      lastCoordsRef.current = coords;
      if (mountedRef.current) setLastCoords(coords);

      const now = Date.now();
      if (!force && now - lastPositionSendRef.current < POSITION_SEND_THROTTLE_MS) {
        return;
      }
      lastPositionSendRef.current = now;

      void sendHeartbeat(coords).catch((error: any) => {
        if (!cancelled && mountedRef.current) {
          setIsSharing(false);
          setIsStarting(true);
          setShareError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to broadcast driver location",
          );
        }
      });
    };

    const handleGeoError = (error: GeolocationPositionError) => {
      if (cancelled || !mountedRef.current) return;

      setShareError(error.message || "Unable to read your location");

      if (error.code === error.PERMISSION_DENIED) {
        persistEnabled(false);
        setSharingEnabled(false);
        setIsStarting(false);
        setIsSharing(false);
      }
    };

    // Prime the location immediately. This also makes a permission failure
    // visible instead of waiting for a later watchPosition callback.
    navigator.geolocation.getCurrentPosition(
      (position) => reportPosition(position, true),
      handleGeoError,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => reportPosition(position),
      handleGeoError,
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    heartbeatTimerRef.current = window.setInterval(() => {
      const coords = lastCoordsRef.current;
      if (!coords) return;
      void sendHeartbeat(coords).catch((error: any) => {
        if (!cancelled && mountedRef.current) {
          setIsSharing(false);
          setIsStarting(true);
          setShareError(
            error?.response?.data?.message ||
              error?.message ||
              "Driver location heartbeat failed",
          );
        }
      });
    }, HEARTBEAT_INTERVAL_MS);

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;

      navigator.geolocation.getCurrentPosition(
        (position) => reportPosition(position, true),
        handleGeoError,
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
      );
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (heartbeatTimerRef.current !== null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [sharingEnabled, isSignedIn, persistEnabled, sendHeartbeat]);

  const value = React.useMemo<DriverLocationSharingContextValue>(
    () => ({
      isSharing,
      isStarting,
      shareStatus,
      setShareStatus,
      lastShareAt,
      lastCoords,
      shareError,
      startSharing,
      stopSharing,
    }),
    [
      isSharing,
      isStarting,
      shareStatus,
      setShareStatus,
      lastShareAt,
      lastCoords,
      shareError,
      startSharing,
      stopSharing,
    ],
  );

  return (
    <DriverLocationSharingContext.Provider value={value}>
      {children}
    </DriverLocationSharingContext.Provider>
  );
}

export function useDriverLocationSharing() {
  const context = React.useContext(DriverLocationSharingContext);
  if (!context) {
    throw new Error(
      "useDriverLocationSharing must be used inside DriverLocationSharingProvider",
    );
  }
  return context;
}

export function useOptionalDriverLocationSharing() {
  return React.useContext(DriverLocationSharingContext);
}