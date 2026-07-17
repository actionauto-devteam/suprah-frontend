"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";

/* ── Module-level store ─────────────────────────────────────────────────── */

type WhatsNewState = { unreadCount: number };

let state: WhatsNewState = { unreadCount: 0 };
const listeners = new Set<() => void>();

function setUnreadCount(next: number) {
  const clamped = Math.max(next, 0);
  if (clamped === state.unreadCount) return;
  // New object identity on every real change — required by useSyncExternalStore.
  state = { unreadCount: clamped };
  listeners.forEach((notify) => notify());
}

/* ── Singleton poller ───────────────────────────────────────────────────── */

const POLL_INTERVAL_MS = 60_000;
let pollerStarted = false;

async function fetchUnreadCount(): Promise<void> {
  try {
    const res = await apiClient.get("/api/crm/whats-new/unread-count");
    const count = res?.data?.data?.unreadCount;
    if (typeof count === "number") setUnreadCount(count);
  } catch {
    /* silent — 401 before login, network blips, etc. Next poll retries. */
  }
}

function ensurePollerStarted() {
  if (pollerStarted || typeof window === "undefined") return;
  pollerStarted = true;

  fetchUnreadCount();
  setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

  // Refetch when the tab regains focus so releases published while the user
  // was away (or before they logged in) surface without waiting a full minute.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") fetchUnreadCount();
  });
  window.addEventListener("focus", fetchUnreadCount);
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};

const getSnapshot = () => state;
// SSR snapshot: stable zero-state object (never mutated on the server since
// the poller only starts in the browser).
const serverState: WhatsNewState = { unreadCount: 0 };
const getServerSnapshot = () => serverState;

export function useWhatsNew() {
  const current = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    ensurePollerStarted();
  }, []);

  return React.useMemo(
    () => ({
      unreadCount: current.unreadCount,
      /** Force an immediate refetch (e.g. after publishing or reading a release). */
      refresh: fetchUnreadCount,
      /** Optimistically drop the badge by n (used the moment a release is opened). */
      decrement: (n: number = 1) => setUnreadCount(state.unreadCount - n),
    }),
    [current],
  );
}

/* ── Back-compat: provider is now an optional no-op ─────────────────────── */

export function WhatsNewProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}