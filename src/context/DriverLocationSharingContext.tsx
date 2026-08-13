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
  isLoadPolicyResolved: boolean;
  locationPermissionState: "unknown" | "prompt" | "granted" | "denied" | "unsupported";
  isLocationAccessBlocked: boolean;
  isRecoveringLocationAccess: boolean;
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
  const [isLoadPolicyResolved, setIsLoadPolicyResolved] =
    React.useState(false);
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
  const [locationPermissionState, setLocationPermissionState] = React.useState<
    "unknown" | "prompt" | "granted" | "denied" | "unsupported"
  >("unknown");
  const [isRecoveringLocationAccess, setIsRecoveringLocationAccess] =
    React.useState(false);

  const watchIdRef = React.useRef<number | null>(null);
  const heartbeatTimerRef = React.useRef<number | null>(null);
  const lastCoordsRef = React.useRef<{ lat: number; lng: number } | null>(null);
  const lastPositionSendRef = React.useRef(0);
  const statusRef = React.useRef<DriverStatus>(shareStatus);
  const manualSharingEnabledRef = React.useRef(false);
  const hasActiveLoadRef = React.useRef(false);
  const sharingEnabledRef = React.useRef(false);
  const isSharingRef = React.useRef(false);
  const locationPermissionStateRef = React.useRef<
    "unknown" | "prompt" | "granted" | "denied" | "unsupported"
  >("unknown");
  const locationOfflineSignaledRef = React.useRef(false);
  const autoReloadTimerRef = React.useRef<number | null>(null);
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
    locationPermissionStateRef.current = locationPermissionState;
  }, [locationPermissionState]);

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
      const nextStatus = statusOverride ?? statusRef.current;

      // Once browser/device location access has been lost, never reuse the
      // driver's last known coordinates/status. This applies with or without
      // an active load so Driver Tracker cannot keep showing a stale
      // Idle/Waiting/On Break/On Route state.
      if (
        locationOfflineSignaledRef.current &&
        nextStatus !== "offline"
      ) {
        return;
      }

      await postLocation(coords, nextStatus);

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

  const signalLocationPermissionOffline = React.useCallback(() => {
    if (locationOfflineSignaledRef.current) {
      return;
    }

    locationOfflineSignaledRef.current = true;
    setIsSharing(false);
    setIsStarting(false);

    // Active-load drivers keep the dedicated backend endpoint because it also
    // preserves the required GPS-silence monitoring flow.
    if (hasActiveLoadRef.current) {
      void (async () => {
        try {
          const token = await getToken();
          if (!token) return;

          await apiClient.post(
            "/api/driver-tracking/location-offline",
            {
              lat: lastCoordsRef.current?.lat,
              lng: lastCoordsRef.current?.lng,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (error: any) {
          if (!mountedRef.current) return;
          setShareError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to publish the required Offline GPS state",
          );
        }
      })();
      return;
    }

    // No active load: do not start the 10-minute dispatcher alert flow.
    // Publish Offline through the normal heartbeat using the last valid
    // coordinates solely so Driver Tracker immediately reflects Offline.
    void sendOfflineHeartbeat();
  }, [getToken, sendOfflineHeartbeat]);

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

      if (mountedRef.current) {
        setIsLoadPolicyResolved(true);
      }
    } catch (error: any) {
      // Keep the first policy check fail-closed so a transient API failure
      // cannot create a click-through window while requirements are unknown.
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
      setLocationPermissionState("unsupported");
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

    locationOfflineSignaledRef.current = false;
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

  const clearLocationRecoveryReload = React.useCallback(() => {
    if (
      typeof window !== "undefined" &&
      autoReloadTimerRef.current !== null
    ) {
      window.clearTimeout(autoReloadTimerRef.current);
      autoReloadTimerRef.current = null;
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(
        "driver-location-permission-auto-reload",
      );
    }
  }, []);

  const scheduleLocationRecoveryReload = React.useCallback(() => {
    if (
      typeof window === "undefined" ||
      !hasActiveLoadRef.current
    ) {
      return;
    }

    const guardKey =
      "driver-location-permission-auto-reload";

    if (sessionStorage.getItem(guardKey) === "pending") {
      return;
    }

    sessionStorage.setItem(guardKey, "pending");

    if (autoReloadTimerRef.current !== null) {
      window.clearTimeout(autoReloadTimerRef.current);
    }

    // Reload is a fallback only. Give the browser a short opportunity to
    // activate the restored permission and return a live GPS fix first.
    autoReloadTimerRef.current = window.setTimeout(() => {
      window.location.reload();
    }, 2_500);
  }, []);

  const recoverFromRestoredLocationPermission = React.useCallback(() => {
    const wasDenied =
      locationPermissionStateRef.current === "denied";

    locationPermissionStateRef.current = "granted";
    setLocationPermissionState("granted");

    const shouldResumeSharing =
      hasActiveLoadRef.current ||
      manualSharingEnabledRef.current;

    // Prompt -> Granted does not need special recovery. If a previously denied
    // no-load driver had manually enabled GPS, restore that live sharing too.
    if (!wasDenied || !shouldResumeSharing) {
      setIsRecoveringLocationAccess(false);
      clearLocationRecoveryReload();
      return;
    }

    setShareError(null);
    setIsRecoveringLocationAccess(true);
    setIsStarting(true);

    // First try to recover WITHOUT reloading the page.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        lastCoordsRef.current = coords;
        locationOfflineSignaledRef.current = false;
        setLastCoords(coords);
        locationPermissionStateRef.current = "granted";
        setLocationPermissionState("granted");

        clearLocationRecoveryReload();

        void sendHeartbeat(coords)
          .then(() => {
            if (!mountedRef.current) return;
            setIsRecoveringLocationAccess(false);
            setIsStarting(false);
            setIsSharing(true);
            setShareError(null);
          })
          .catch((error: any) => {
            if (!mountedRef.current) return;

            setShareError(
              error?.response?.data?.message ||
                error?.message ||
                (hasActiveLoadRef.current
                  ? "GPS is reconnecting. The Driver Portal may refresh once to apply location access."
                  : "GPS could not reconnect after location access was restored."),
            );

            // Automatic reload remains an active-load enforcement fallback.
            if (hasActiveLoadRef.current) {
              scheduleLocationRecoveryReload();
            } else {
              setIsRecoveringLocationAccess(false);
              setIsStarting(false);
            }
          });
      },
      (error) => {
        if (!mountedRef.current) return;

        setShareError(
          error.message ||
            "Location access was restored but GPS could not reconnect yet.",
        );

        // No-load manual sharing should never force a page reload.
        if (hasActiveLoadRef.current) {
          scheduleLocationRecoveryReload();
        } else {
          setIsRecoveringLocationAccess(false);
          setIsStarting(false);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 2_000,
      },
    );
  }, [
    clearLocationRecoveryReload,
    scheduleLocationRecoveryReload,
    sendHeartbeat,
  ]);

  // After a successful non-reload recovery (or after the refreshed page
  // mounts with working location), clear the reload guard so a completely new
  // future permission incident can use the fallback again.
  React.useEffect(() => {
    if (
      !hasActiveLoad ||
      locationPermissionState !== "granted" ||
      isRecoveringLocationAccess
    ) {
      return;
    }

    clearLocationRecoveryReload();
  }, [
    clearLocationRecoveryReload,
    hasActiveLoad,
    isRecoveringLocationAccess,
    locationPermissionState,
  ]);

  React.useEffect(() => {
    if (!sharingEnabled || !isSignedIn) return;

    if (!navigator.geolocation) {
      setLocationPermissionState("unsupported");
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

      if (
        locationPermissionStateRef.current === "denied" ||
        locationOfflineSignaledRef.current
      ) {
        return;
      }

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      lastCoordsRef.current = coords;
      locationOfflineSignaledRef.current = false;

      if (mountedRef.current) {
        setLastCoords(coords);
        locationPermissionStateRef.current = "granted";
        setLocationPermissionState("granted");
        setIsRecoveringLocationAccess(false);
        clearLocationRecoveryReload();
      }

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
        locationPermissionStateRef.current = "denied";
        setLocationPermissionState("denied");
        setIsRecoveringLocationAccess(false);

        signalLocationPermissionOffline();

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
      if (
        locationPermissionStateRef.current === "denied" ||
        locationOfflineSignaledRef.current
      ) {
        return;
      }

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
      if (!permissionStatus) return;

      if (permissionStatus.state === "granted") {
        const previousPermissionState =
          locationPermissionStateRef.current;

        recoverFromRestoredLocationPermission();

        // Prompt -> Granted does not need recovery/reload logic.
        if (previousPermissionState !== "denied") {
          setShareError(null);
          setIsStarting(true);
          refreshWhenVisible();
        }
      } else if (permissionStatus.state === "denied") {
        locationPermissionStateRef.current = "denied";
        setLocationPermissionState("denied");
        setIsRecoveringLocationAccess(false);

        signalLocationPermissionOffline();

        setShareError(
          hasActiveLoadRef.current
            ? "Location permission is required while you have an active load. Enable location access for this site."
            : "Location permission is blocked. Enable it if you want to share your location.",
        );
      } else {
        locationPermissionStateRef.current =
          permissionStatus.state;
        setLocationPermissionState(permissionStatus.state);
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
          locationPermissionStateRef.current = permission.state;
          setLocationPermissionState(permission.state);
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

      if (autoReloadTimerRef.current !== null) {
        window.clearTimeout(autoReloadTimerRef.current);
        autoReloadTimerRef.current = null;
      }
    };
  }, [
    clearLocationRecoveryReload,
    sharingEnabled,
    isSignedIn,
    recoverFromRestoredLocationPermission,
    sendHeartbeat,
    signalLocationPermissionOffline,
  ]);

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
        isLoadPolicyResolved,
        locationPermissionState,
        isLocationAccessBlocked:
          hasActiveLoad &&
          (locationPermissionState !== "granted" ||
            isRecoveringLocationAccess),
        isRecoveringLocationAccess,
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
        isLoadPolicyResolved,
        locationPermissionState,
        isRecoveringLocationAccess,
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