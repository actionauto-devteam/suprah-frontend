"use client"

import * as React from "react"
import { apiClient } from "@/lib/api-client"

export interface FeedBadgeState {
  unseenPosts: number
  unreadNotifications: number
  total: number
}

const EMPTY: FeedBadgeState = { unseenPosts: 0, unreadNotifications: 0, total: 0 }

let state: FeedBadgeState = EMPTY
const listeners = new Set<() => void>()

let pollId: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let socket: any = null
let socketAttempted = false

const POLL_INTERVAL_MS = 60_000
const SOCKET_REFRESH_DEBOUNCE_MS = 800

function emitChange() {
  listeners.forEach((l) => l())
}

function setState(next: { unseenPosts: number; unreadNotifications: number }) {
  const unseenPosts = Math.max(0, next.unseenPosts)
  const unreadNotifications = Math.max(0, next.unreadNotifications)
  const total = unseenPosts + unreadNotifications
  if (
    unseenPosts === state.unseenPosts &&
    unreadNotifications === state.unreadNotifications
  ) {
    return
  }
  state = { unseenPosts, unreadNotifications, total }
  emitChange()
}

/** Re-fetch the badge numbers from the server immediately. */
export async function refreshFeedBadge(): Promise<void> {
  try {
    const res = await apiClient.get("/api/crm/feeds/notifications/unread-count")
    const d = res.data?.data
    if (d && typeof d.total === "number") {
      setState({
        unseenPosts: d.unseenPosts ?? 0,
        unreadNotifications: d.notifications ?? 0,
      })
    }
    ensureSocket()
  } catch {
    // Unauthenticated or offline — leave the badge as-is (PM badge behaviour).
  }
}

/** Debounced refresh — used when socket events fire in bursts. */
function scheduleRefresh() {
  if (refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    refreshFeedBadge()
  }, SOCKET_REFRESH_DEBOUNCE_MS)
}

/**
 * Lazily open one app-wide socket for badge updates. Retried on each
 * successful poll so logging in after the store started still connects.
 */
function ensureSocket() {
  if (socket || socketAttempted || typeof window === "undefined") return
  const token = localStorage.getItem("crm_token")
  if (!token) return
  socketAttempted = true
  import("socket.io-client")
    .then(({ io }) => {
      const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
        auth: { token },
        path: "/socket.io",
        transports: ["websocket"],
      })
      // A new post somewhere in the org — recount (the server excludes the
      // user's own posts and respects their watermark, so a blind +1 here
      // would over-count; a debounced recount is always accurate).
      s.on("feed:new", scheduleRefresh)
      // A targeted notification for THIS user — bump instantly, then confirm.
      s.on("feed:notify", () => {
        setState({
          unseenPosts: state.unseenPosts,
          unreadNotifications: state.unreadNotifications + 1,
        })
        scheduleRefresh()
      })
      s.on("connect_error", () => {
        // Allow a retry on the next poll (e.g. token refreshed after re-login).
        s.disconnect()
        socket = null
        socketAttempted = false
      })
      socket = s
    })
    .catch(() => {
      socketAttempted = false
    })
}

function startEngine() {
  if (pollId) return
  refreshFeedBadge()
  pollId = setInterval(refreshFeedBadge, POLL_INTERVAL_MS)
}

// ─── useSyncExternalStore plumbing ────────────────────────────────────────────

export function subscribeFeedBadge(callback: () => void): () => void {
  listeners.add(callback)
  startEngine()
  return () => {
    listeners.delete(callback)
    // The engine intentionally keeps running once started — the sidebar mounts
    // for the whole session, and keeping the poller alive avoids badge
    // flicker across route transitions.
  }
}

export function getFeedBadgeSnapshot(): FeedBadgeState {
  return state
}

function getServerSnapshot(): FeedBadgeState {
  return EMPTY
}

/** Hook for consumers (sidebar, Feeds header bell, etc.). */
export function useFeedBadge(): FeedBadgeState {
  return React.useSyncExternalStore(subscribeFeedBadge, getFeedBadgeSnapshot, getServerSnapshot)
}

// ─── Imperative actions (called by the Feeds page) ────────────────────────────

/** Zero the unseen-posts half (after the page advances the watermark). */
export function clearUnseenPosts() {
  setState({ unseenPosts: 0, unreadNotifications: state.unreadNotifications })
}

/** Zero the notifications half (after "mark all read"). */
export function clearFeedNotificationsBadge() {
  setState({ unseenPosts: state.unseenPosts, unreadNotifications: 0 })
}

/** Decrement notifications by n (after marking individual rows read). */
export function decrementFeedNotifications(n = 1) {
  setState({
    unseenPosts: state.unseenPosts,
    unreadNotifications: state.unreadNotifications - n,
  })
}