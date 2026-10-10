"use client";

import * as React from "react";

/**
 * Phone redesign preview (iPhone deck, slides 8-13).
 *
 * Off unless the dev server is started with NEXT_PUBLIC_MOBILE_PREVIEW=true.
 * Production builds don't set it, so live users always get today's screens.
 * When it's on, the compare toggle lets the viewer switch between the new and
 * current phone design; the choice is remembered in this browser only.
 */
export const MOBILE_PREVIEW_AVAILABLE =
  process.env.NEXT_PUBLIC_MOBILE_PREVIEW === "true";

const STORAGE_KEY = "suprah:mobile-preview:v1";
const CHANGE_EVENT = "suprah:mobile-preview-change";

// Used when browser storage is unavailable (private mode, blocked storage).
let memoryPreference = true;

function readPreference(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? memoryPreference : stored !== "off";
  } catch {
    return memoryPreference;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useMobilePreview() {
  const preferred = React.useSyncExternalStore(
    subscribe,
    readPreference,
    () => true,
  );

  const setEnabled = React.useCallback((next: boolean) => {
    memoryPreference = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // The in-memory preference still applies for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return {
    available: MOBILE_PREVIEW_AVAILABLE,
    enabled: MOBILE_PREVIEW_AVAILABLE && preferred,
    setEnabled,
  };
}
