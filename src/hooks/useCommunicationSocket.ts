"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth } from "@/providers/AuthProvider";

export function useCommunicationSocket(enabled: boolean): Socket | null {
  const { getToken, isSignedIn } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !isSignedIn) return;
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      setSocket(initializeSocket(token));
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isSignedIn, getToken]);

  return socket;
}
