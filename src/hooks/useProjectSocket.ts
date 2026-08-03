"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Ensures the shared socket.io connection used across the CRM is up, scoped
 * to Project Management's lifetime on screen. Callers register their own
 * `pm:*` listeners on the returned socket (see task-detail-dialog.tsx,
 * my-tasks-panel.tsx, project/page.tsx) — this hook has no feature-specific
 * logic of its own so every consumer can filter events the way it needs to.
 */
export function useProjectSocket(): Socket | null {
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
