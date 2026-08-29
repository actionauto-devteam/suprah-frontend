"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Ensures the shared socket.io connection used across the CRM is up, scoped
 * to the Suprah Calendar page's lifetime on screen. Mirrors useProjectSocket
 * so CalendarNotificationProvider gets live calendar:* / notification:new
 * pushes instead of falling back to its 60s poll.
 */
export function useCalendarSocket(): Socket | null {
  const { getToken, isSignedIn } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      setSocket(initializeSocket(token));
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  return socket;
}
