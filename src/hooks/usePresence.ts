"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { getDeviceType } from "@/lib/device";

const HEARTBEAT_MS = 30_000;

/**
 * Presence is entirely server-derived (see PATCH /api/profile/heartbeat): this hook's only
 * job is to tell the server whether there's been real user interaction (mouse/keyboard/touch)
 * since the last heartbeat. The server decides online vs. away (30 min of no interaction across
 * ANY of the user's devices) and never touches a manually-chosen status. This keeps status in
 * sync across every device/tab a user has open — no per-device local flag to fall out of sync.
 */
export function usePresence() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const hasInteracted = useRef(true); // mounting/loading the app counts as activity

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function beat() {
      const isActive = hasInteracted.current;
      hasInteracted.current = false;
      try {
        const token = await getToken();
        await apiClient.patch(
          "/api/profile/heartbeat",
          { isActive, deviceType: getDeviceType() },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        // silent — next heartbeat will retry
      }
    }

    function onActivity() {
      hasInteracted.current = true;
    }

    function onVisibility() {
      if (!document.hidden) {
        hasInteracted.current = true;
        beat();
      }
    }

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isLoaded, isSignedIn, getToken]);
}
