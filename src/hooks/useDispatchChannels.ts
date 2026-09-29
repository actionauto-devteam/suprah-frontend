"use client";

import * as React from "react";
import { initializeSocket } from "@/lib/socket.client";
import { userErrorMessage } from "@/lib/user-error";
import { useAuth } from "@/providers/AuthProvider";
import { dispatchChannelsApi, type ChannelSummary } from "@/lib/api/dispatch-channels";

// Live events that can change the channel list (see dispatchChannel.controller).
export const DISPATCH_CHANNEL_EVENTS = [
  "dispatch-channel:message",
  "dispatch-channel:message-updated",
  "dispatch-channel:updated",
  "dispatch-channel:removed",
  "dispatch-channel:read",
] as const;

const LIVE_REFRESH_DELAY_MS = 300;

type TokenGetter = () => Promise<string | null>;
type Snapshot = { channels: ChannelSummary[]; loading: boolean; error: string | null };

// One shared copy for every screen that shows channels or their unread count
// (driver menu and bottom bar, Suprah Mail, the channel pages), so they agree
// and the list is downloaded once.
const INITIAL: Snapshot = { channels: [], loading: true, error: null };
let snapshot: Snapshot = INITIAL;
const listeners = new Set<() => void>();
let users = 0;
let tokenGetter: TokenGetter | null = null;
let inFlight: Promise<void> | null = null;
let refreshAgain = false;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let detachLive: (() => void) | null = null;

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function refreshShared(): Promise<void> {
  if (inFlight) {
    refreshAgain = true;
    return inFlight;
  }
  const getToken = tokenGetter;
  if (!getToken) return Promise.resolve();
  const started = generation;
  const request = (async () => {
    try {
      const result = await dispatchChannelsApi.list(getToken);
      if (started === generation) publish({ channels: result.channels, loading: false, error: null });
    } catch (error) {
      if (started === generation) publish({ loading: false, error: userErrorMessage(error, "load your channels") });
    } finally {
      // A sign-out reset starts a new generation; an older request leaves it alone.
      if (started === generation) inFlight = null;
      if (refreshAgain && started === generation) {
        refreshAgain = false;
        void refreshShared();
      }
    }
  })();
  inFlight = request;
  return request;
}

function scheduleRefresh() {
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    void refreshShared();
  }, LIVE_REFRESH_DELAY_MS);
}

/** Socket and tab-visibility listeners, attached once while any screen uses channels. */
function attachLive(getToken: TokenGetter) {
  let cancelled = false;
  let socket: ReturnType<typeof initializeSocket> | null = null;
  const onVisible = () => {
    if (document.visibilityState === "visible") scheduleRefresh();
  };
  document.addEventListener("visibilitychange", onVisible);
  void (async () => {
    const token = await getToken();
    if (!token || cancelled) return;
    socket = initializeSocket(token);
    for (const event of DISPATCH_CHANNEL_EVENTS) socket.on(event, scheduleRefresh);
    socket.on("connect", scheduleRefresh);
  })();
  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVisible);
    if (socket) {
      for (const event of DISPATCH_CHANNEL_EVENTS) socket.off(event, scheduleRefresh);
      socket.off("connect", scheduleRefresh);
    }
  };
}

function resetShared() {
  generation += 1;
  inFlight = null;
  refreshAgain = false;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (snapshot !== INITIAL) {
    snapshot = INITIAL;
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

/** The signed-in person's channels with unread counts, kept current live. */
export function useDispatchChannels(enabled = true) {
  const { getToken, isSignedIn } = useAuth();
  const active = enabled && Boolean(isSignedIn);
  const shared = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    if (isSignedIn === false) resetShared();
  }, [isSignedIn]);

  React.useEffect(() => {
    if (!active) return;
    tokenGetter = getToken;
    users += 1;
    if (users === 1) detachLive = attachLive(getToken);
    scheduleRefresh();
    return () => {
      users -= 1;
      if (users === 0) {
        detachLive?.();
        detachLive = null;
      }
    };
  }, [active, getToken]);

  const refresh = React.useCallback(() => refreshShared(), []);

  const unreadTotal = React.useMemo(
    () => shared.channels.reduce((sum, channel) => sum + channel.unreadCount, 0),
    [shared.channels],
  );

  if (!active) return { channels: [] as ChannelSummary[], loading: false, error: null, unreadTotal: 0, refresh };
  return { channels: shared.channels, loading: shared.loading, error: shared.error, unreadTotal, refresh };
}
