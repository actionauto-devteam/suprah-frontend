"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import type { PulseAlert, PulseHealth, PulseNextAction } from "@/lib/pulse360";

/**
 * Suprah Pulse360 — global store.
 *
 * Module-level singleton driven by useSyncExternalStore, the same pattern as
 * the What's New unread badge. There is no provider and nothing to mount high
 * in the tree: any component anywhere in the app can call usePulse360() and
 * get live state. That is what makes the popup work on Dashboard, CRM,
 * Projects, Inventory, Feeds, Suprah Space or any module added later without
 * touching those pages.
 *
 * Transport is socket-first with a slow poll as a safety net, so a dropped
 * websocket degrades to "up to 60s late" rather than "silently broken".
 */

const ME_ENDPOINT = "/api/crm/pulse360/me";
const POLL_INTERVAL_MS = 60_000;
const POPUP_MIN_GAP_MS = 20_000;

export interface Pulse360State {
  ready: boolean;
  enabled: boolean;
  connected: boolean;
  health: PulseHealth | null;
  alerts: PulseAlert[];
  nextActions: PulseNextAction[];
  /** Alerts waiting to be shown as a non-blocking corner notification, most severe first. */
  popupQueue: PulseAlert[];
  error: string | null;
  lastSyncAt: number | null;
}

const initialState: Pulse360State = {
  ready: false,
  enabled: true,
  connected: false,
  health: null,
  alerts: [],
  nextActions: [],
  popupQueue: [],
  error: null,
  lastSyncAt: null,
};

let state: Pulse360State = initialState;
const listeners = new Set<() => void>();

let started = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let socketBound = false;
let lastPopupAt = 0;
let popupsThisHour: number[] = [];
let popupMinSeverity = 50;
let maxPopupsPerHour = 4;

/** Alerts already shown this session — a refresh is a legitimate re-show. */
const shownAlertIds = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<Pulse360State>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) start();
  return () => {
    listeners.delete(listener);
    // Deliberately does NOT stop polling on last unsubscribe: navigating
    // between pages briefly drops to zero listeners, and tearing the socket
    // down and back up on every route change is worse than an idle timer.
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initialState;

// ── Token ───────────────────────────────────────────────────────────────────

function crmToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crm_token");
}

function authConfig() {
  const token = crmToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

// ── Popup gating ────────────────────────────────────────────────────────────

function canPopup(alert: PulseAlert): boolean {
  if (alert.severity < popupMinSeverity) return false;
  if (shownAlertIds.has(alert._id)) return false;

  // Critical always breaks through the rate limit — that is the point of it
  // being critical.
  if (alert.severity >= 90) return true;

  const now = Date.now();
  popupsThisHour = popupsThisHour.filter((t) => now - t < 3_600_000);
  if (popupsThisHour.length >= maxPopupsPerHour) return false;
  if (now - lastPopupAt < POPUP_MIN_GAP_MS) return false;

  return true;
}

function enqueuePopup(alert: PulseAlert) {
  if (!canPopup(alert)) return;

  shownAlertIds.add(alert._id);
  popupsThisHour.push(Date.now());
  lastPopupAt = Date.now();

  const queue = [...state.popupQueue.filter((a) => a._id !== alert._id), alert].sort(
    (a, b) => b.severity - a.severity
  );
  setState({ popupQueue: queue });
}

// ── Fetching ────────────────────────────────────────────────────────────────

async function fetchMe(options: { showPopups?: boolean } = {}) {
  if (!crmToken()) {
    setState({ ready: true, error: null });
    return;
  }

  try {
    const res = await apiClient.get(ME_ENDPOINT, authConfig());
    const data = res.data?.data ?? res.data;

    popupMinSeverity = data?.config?.popupMinSeverity ?? popupMinSeverity;
    maxPopupsPerHour = data?.config?.maxPopupsPerHour ?? maxPopupsPerHour;

    const alerts: PulseAlert[] = data?.alerts ?? [];

    setState({
      ready: true,
      enabled: data?.config?.enabled !== false,
      health: data?.health ?? null,
      alerts,
      nextActions: data?.nextActions ?? [],
      error: null,
      lastSyncAt: Date.now(),
    });

    // On first load, surface the single most severe outstanding item rather
    // than stacking every alert accumulated since the user was last online.
    if (options.showPopups !== false) {
      const candidate = alerts
        .filter((a) => a.status !== "snoozed")
        .sort((a, b) => b.severity - a.severity)[0];
      if (candidate) enqueuePopup(candidate);
    }
  } catch (error: any) {
    // 401 means the CRM session is gone; that's the app's problem to handle,
    // not something Pulse360 should surface as an error banner.
    if (error?.response?.status === 401) {
      setState({ ready: true, error: null });
      return;
    }
    setState({ ready: true, error: "Pulse360 is not reachable right now." });
  }
}

// ── Socket ──────────────────────────────────────────────────────────────────

function bindSocket() {
  if (socketBound) return;
  const token = crmToken();
  if (!token) return;

  try {
    const socket = initializeSocket(token);
    socketBound = true;

    socket.on("connect", () => setState({ connected: true }));
    socket.on("disconnect", () => setState({ connected: false }));

    socket.on("pulse:alert", (payload: { alert: PulseAlert; popup: boolean }) => {
      if (!payload?.alert) return;
      const alert = payload.alert;

      const alerts = [alert, ...state.alerts.filter((a) => a._id !== alert._id)].sort(
        (a, b) => b.severity - a.severity
      );
      setState({ alerts });

      if (payload.popup) enqueuePopup(alert);
    });

    socket.on("pulse:alert:resolved", (payload: { alertId: string }) => {
      setState({
        alerts: state.alerts.filter((a) => a._id !== payload?.alertId),
        popupQueue: state.popupQueue.filter((a) => a._id !== payload?.alertId),
      });
    });

    socket.on("pulse:alert:snoozed", (payload: { alertId: string; snoozedUntil: string }) => {
      setState({
        alerts: state.alerts.map((a) =>
          a._id === payload?.alertId ? { ...a, status: "snoozed", snoozedUntil: payload.snoozedUntil } : a
        ),
        popupQueue: state.popupQueue.filter((a) => a._id !== payload?.alertId),
      });
    });

    socket.on("pulse:alerts:cleared", () => {
      setState({ alerts: state.alerts.filter((a) => a.severity >= 90), popupQueue: [] });
    });

    socket.on("pulse:health", (health: PulseHealth) => {
      setState({ health, lastSyncAt: Date.now() });
    });

    // The clock is the one place where a state change should immediately
    // change what Pulse360 believes about the user, so resync on both edges.
    socket.on("time-in", () => void fetchMe({ showPopups: false }));
    socket.on("time-out", () => void fetchMe({ showPopups: false }));
  } catch {
    socketBound = false;
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  void fetchMe();
  bindSocket();

  pollTimer = setInterval(() => void fetchMe({ showPopups: false }), POLL_INTERVAL_MS);

  // Coming back to the tab is the moment stale state is most visible.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void fetchMe({ showPopups: false });
  });
}

export function stopPulse360() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
  socketBound = false;
  state = initialState;
  shownAlertIds.clear();
  emit();
}

// ── Actions ─────────────────────────────────────────────────────────────────

/** Remove the top popup without touching the alert's status. */
export function dismissPopup(alertId: string) {
  setState({ popupQueue: state.popupQueue.filter((a) => a._id !== alertId) });
}

export async function acknowledgeAlert(alertId: string) {
  // Optimistic: the popup should close the instant it is clicked.
  setState({
    alerts: state.alerts.filter((a) => a._id !== alertId),
    popupQueue: state.popupQueue.filter((a) => a._id !== alertId),
  });

  try {
    await apiClient.post(`/api/crm/pulse360/alerts/${alertId}/acknowledge`, {}, authConfig());
  } catch {
    void fetchMe({ showPopups: false });
  }
}

export async function resolveAlert(alertId: string, note?: string) {
  setState({
    alerts: state.alerts.filter((a) => a._id !== alertId),
    popupQueue: state.popupQueue.filter((a) => a._id !== alertId),
  });

  try {
    await apiClient.post(`/api/crm/pulse360/alerts/${alertId}/resolve`, { note }, authConfig());
  } catch {
    void fetchMe({ showPopups: false });
  }
}

export async function snoozeAlert(alertId: string, minutes: number) {
  setState({ popupQueue: state.popupQueue.filter((a) => a._id !== alertId) });

  try {
    await apiClient.post(`/api/crm/pulse360/alerts/${alertId}/snooze`, { minutes }, authConfig());
  } catch {
    void fetchMe({ showPopups: false });
  }
}

export async function acknowledgeAll() {
  setState({ alerts: state.alerts.filter((a) => a.severity >= 90), popupQueue: [] });

  try {
    await apiClient.post("/api/crm/pulse360/alerts/acknowledge-all", {}, authConfig());
  } catch {
    void fetchMe({ showPopups: false });
  }
}

export async function refreshPulse() {
  try {
    await apiClient.post("/api/crm/pulse360/me/refresh", {}, authConfig());
  } catch {
    /* the fetch below still reconciles whatever the server has */
  }
  await fetchMe({ showPopups: false });
}

export function syncNow() {
  void fetchMe({ showPopups: false });
}

// ── Hooks ───────────────────────────────────────────────────────────────────

export function usePulse360(): Pulse360State {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Narrow selector for the sidebar badge — avoids re-rendering on every tick. */
export function usePulseAlertCount(): { total: number; critical: number } {
  const { alerts } = usePulse360();
  return React.useMemo(
    () => ({
      total: alerts.filter((a) => a.status !== "snoozed").length,
      critical: alerts.filter((a) => a.severity >= 90).length,
    }),
    [alerts]
  );
}

export default {
  usePulse360,
  usePulseAlertCount,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  acknowledgeAll,
  dismissPopup,
  refreshPulse,
  syncNow,
  stopPulse360,
};
