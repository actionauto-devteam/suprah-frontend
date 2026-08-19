"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth } from "@/providers/AuthProvider";

type DispatchUnreadSnapshot = {
  unreadTotal: number;
  isLoading: boolean;
};

type TokenGetter = () => Promise<string | null>;

export type DispatchChatRealtimeEvent =
  | { type: "message"; payload: any }
  | { type: "read"; payload: any }
  | { type: "connect"; payload: null };

type DispatchChatRealtimeListener = (
  event: DispatchChatRealtimeEvent,
) => void;

const dispatchChatRealtimeListeners = new Set<
  DispatchChatRealtimeListener
>();

export function subscribeToDispatchChatRealtime(
  listener: DispatchChatRealtimeListener,
) {
  dispatchChatRealtimeListeners.add(listener);
  return () => {
    dispatchChatRealtimeListeners.delete(listener);
  };
}

function publishDispatchChatRealtime(
  event: DispatchChatRealtimeEvent,
) {
  dispatchChatRealtimeListeners.forEach((listener) => {
    listener(event);
  });
}

const EMPTY_SNAPSHOT: DispatchUnreadSnapshot = {
  unreadTotal: 0,
  isLoading: false,
};

let sharedSnapshot: DispatchUnreadSnapshot = EMPTY_SNAPSHOT;
let sharedInFlight: Promise<void> | null = null;

// If a chat message/read socket event lands while the authoritative unread
// request is already in flight, preserve one trailing refresh. Otherwise the
// second event could be swallowed by `return sharedInFlight`.
let sharedRefreshPending = false;

let sharedLastSuccessfulRefreshAt = 0;
let sharedGeneration = 0;
let scheduledRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledTokenGetter: TokenGetter | null = null;
let scheduledForceRefresh = false;

const sharedListeners = new Set<() => void>();

const FRESH_RESULT_WINDOW_MS = 1_000;
const SOCKET_REFRESH_DEBOUNCE_MS = 80;

function emitSharedSnapshot(next: DispatchUnreadSnapshot) {
  if (
    next.unreadTotal === sharedSnapshot.unreadTotal &&
    next.isLoading === sharedSnapshot.isLoading
  ) {
    return;
  }

  sharedSnapshot = next;
  sharedListeners.forEach((listener) => listener());
}

function updateSharedSnapshot(next: Partial<DispatchUnreadSnapshot>) {
  emitSharedSnapshot({
    unreadTotal: next.unreadTotal ?? sharedSnapshot.unreadTotal,
    isLoading: next.isLoading ?? sharedSnapshot.isLoading,
  });
}

function subscribeToSharedSnapshot(listener: () => void) {
  sharedListeners.add(listener);
  return () => {
    sharedListeners.delete(listener);
  };
}

function getSharedSnapshot() {
  return sharedSnapshot;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function resetSharedUnreadStore() {
  sharedGeneration += 1;
  sharedInFlight = null;
  sharedRefreshPending = false;
  sharedLastSuccessfulRefreshAt = 0;

  if (scheduledRefreshTimer) {
    clearTimeout(scheduledRefreshTimer);
    scheduledRefreshTimer = null;
  }

  scheduledTokenGetter = null;
  scheduledForceRefresh = false;
  emitSharedSnapshot(EMPTY_SNAPSHOT);
}

async function refreshSharedUnread(
  getToken: TokenGetter,
  options?: { force?: boolean },
): Promise<void> {
  const force = options?.force ?? false;

  if (sharedInFlight) {
    sharedRefreshPending = true;
    return sharedInFlight;
  }

  if (
    !force &&
    sharedLastSuccessfulRefreshAt > 0 &&
    Date.now() - sharedLastSuccessfulRefreshAt < FRESH_RESULT_WINDOW_MS
  ) {
    return;
  }

  const generation = sharedGeneration;
  sharedRefreshPending = false;
  updateSharedSnapshot({ isLoading: true });

  let request!: Promise<void>;
  request = (async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiClient.get(
        "/api/driver-tracking/dispatch-chat/unread-total",
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (generation !== sharedGeneration) return;

      const unreadTotal = Math.max(
        0,
        Number(response.data?.data?.unreadTotal ?? 0),
      );

      sharedLastSuccessfulRefreshAt = Date.now();
      updateSharedSnapshot({ unreadTotal });
    } catch {
      // Keep the last successful unread total during a temporary network/auth
      // failure. The next socket event, reconnect, or manual refresh retries it.
    } finally {
      if (sharedInFlight === request) {
        sharedInFlight = null;
      }

      if (generation === sharedGeneration) {
        updateSharedSnapshot({ isLoading: false });

        if (sharedRefreshPending) {
          sharedRefreshPending = false;
          void refreshSharedUnread(
            getToken,
            { force: true },
          );
        }
      }
    }
  })();

  sharedInFlight = request;
  return request;
}

function scheduleSharedRefresh(
  getToken: TokenGetter,
  options?: { force?: boolean },
) {
  scheduledTokenGetter = getToken;
  scheduledForceRefresh =
    scheduledForceRefresh || Boolean(options?.force);

  if (scheduledRefreshTimer) {
    clearTimeout(scheduledRefreshTimer);
  }

  scheduledRefreshTimer = setTimeout(() => {
    scheduledRefreshTimer = null;

    const tokenGetter = scheduledTokenGetter;
    const force = scheduledForceRefresh;

    scheduledTokenGetter = null;
    scheduledForceRefresh = false;

    if (tokenGetter) {
      void refreshSharedUnread(tokenGetter, { force });
    }
  }, SOCKET_REFRESH_DEBOUNCE_MS);
}

export function useDispatchChatUnread(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { getToken, isSignedIn } = useAuth();

  const shared = React.useSyncExternalStore(
    subscribeToSharedSnapshot,
    getSharedSnapshot,
    getServerSnapshot,
  );

  const refresh = React.useCallback(async () => {
    if (!enabled || !isSignedIn) return;
    await refreshSharedUnread(getToken, { force: true });
  }, [enabled, getToken, isSignedIn]);

  React.useEffect(() => {
    if (!isSignedIn) {
      resetSharedUnreadStore();
      return;
    }

    if (!enabled) return;
    void refreshSharedUnread(getToken);
  }, [enabled, getToken, isSignedIn]);

  React.useEffect(() => {
    if (!enabled || !isSignedIn) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const onMessage = (payload: any) => {
      if (cancelled) return;

      // Publish the exact payload from the same always-mounted listener that
      // drives the channel-level unread total. Per-driver badges can therefore
      // react at the same instant instead of creating a second socket timing
      // path inside DispatchChatTab.
      publishDispatchChatRealtime({
        type: "message",
        payload,
      });
      scheduleSharedRefresh(getToken, { force: true });
    };

    const onRead = (payload: any) => {
      if (cancelled) return;
      publishDispatchChatRealtime({
        type: "read",
        payload,
      });
      scheduleSharedRefresh(getToken, { force: true });
    };

    const onConnect = () => {
      if (cancelled) return;
      publishDispatchChatRealtime({
        type: "connect",
        payload: null,
      });

      // Reconnect should catch anything missed while offline, but the freshness
      // window prevents a second request immediately after the mount refresh.
      scheduleSharedRefresh(getToken);
    };

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = initializeSocket(token);
      socket.on("dispatch-chat:message", onMessage);
      socket.on("dispatch-chat:read", onRead);
      socket.on("connect", onConnect);
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.off("dispatch-chat:message", onMessage);
      socket?.off("dispatch-chat:read", onRead);
      socket?.off("connect", onConnect);
    };
  }, [enabled, getToken, isSignedIn]);

  React.useEffect(() => {
    if (!enabled || !isSignedIn) return;

    const reconcileOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      scheduleSharedRefresh(
        getToken,
        { force: true },
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconcileOnReturn();
      }
    };

    window.addEventListener(
      "focus",
      reconcileOnReturn,
    );
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );

    return () => {
      window.removeEventListener(
        "focus",
        reconcileOnReturn,
      );
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, [enabled, getToken, isSignedIn]);

  if (!enabled || !isSignedIn) {
    return {
      unreadTotal: 0,
      isLoading: false,
      refresh,
    };
  }

  return {
    unreadTotal: shared.unreadTotal,
    isLoading: shared.isLoading,
    refresh,
  };
}