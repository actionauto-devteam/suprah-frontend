"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import type { DriverStatus } from "@/types/driver-tracking";

const HEARTBEAT_INTERVAL_MS = 30_000;
const POSITION_SEND_THROTTLE_MS = 10_000;
const LOAD_STATE_POLL_MS = 15_000;

const STATUS_KEY_PREFIX = "driver-gps-sharing-status";
const MANUAL_ENABLED_KEY_PREFIX = "driver-gps-sharing-enabled";

const ACTIVE_LOAD_STATUSES = new Set([
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
]);

interface DriverLocationSharingContextValue {
  isSharing: boolean;
  isStarting: boolean;
  shareStatus: DriverStatus;
  setShareStatus: (status: DriverStatus) => void;
  lastShareAt: string | null;
  lastCoords: { lat: number; lng: number } | null;
  shareError: string | null;
  hasActiveLoad: boolean;
  isLocationRequired: boolean;
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

  const [sharingEnabled, setSharingEnabled] = React.useState(false);
  const [manualSharingEnabled, setManualSharingEnabled] =
    React.useState(false);
  const [hasActiveLoad, setHasActiveLoad] = React.useState(false);
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
  const manualSharingEnabledRef = React.useRef(false);
  const hasActiveLoadRef = React.useRef(false);
  const sharingEnabledRef = React.useRef(false);
  const isSharingRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    statusRef.current = shareStatus;
  }, [shareStatus]);

  React.useEffect(() => {
    manualSharingEnabledRef.current = manualSharingEnabled;
  }, [manualSharingEnabled]);

  React.useEffect(() => {
    hasActiveLoadRef.current = hasActiveLoad;
  }, [hasActiveLoad]);

  React.useEffect(() => {
    sharingEnabledRef.current = sharingEnabled;
  }, [sharingEnabled]);

  React.useEffect(() => {
    isSharingRef.current = isSharing;
  }, [isSharing]);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistManualSharing = React.useCallback(
    (enabled: boolean) => {
      manualSharingEnabledRef.current = enabled;
      setManualSharingEnabled(enabled);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey(MANUAL_ENABLED_KEY_PREFIX, userId),
          enabled ? "true" : "false",
        );
      }
    },
    [userId],
  );

  const postLocation = React.useCallback(
    async (
      coords: { lat: number; lng: number },
      status: DriverStatus,
    ) => {
      if (!isSignedIn) return;

      const token = await getToken();
      if (!token) throw new Error("Authentication token is unavailable");

      await apiClient.post(
        "/api/driver-tracking/heartbeat",
        {
          lat: coords.lat,
          lng: coords.lng,
          status,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    },
    [getToken, isSignedIn],
  );

  const sendHeartbeat = React.useCallback(
    async (
      coords: { lat: number; lng: number },
      statusOverride?: DriverStatus,
    ) => {
      await postLocation(
        coords,
        statusOverride ?? statusRef.current,
      );

      if (!mountedRef.current) return;

      const shouldRemainEnabled =
        hasActiveLoadRef.current ||
        manualSharingEnabledRef.current;

      setLastShareAt(new Date().toLocaleTimeString());
      setShareError(null);
      setSharingEnabled(shouldRemainEnabled);
      setIsSharing(shouldRemainEnabled);
      setIsStarting(false);
    },
    [postLocation],
  );

  const sendOfflineHeartbeat = React.useCallback(async () => {
    const coords = lastCoordsRef.current;
    if (!coords) return;

    try {
      await postLocation(coords, "offline");
      if (mountedRef.current) {
        setLastShareAt(new Date().toLocaleTimeString());
      }
    } catch (error: any) {
      if (mountedRef.current) {
        setShareError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to update GPS offline status",
        );
      }
    }
  }, [postLocation]);

  const setShareStatus = React.useCallback(
    (status: DriverStatus) => {
      if (status === "offline") return;

      setShareStatusState(status);
      statusRef.current = status;

      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey(STATUS_KEY_PREFIX, userId),
          status,
        );
      }

      if (lastCoordsRef.current && sharingEnabledRef.current) {
        void sendHeartbeat(lastCoordsRef.current, status).catch(
          (error: any) => {
            if (mountedRef.current) {
              setShareError(
                error?.response?.data?.message ||
                  error?.message ||
                  "Failed to update driver status",
              );
            }
          },
        );
      }
    },
    [sendHeartbeat, userId],
  );

  const applyLoadPolicy = React.useCallback(
    async (nextHasActiveLoad: boolean) => {
      const previousHasActiveLoad = hasActiveLoadRef.current;
      hasActiveLoadRef.current = nextHasActiveLoad;
      setHasActiveLoad(nextHasActiveLoad);

      if (nextHasActiveLoad) {
        // Active load always overrides the driver's manual no-load preference.
        setShareError(null);
        setSharingEnabled(true);

        if (!isSharingRef.current) {
          setIsStarting(true);
        }
        return;
      }

      // No active loads: return control to the driver's saved manual preference.
      const shouldShareManually = manualSharingEnabledRef.current;
      setSharingEnabled(shouldShareManually);

      if (shouldShareManually) {
        if (!isSharingRef.current) setIsStarting(true);
        return;
      }

      // If forced tracking just ended because the last active load was
      // delivered/removed/reassigned, immediately mark the driver offline.
      if (
        previousHasActiveLoad ||
        isSharingRef.current ||
        sharingEnabledRef.current
      ) {
        await sendOfflineHeartbeat();
      }

      setIsStarting(false);
      setIsSharing(false);
    },
    [sendOfflineHeartbeat],
  );

  const refreshActiveLoadState = React.useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiClient.get(
        "/api/driver-tracking/my-loads",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const data = response.data?.data;
      const loads = Array.isArray(data)
        ? data
        : Array.isArray(data?.loads)
          ? data.loads
          : [];

      const nextHasActiveLoad = loads.some((load: any) =>
        ACTIVE_LOAD_STATUSES.has(String(load?.status)),
      );

      await applyLoadPolicy(nextHasActiveLoad);
    } catch (error: any) {
      // Do not shut GPS off just because load-state verification failed.
      if (mountedRef.current && hasActiveLoadRef.current) {
        setShareError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to verify load status. Required GPS tracking remains active.",
        );
      }
    }
  }, [applyLoadPolicy, getToken, isSignedIn]);

  const startSharing = React.useCallback(() => {
    if (!navigator.geolocation) {
      setShareError("Geolocation is not supported on this device");
      setIsSharing(false);
      setIsStarting(false);
      return;
    }

    // When there is no active load, this is the driver's explicit preference.
    // During an active load the same call is harmless and does not change the
    // saved no-load preference.
    if (!hasActiveLoadRef.current) {
      persistManualSharing(true);
    }

    setShareError(null);
    setIsSharing(false);
    setIsStarting(true);
    setSharingEnabled(true);
  }, [persistManualSharing]);

  const stopSharing = React.useCallback(async () => {
    if (hasActiveLoadRef.current) {
      setShareError(
        "GPS tracking is required while you have an active load and cannot be turned off.",
      );
      setSharingEnabled(true);
      return;
    }

    persistManualSharing(false);
    setSharingEnabled(false);
    setIsStarting(false);
    setIsSharing(false);
    await sendOfflineHeartbeat();
  }, [persistManualSharing, sendOfflineHeartbeat]);

  // Restore the driver's operational status + their manual no-load GPS choice,
  // then let the current load state decide whether that choice can be overridden.
  React.useEffect(() => {
    if (!isSignedIn || !userId || typeof window === "undefined") return;

    const storedStatus = localStorage.getItem(
      storageKey(STATUS_KEY_PREFIX, userId),
    );
    if (isShareableStatus(storedStatus)) {
      setShareStatusState(storedStatus);
      statusRef.current = storedStatus;
    }

    const storedManual =
      localStorage.getItem(
        storageKey(MANUAL_ENABLED_KEY_PREFIX, userId),
      ) === "true";

    manualSharingEnabledRef.current = storedManual;
    setManualSharingEnabled(storedManual);

    void refreshActiveLoadState();
  }, [isSignedIn, refreshActiveLoadState, userId]);

  // React immediately to dispatcher assignment/reassignment and driver-side
  // load lifecycle changes. Polling remains as a fallback for missed sockets.
  React.useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    let interval: number | null = null;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const handleLoadsUpdated = () => {
      if (!cancelled) void refreshActiveLoadState();
    };

    const connect = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        socket = initializeSocket(token);
        socket.on("driver:loads_updated", handleLoadsUpdated);
        socket.on("load:change", handleLoadsUpdated);

        interval = window.setInterval(
          handleLoadsUpdated,
          LOAD_STATE_POLL_MS,
        );
      } catch {
        interval = window.setInterval(
          handleLoadsUpdated,
          LOAD_STATE_POLL_MS,
        );
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      socket?.off("driver:loads_updated", handleLoadsUpdated);
      socket?.off("load:change", handleLoadsUpdated);
    };
  }, [getToken, isSignedIn, refreshActiveLoadState]);

  React.useEffect(() => {
    if (!sharingEnabled || !isSignedIn) return;

    if (!navigator.geolocation) {
      setShareError(
        hasActiveLoadRef.current
          ? "Location access is required while you have an active load, but geolocation is not supported on this device."
          : "Geolocation is not supported on this device.",
      );
      setSharingEnabled(false);
      setIsStarting(false);
      setIsSharing(false);
      return;
    }

    let cancelled = false;

    const reportPosition = (
      position: GeolocationPosition,
      force = false,
    ) => {
      if (cancelled) return;

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      lastCoordsRef.current = coords;
      if (mountedRef.current) setLastCoords(coords);

      const now = Date.now();
      if (
        !force &&
        now - lastPositionSendRef.current <
          POSITION_SEND_THROTTLE_MS
      ) {
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

    const handleGeoError = (
      error: GeolocationPositionError,
    ) => {
      if (cancelled || !mountedRef.current) return;

      setIsSharing(false);
      setIsStarting(false);

      if (error.code === error.PERMISSION_DENIED) {
        setShareError(
          hasActiveLoadRef.current
            ? "Location permission is required while you have an active load. Enable location access for this site."
            : "Location permission is blocked. Enable it if you want to share your location.",
        );
        return;
      }

      setShareError(error.message || "Unable to read your location");
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;

      navigator.geolocation.getCurrentPosition(
        (position) => reportPosition(position, true),
        handleGeoError,
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 15_000,
        },
      );
    };

    navigator.geolocation.getCurrentPosition(
      (position) => reportPosition(position, true),
      handleGeoError,
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => reportPosition(position),
        handleGeoError,
        {
          enableHighAccuracy: true,
          maximumAge: 5_000,
          timeout: 20_000,
        },
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

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );
    window.addEventListener("focus", refreshWhenVisible);

    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => {
      if (permissionStatus?.state === "granted") {
        setShareError(null);
        setIsStarting(true);
        refreshWhenVisible();
      } else if (permissionStatus?.state === "denied") {
        setIsSharing(false);
        setIsStarting(false);
        setShareError(
          hasActiveLoadRef.current
            ? "Location permission is required while you have an active load. Enable location access for this site."
            : "Location permission is blocked. Enable it if you want to share your location.",
        );
      }
    };

    if ("permissions" in navigator) {
      void navigator.permissions
        .query({
          name: "geolocation" as PermissionName,
        })
        .then((permission) => {
          if (cancelled) return;
          permissionStatus = permission;
          permission.addEventListener(
            "change",
            handlePermissionChange,
          );
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
      window.removeEventListener("focus", refreshWhenVisible);
      permissionStatus?.removeEventListener(
        "change",
        handlePermissionChange,
      );

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (heartbeatTimerRef.current !== null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [sharingEnabled, isSignedIn, sendHeartbeat]);

  const value =
    React.useMemo<DriverLocationSharingContextValue>(
      () => ({
        isSharing,
        isStarting,
        shareStatus,
        setShareStatus,
        lastShareAt,
        lastCoords,
        shareError,
        hasActiveLoad,
        isLocationRequired: hasActiveLoad,
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
        hasActiveLoad,
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
  const context = React.useContext(
    DriverLocationSharingContext,
  );

  if (!context) {
    throw new Error(
      "useDriverLocationSharing must be used inside DriverLocationSharingProvider",
    );
  }

  return context;
}

export function useOptionalDriverLocationSharing() {
  return React.useContext(
    DriverLocationSharingContext,
  );
}