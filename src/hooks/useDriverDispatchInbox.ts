"use client";

import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { userErrorMessage } from "@/lib/user-error";
import { subscribeToDispatchChatRealtime } from "@/hooks/useDispatchChatUnread";
import {
  driverDispatchInboxApi,
  type DispatchChatPin,
  type DispatchChatPinKind,
  type DispatchContact,
} from "@/lib/api/driver-dispatch-inbox";
import type { DispatchChatThreadSummary } from "@/components/dispatch-chat/DispatchChatDialog";

const LIVE_REFRESH_DELAY_MS = 300;

/**
 * The driver's Dispatch Chat page data: private conversations with
 * dispatchers, the dispatchers of their current and recent loads, and their
 * pins. Conversations refresh live; channels come from useDispatchChannels.
 */
export function useDriverDispatchInbox(enabled: boolean) {
  const { getToken } = useAuth();
  const [threads, setThreads] = React.useState<DispatchChatThreadSummary[]>([]);
  const [contacts, setContacts] = React.useState<DispatchContact[]>([]);
  const [pins, setPins] = React.useState<DispatchChatPin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Only the newest answer counts when refreshes overlap.
  const threadRequestRef = React.useRef(0);

  const refreshThreads = React.useCallback(async () => {
    const request = ++threadRequestRef.current;
    try {
      const next = await driverDispatchInboxApi.threads(getToken);
      if (request !== threadRequestRef.current) return;
      setThreads(next);
      setError(null);
    } catch (caught) {
      if (request === threadRequestRef.current) setError(userErrorMessage(caught, "load your conversations"));
    }
  }, [getToken]);

  const refreshContacts = React.useCallback(async () => {
    try {
      setContacts(await driverDispatchInboxApi.contacts(getToken));
    } catch {
      // Keep the last list; New message still works for what's shown.
    }
  }, [getToken]);

  const refreshPins = React.useCallback(async () => {
    try {
      setPins(await driverDispatchInboxApi.pins(getToken));
    } catch {
      // Keep the last pins; the next refresh tries again.
    }
  }, [getToken]);

  const refreshAll = React.useCallback(async () => {
    await Promise.all([refreshThreads(), refreshContacts(), refreshPins()]);
    setLoading(false);
  }, [refreshContacts, refreshPins, refreshThreads]);

  React.useEffect(() => {
    if (!enabled) return;
    void refreshAll();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleThreads = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        void refreshThreads();
      }, LIVE_REFRESH_DELAY_MS);
    };
    // New messages and reads (from this page or another device) change the
    // previews and unread counts; a reconnect may have missed some.
    const unsubscribe = subscribeToDispatchChatRealtime(scheduleThreads);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      scheduleThreads();
      void refreshContacts();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (timer !== null) clearTimeout(timer);
    };
  }, [enabled, refreshAll, refreshContacts, refreshThreads]);

  const setPinned = React.useCallback(
    async (kind: DispatchChatPinKind, id: string, pinned: boolean) => {
      // Show the change right away; the server's list replaces it.
      setPins((current) => {
        const others = current.filter((pin) => !(pin.kind === kind && pin.id === id));
        return pinned ? [...others, { kind, id, pinnedAt: new Date().toISOString() }] : others;
      });
      try {
        setPins(await driverDispatchInboxApi.setPin(getToken, kind, id, pinned));
      } catch (caught) {
        toast.error(userErrorMessage(caught, pinned ? "pin this conversation" : "unpin this conversation"));
        void refreshPins();
      }
    },
    [getToken, refreshPins],
  );

  /** Opens (or reuses) the conversation with the dispatcher of one of my loads. */
  const openFromLoad = React.useCallback(
    async (loadId: string) => {
      const thread = await driverDispatchInboxApi.openFromLoad(getToken, loadId);
      setContacts((current) =>
        current.map((contact) =>
          contact.load.id === loadId ? { ...contact, threadId: thread.id }
            : contact,
        ),
      );
      return thread;
    },
    [getToken],
  );

  return { threads, contacts, pins, loading, error, refresh: refreshAll, setPinned, openFromLoad };
}
