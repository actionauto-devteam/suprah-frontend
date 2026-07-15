"use client";

/**
 * WhatsNewContext — global unread counter for the "What's New" release feed.
 *
 * Mount <WhatsNewProvider> in the dashboard layout alongside
 * ProjectNotificationProvider / SupraSpaceMessengerContext so the sidebar
 * badge is available everywhere.
 *
 * The count polls every 60s and can be refreshed imperatively (the page calls
 * refresh() after marking a release read so the badge drops immediately).
 */

import * as React from "react";
import { apiClient } from "@/lib/api-client";

type WhatsNewContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Optimistically drop the badge by n (used when a release is opened). */
  decrement: (n?: number) => void;
};

const WhatsNewContext = React.createContext<WhatsNewContextValue>({
  unreadCount: 0,
  refresh: async () => {},
  decrement: () => {},
});

const POLL_INTERVAL_MS = 60_000;

export function WhatsNewProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/whats-new/unread-count");
      const count = res?.data?.data?.unreadCount;
      if (typeof count === "number") setUnreadCount(count);
    } catch {
      /* silent — badge is best-effort, never break the shell over it */
    }
  }, []);

  const decrement = React.useCallback((n: number = 1) => {
    setUnreadCount((prev) => Math.max(prev - n, 0));
  }, []);

  React.useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    // Refresh when the tab regains focus so newly published releases show up.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = React.useMemo(
    () => ({ unreadCount, refresh, decrement }),
    [unreadCount, refresh, decrement],
  );

  return <WhatsNewContext.Provider value={value}>{children}</WhatsNewContext.Provider>;
}

export function useWhatsNew() {
  return React.useContext(WhatsNewContext);
}