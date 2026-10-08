"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { loadEtaApi, type AvailableLoadEta, type LoadEta, type LoadEtaAudience } from "@/lib/api/load-eta";

/** The server reuses an arrival time for 2 minutes, so asking more often gains nothing. */
const REFRESH_MS = 2 * 60_000;

export type LoadEtaState = {
  eta: LoadEta | null;
  /** The last arrival time that worked, kept through a temporary failure. */
  lastAvailable: AvailableLoadEta | null;
};

/**
 * Arrival time at a load's next stop, refreshed every 2 minutes while the page
 * is on screen (paused in a background tab, refreshed on return). Null while
 * loading, when switched off, or when this person may not see it.
 */
export function useLoadEta(loadId: string | null | undefined, audience: LoadEtaAudience, enabled = true): LoadEtaState | null {
  const { getToken } = useAuth();
  const key = enabled && loadId ? `${audience}:${loadId}` : null;
  const [state, setState] = React.useState<(LoadEtaState & { key: string }) | null>(null);

  React.useEffect(() => {
    if (!key || !loadId) return;
    let cancelled = false;
    let lastAsked = 0;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      lastAsked = Date.now();
      try {
        const eta = await loadEtaApi.get(getToken, audience, loadId);
        if (cancelled) return;
        setState((prev) => {
          const kept = prev?.key === key ? prev.lastAvailable : null;
          return { key, eta, lastAvailable: eta.available ? eta : kept };
        });
      } catch (error) {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Not allowed to see it, or the load is gone: show nothing. A network
        // blip keeps what was already shown.
        if (status === 403 || status === 404) setState({ key, eta: null, lastAvailable: null });
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastAsked >= REFRESH_MS) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, loadId, audience, getToken]);

  return state && state.key === key ? state : null;
}
