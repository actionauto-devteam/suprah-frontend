"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

export function usePresence() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function beat() {
      try {
        const token = await getToken();
        await apiClient.patch("/api/profile/heartbeat", {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Heartbeat failures are silent — don't spam the console
      }
    }

    beat(); // immediate ping on mount / tab focus

    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    function onVisible() {
      if (!document.hidden) beat();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLoaded, isSignedIn, getToken]);
}
