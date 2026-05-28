"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";

const HEARTBEAT_MS = 30_000;
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const AWAY_TIMEOUT_MS = 8 * 60 * 1000;

const MANUAL_STATUS_KEY = "suprah_manual_status";
const MANUAL_STATUSES = ["away", "busy", "do_not_disturb"];

type PresenceStatus = "online" | "idle" | "away" | "busy" | "offline" | "do_not_disturb";

export function setManualStatus(status: PresenceStatus | null) {
  if (status === null) {
    sessionStorage.removeItem(MANUAL_STATUS_KEY);
  } else if (MANUAL_STATUSES.includes(status)) {
    sessionStorage.setItem(MANUAL_STATUS_KEY, status);
  } else {
    sessionStorage.removeItem(MANUAL_STATUS_KEY);
  }
}

export function getManualStatus(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(MANUAL_STATUS_KEY);
}

export function usePresence() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const autoStatusRef = useRef<"online" | "idle" | "away">("online");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function callStatus(status: PresenceStatus) {
      try {
        const token = await getToken();
        await apiClient.patch(
          "/api/profile/online-status",
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        // silent
      }
    }

    async function beat() {
      try {
        const token = await getToken();
        await apiClient.patch("/api/profile/heartbeat", {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // silent
      }
    }

    function clearTimers() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    }

    function scheduleInactivity() {
      clearTimers();

      idleTimerRef.current = setTimeout(() => {
        const manual = getManualStatus();
        if (manual) return;
        if (autoStatusRef.current === "online") {
          autoStatusRef.current = "idle";
          callStatus("idle");
        }

        awayTimerRef.current = setTimeout(() => {
          const manual2 = getManualStatus();
          if (manual2) return;
          autoStatusRef.current = "away";
          callStatus("away");
        }, AWAY_TIMEOUT_MS - IDLE_TIMEOUT_MS);
      }, IDLE_TIMEOUT_MS);
    }

    function onActivity() {
      const wasInactive = autoStatusRef.current === "idle" || autoStatusRef.current === "away";
      if (wasInactive) {
        const manual = getManualStatus();
        if (!manual) {
          autoStatusRef.current = "online";
          callStatus("online");
        }
      }
      scheduleInactivity();
    }

    function onVisibility() {
      if (!document.hidden) {
        beat();
        onActivity();
      }
    }

    if (!isInitialized.current) {
      isInitialized.current = true;
      callStatus("online");
      beat();
    }

    scheduleInactivity();
    const interval = setInterval(beat, HEARTBEAT_MS);

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimers();
      clearInterval(interval);
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isLoaded, isSignedIn, getToken]);
}
