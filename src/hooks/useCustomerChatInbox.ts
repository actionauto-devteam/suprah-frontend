"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import { userErrorMessage } from "@/lib/user-error";
import {
  SHIPMENT_CHAT_EVENTS,
  getCustomerChatInbox,
  type CustomerChatInboxItem,
} from "@/lib/api/shipmentChat";

export const CUSTOMER_CHAT_INBOX_KEY = ["customer-chat-inbox"] as const;

const NO_CHATS: CustomerChatInboxItem[] = [];
const LIVE_REFRESH_DELAY_MS = 300;

/**
 * Dispatch Chat's Customers section: the driver's or dispatcher's customer
 * chats, newest first. New messages, reads and closed chats refresh it live.
 */
export function useCustomerChatInbox(enabled: boolean) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const active = enabled && Boolean(isSignedIn);

  const query = useQuery({
    queryKey: CUSTOMER_CHAT_INBOX_KEY,
    queryFn: async () => getCustomerChatInbox(await getToken()),
    enabled: active,
    // Live updates arrive by socket; this catches anything missed while offline.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CUSTOMER_CHAT_INBOX_KEY });
  }, [queryClient]);

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Several events can arrive together (a message and its read mark).
    const schedule = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, LIVE_REFRESH_DELAY_MS);
    };

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = initializeSocket(token);
      socket.on(SHIPMENT_CHAT_EVENTS.message, schedule);
      socket.on(SHIPMENT_CHAT_EVENTS.read, schedule);
      socket.on(SHIPMENT_CHAT_EVENTS.changed, schedule);
      // A reconnect may have missed some.
      socket.on("connect", schedule);
    })();

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      socket?.off(SHIPMENT_CHAT_EVENTS.message, schedule);
      socket?.off(SHIPMENT_CHAT_EVENTS.read, schedule);
      socket?.off(SHIPMENT_CHAT_EVENTS.changed, schedule);
      socket?.off("connect", schedule);
    };
  }, [active, getToken, refresh]);

  return {
    chats: active ? query.data?.chats ?? NO_CHATS : NO_CHATS,
    unreadTotal: active ? query.data?.unreadTotal ?? 0 : 0,
    loading: active && query.isLoading,
    error: active && query.isError ? userErrorMessage(query.error, "load your customer chats") : null,
    refresh,
  };
}
