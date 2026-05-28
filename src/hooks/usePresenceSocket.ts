"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import type { TeamMember } from "./useTeamPulse";

interface PresenceUpdatePayload {
  userId: string;
  onlineStatus: string;
  customStatus?: string | null;
  lastActive?: string;
}

export function usePresenceSocket() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let active = true;

    (async () => {
      try {
        const token = await getToken();
        if (!token || !active) return;

        const socket = initializeSocket(token);

        const handler = (payload: PresenceUpdatePayload) => {
          queryClient.setQueryData<TeamMember[]>(
            ["team-pulse-members"],
            (prev) => {
              if (!prev) return prev;
              return prev.map((m) =>
                m._id === payload.userId
                  ? {
                      ...m,
                      onlineStatus: payload.onlineStatus as TeamMember["onlineStatus"],
                      ...(payload.customStatus !== undefined && { customStatus: payload.customStatus ?? undefined }),
                      ...(payload.lastActive && { lastActive: payload.lastActive }),
                    }
                  : m
              );
            }
          );
        };

        socket.on("presence_update", handler);

        cleanupRef.current = () => {
          socket.off("presence_update", handler);
        };
      } catch {
        // silent
      }
    })();

    return () => {
      active = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isLoaded, isSignedIn, getToken, queryClient]);
}
