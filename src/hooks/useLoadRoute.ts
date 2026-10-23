"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { loadRouteApi, type AvailableLoadRoute, type LoadRoute, type LoadRouteAudience } from "@/lib/api/load-route";

/**
 * The server reuses a route for 2 minutes but plans a new one as soon as the
 * driver leaves it, so asking every minute picks that up quickly.
 */
const REFRESH_MS = 60_000;
/** While routes are switched off, check now and then instead of every minute. */
const SWITCHED_OFF_RECHECK_MS = 10 * 60_000;

export type LoadRouteState = {
  route: LoadRoute | null;
  /** The last route that worked, kept through a temporary failure. */
  lastAvailable: AvailableLoadRoute | null;
};

/**
 * The best route and arrival time to a load's next stop, refreshed every
 * minute while the page is on screen (paused in a background tab, refreshed
 * on return). Null while loading, or when this person may not see it.
 * `refreshKey` (for example the load's status) asks again as soon as it
 * changes, so a pickup switches the route to the delivery right away.
 */
export function useLoadRoute(
  loadId: string | null | undefined,
  audience: LoadRouteAudience,
  enabled = true,
  refreshKey = "",
): LoadRouteState | null {
  const { getToken } = useAuth();
  const key = enabled && loadId ? `${audience}:${loadId}:${refreshKey}` : null;
  const [state, setState] = React.useState<(LoadRouteState & { key: string }) | null>(null);

  React.useEffect(() => {
    if (!key || !loadId) return;
    let cancelled = false;
    let lastAsked = 0;
    let pausedUntil = 0;
    const refresh = async (force = false) => {
      if (document.visibilityState !== "visible") return;
      if (!force && Date.now() < pausedUntil) return;
      lastAsked = Date.now();
      try {
        const route = await loadRouteApi.get(getToken, audience, loadId);
        if (cancelled) return;
        pausedUntil = !route.available && route.reason === "routes_off" ? Date.now() + SWITCHED_OFF_RECHECK_MS : 0;
        setState((prev) => {
          const kept = prev?.key === key ? prev.lastAvailable : null;
          return { key, route, lastAvailable: route.available ? route : kept };
        });
      } catch (error) {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Not allowed to see it, or the load is gone: show nothing. A network
        // blip keeps what was already shown.
        if (status === 403 || status === 404) setState({ key, route: null, lastAvailable: null });
      }
    };
    void refresh(true);
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
