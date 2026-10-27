"use client";

/**
 * Drop-in replacement for `navigator.geolocation` that routes through the
 * native Capacitor Geolocation plugin inside the Suprah iOS app, and falls
 * back to the browser API everywhere else (website, PWA, Android browsers).
 *
 * WHY: in the iOS app the browser geolocation API stops the moment the app
 * is backgrounded or the phone locks — which is exactly when driver/shift
 * tracking matters. The Capacitor plugin talks to iOS's real location
 * service, which (with the "location" background mode enabled in Xcode)
 * keeps delivering positions with the screen off.
 *
 * USAGE — mechanical swap, no logic changes:
 *
 *   import { geolocation } from "@/lib/geolocation";
 *
 *   // before:  navigator.geolocation.getCurrentPosition(ok, fail, opts)
 *   // after:           geolocation.getCurrentPosition(ok, fail, opts)
 *
 *   // before:  const id = navigator.geolocation.watchPosition(ok, fail, opts)
 *   // after:   const id =          geolocation.watchPosition(ok, fail, opts)
 *
 *   // before:  navigator.geolocation.clearWatch(id)
 *   // after:            geolocation.clearWatch(id)
 *
 * Signatures, position shape ({ coords, timestamp }) and error shape
 * ({ code, message } with PERMISSION_DENIED=1 / POSITION_UNAVAILABLE=2 /
 * TIMEOUT=3) all match the web API, so existing success/error handlers
 * work unchanged.
 */

import { Geolocation, type Position } from "@capacitor/geolocation";
import { isNativeApp } from "@/lib/native-app";

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function toWebPosition(pos: Position): GeolocationPosition {
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

function toWebError(err: unknown): GeolocationPositionError {
  const message =
    (typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err)) || "Location error";
  const code = /denied|permission|not authorized/i.test(message)
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
 * Native watchPosition returns a Promise<string> id; the web API returns a
 * synchronous number. Bridge: hand out our own numeric handles mapped to
 * the native id promise, so call sites keep their `number` watch ids.
 * Handles start high to never collide with real browser watch ids.
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
      .then((pos) => success(toWebPosition(pos)))
      .catch((e) => error?.(toWebError(e)));
  },

  watchPosition(
    success: Success,
    error?: Failure,
    options?: PositionOptions,
  ): number {
    if (!isNativeApp()) {
      return navigator.geolocation.watchPosition(success, error, options);
    }
    const handle = nextHandle++;
    const idPromise = Geolocation.watchPosition(
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout,
        maximumAge: options?.maximumAge,
      },
      (pos, err) => {
        if (err) {
          error?.(toWebError(err));
          return;
        }
        if (pos) success(toWebPosition(pos));
      },
    );
    nativeWatches.set(handle, idPromise);
    return handle;
  },

  clearWatch(handle: number): void {
    const idPromise = nativeWatches.get(handle);
    if (idPromise) {
      nativeWatches.delete(handle);
      idPromise.then((id) => Geolocation.clearWatch({ id })).catch(() => {});
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