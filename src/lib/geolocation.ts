"use client";

/**
 * Drop-in replacement for `navigator.geolocation` that routes through native
 * Capacitor plugins inside the Suprah iOS app, and falls back to the browser
 * API everywhere else (website, PWA, Android browsers).
 *
 * UPDATE (Nov 2026): the native WATCH path now uses
 * `@capacitor-community/background-geolocation` instead of
 * `@capacitor/geolocation`. The official Geolocation plugin only delivers
 * positions while the app is foregrounded — when the phone locks, iOS
 * suspends the app and the watch dies ("works open, stops locked"). The
 * background plugin runs a properly configured native location session
 * (allowsBackgroundLocationUpdates), which keeps the app — and these JS
 * callbacks — alive with the screen off. Requires, already in place:
 *   - UIBackgroundModes: location            (Xcode > Background Modes)
 *   - NSLocationWhenInUseUsageDescription    (Info.plist)
 *   - NSLocationAlwaysAndWhenInUseUsageDescription (Info.plist)
 *
 * One-shot getCurrentPosition still uses @capacitor/geolocation — it is only
 * ever called in the foreground (punch stamps, map centering, recovery).
 *
 * USAGE — identical to the web API, no call-site changes:
 *
 *   import { geolocation } from "@/lib/geolocation";
 *   geolocation.getCurrentPosition(ok, fail, opts)
 *   const id = geolocation.watchPosition(ok, fail, opts)
 *   geolocation.clearWatch(id)
 */

import { Geolocation } from "@capacitor/geolocation";
import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/native-app";

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

/* ── @capacitor-community/background-geolocation (native watch engine) ─── */

interface BgLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  bearing?: number | null;
  speed?: number | null;
  /** Unix ms when the fix was taken. */
  time?: number | null;
  simulated?: boolean;
}

interface BgCallbackError extends Error {
  code?: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (position?: BgLocation, error?: BgCallbackError) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

const BackgroundGeolocation =
  registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

/* ── web-API-shaped adapters ────────────────────────────────────────────── */

function capToWebPosition(pos: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}): GeolocationPosition {
  const coords = {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude ?? null,
    altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
    heading: pos.coords.heading ?? null,
    speed: pos.coords.speed ?? null,
  };
  return {
    coords,
    timestamp: pos.timestamp,
    toJSON: () => ({ coords, timestamp: pos.timestamp }),
  } as unknown as GeolocationPosition;
}

function bgToWebPosition(pos: BgLocation): GeolocationPosition {
  const coords = {
    latitude: pos.latitude,
    longitude: pos.longitude,
    accuracy: pos.accuracy ?? 0,
    altitude: pos.altitude ?? null,
    altitudeAccuracy: pos.altitudeAccuracy ?? null,
    heading: pos.bearing ?? null,
    speed: pos.speed ?? null,
  };
  const timestamp = pos.time ?? Date.now();
  return {
    coords,
    timestamp,
    toJSON: () => ({ coords, timestamp }),
  } as unknown as GeolocationPosition;
}

function toWebError(err: unknown): GeolocationPositionError {
  const code0 =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code ?? "")
      : "";
  const message =
    (typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err)) || "Location error";
  const code =
    code0 === "NOT_AUTHORIZED" || /denied|permission|not authorized/i.test(message)
      ? 1
      : /unavailable|disabled|location services/i.test(message)
        ? 2
        : 3;
  return {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

/**
 * Native watchers return a Promise<string> id; the web API returns a
 * synchronous number. Bridge: numeric handles mapped to the native id
 * promise. Handles start high to never collide with browser watch ids.
 */
let nextHandle = 1_000_001;
const nativeWatches = new Map<number, Promise<string>>();

export const geolocation = {
  getCurrentPosition(
    success: Success,
    error?: Failure,
    options?: PositionOptions,
  ): void {
    if (!isNativeApp()) {
      navigator.geolocation.getCurrentPosition(success, error, options);
      return;
    }
    Geolocation.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? 15000,
      maximumAge: options?.maximumAge ?? 0,
    })
      .then((pos) => success(capToWebPosition(pos)))
      .catch((e) => error?.(toWebError(e)));
  },

  watchPosition(
    success: Success,
    error?: Failure,
    _options?: PositionOptions,
  ): number {
    if (!isNativeApp()) {
      return navigator.geolocation.watchPosition(success, error, _options);
    }
    const handle = nextHandle++;
    const idPromise = BackgroundGeolocation.addWatcher(
      {
        // Android-only foreground-service notification text; ignored on iOS
        // but kept honest in case an Android build ever ships.
        backgroundTitle: "Location sharing active",
        backgroundMessage:
          "Suprah is sharing your location with dispatch while you're on duty.",
        requestPermissions: true,
        // Never replay cached fixes — the heartbeat endpoint rejects
        // positions older than 60s anyway.
        stale: false,
        // Deliver every fix; the JS side already throttles sends
        // (5s in DriverLocationSharingContext, 30s in useLocationSharing).
        distanceFilter: 0,
      },
      (pos, err) => {
        if (err) {
          error?.(toWebError(err));
          return;
        }
        if (pos) success(bgToWebPosition(pos));
      },
    ).catch((e) => {
      // addWatcher itself rejected (e.g. plugin missing) — surface as an
      // unavailable error so callers show their normal retry messaging.
      error?.(toWebError(e));
      return "";
    });
    nativeWatches.set(handle, idPromise);
    return handle;
  },

  clearWatch(handle: number): void {
    const idPromise = nativeWatches.get(handle);
    if (idPromise) {
      nativeWatches.delete(handle);
      idPromise
        .then((id) => (id ? BackgroundGeolocation.removeWatcher({ id }) : undefined))
        .catch(() => {});
      return;
    }
    // Not one of ours → it's a browser watch id
    try {
      navigator.geolocation.clearWatch(handle);
    } catch {
      /* no-op */
    }
  },
};