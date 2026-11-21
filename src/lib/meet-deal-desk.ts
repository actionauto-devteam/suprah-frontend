import { apiClient } from "@/lib/api-client";

/* ── Shared Deal Desk types ─────────────────────────────────────────────── */

export type DealDeskRoomState = "available" | "in_session" | "away" | "closed" | "ended";

export interface PublicDealDeskRoom {
  code: string;
  title: string;
  description: string | null;
  rep: { name: string; avatar: string | null };
  state: DealDeskRoomState;
  queueLength: number;
  createdAt: string;
}

export interface DealDeskQueueEntry {
  id: string; position: number; fullName: string; email: string | null; isGuest: boolean;
  requestedAt: string; lastSeenAt: string | null; stale: boolean;
}

export interface HostDealDeskRoom {
  _id: string;
  code: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  status: "scheduled" | "live" | "ended";
  state: DealDeskRoomState;
  hostInRoom: boolean;
  host: { id: string; fullName: string };
  roomUrl: string | null;
  passwordUpdatedAt: string | null;
  queue: DealDeskQueueEntry[];
  admitted: { id: string; fullName: string; email: string | null; respondedAt: string | null }[];
  inMeeting: { id: string; fullName: string; isGuest: boolean; isHost: boolean; joinedAt: string }[];
  servedCount: number;
  declinedCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export type QueueState = "waiting" | "admitted" | "denied" | "left" | "closed" | "ended" | "expired";

export interface QueueStatus {
  state: QueueState;
  title?: string;
  code?: string;
  position?: number | null;
  waitingCount?: number;
  roomState?: DealDeskRoomState;
  repInRoom?: boolean;
}

export const ROOM_STATE_META: Record<DealDeskRoomState, { label: string; publicLabel: string; cls: string; dot: string }> = {
  available:  { label: "Available",   publicLabel: "Rep is ready",        cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  in_session: { label: "In session",  publicLabel: "With a customer",     cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",                 dot: "bg-sky-500" },
  away:       { label: "Rep not in room", publicLabel: "Rep joining soon", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",       dot: "bg-amber-500" },
  closed:     { label: "Not accepting", publicLabel: "Closed",            cls: "border-border bg-muted text-muted-foreground",                                   dot: "bg-muted-foreground/50" },
  ended:      { label: "Ended",       publicLabel: "Ended",               cls: "border-border bg-muted text-muted-foreground",                                   dot: "bg-muted-foreground/50" },
};

/* ── Guest pass handoff (Deal Desk page → /meet/<code> guest page) ──────── */

export const guestHandoffKey = (code: string) => `suprah-meet:guest-handoff:${code.toUpperCase()}`;

/** Called by the Deal Desk page once the rep admits the customer. */
export function handOffGuestPass(code: string, token: string) {
  try { sessionStorage.setItem(guestHandoffKey(code), token); } catch { /* storage blocked */ }
}

/**
 * Called once by the /meet/<code> guest page on mount. If it returns a token,
 * the guest page must use it as its guest pass (send it as the Bearer token on
 * /guest/:code/request and the calls after it) instead of any older pass.
 */
export function takeGuestHandoff(code: string): string | null {
  try {
    const key = guestHandoffKey(code);
    const token = sessionStorage.getItem(key);
    if (token) sessionStorage.removeItem(key);
    return token;
  } catch { return null; }
}

/* ── Public API (no CRM session) ────────────────────────────────────────────
 * Plain fetch against the same API origin as apiClient, so CRM interceptors
 * (auth header injection, 401 → login redirect) never touch customer calls. */

const apiBase = () => String((apiClient as unknown as { defaults?: { baseURL?: string } }).defaults?.baseURL ?? "").replace(/\/$/, "");

export class PublicApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> | null) { super(message); }
}

export async function dealDeskPublic<T>(path: string, opts: { method?: "GET" | "POST"; body?: unknown; token?: string | null } = {}): Promise<T> {
  const res = await fetch(`${apiBase()}/api/crm/meet/deal-desk/public${path}`, {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    credentials: "omit",
  });
  let json: { message?: string; data?: unknown } | null = null;
  try { json = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) {
    throw new PublicApiError(json?.message || "Something went wrong. Please try again.", res.status,
      (json?.data as Record<string, unknown> | null) ?? null);
  }
  return (json?.data ?? {}) as T;
}

export const minutesWaited = (iso: string, nowMs: number) => {
  const s = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
