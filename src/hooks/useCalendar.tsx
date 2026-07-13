"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { CalendarItem, EventDraft } from "@/types/calendar.types";

// TODO(integration): swap the placeholder below for your shared Socket.io
// client singleton so real-time sync activates:
//   import { getSocket } from "@/lib/socket";

type SocketPayload =
  | { source: string; item: CalendarItem }
  | { source: string; id: string };

export function useCalendar(rangeStart: Date, rangeEnd: Date) {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const range = useRef({ from: rangeStart, to: rangeEnd });
  range.current = { from: rangeStart, to: rangeEnd };

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = range.current;
      const res = await apiClient.get<{ items: CalendarItem[] }>(
        "/api/calendar/feed",
        { params: { from: from.toISOString(), to: to.toISOString() } }
      );
      setItems(res.data.items ?? []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
          (e instanceof Error ? e.message : "Failed to load calendar.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch, rangeStart.getTime(), rangeEnd.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Real-time sync — same events the Appointment calendar emits. */
  useEffect(() => {
    // TODO(integration): const socket = getSocket();
    const socket: any = (globalThis as any).__suprahSocket; // placeholder
    if (!socket) return;

    const inRange = (it: CalendarItem) =>
      new Date(it.start) < range.current.to &&
      new Date(it.end) > range.current.from;

    const onCreated = (p: SocketPayload) => {
      if ("item" in p && inRange(p.item)) {
        setItems((prev) =>
          prev.some((x) => x.id === p.item.id)
            ? prev // creator's own client already holds it (with canEdit) from the POST response
            : [...prev, { ...p.item, canEdit: p.item.canEdit ?? false }]
        );
      }
    };
    const onUpdated = (p: SocketPayload) => {
      if ("item" in p) {
        setItems((prev) => {
          // Broadcasts omit viewer-specific canEdit — preserve what we know.
          const known = prev.find((x) => x.id === p.item.id);
          const merged = { ...p.item, canEdit: p.item.canEdit ?? known?.canEdit ?? false };
          const next = prev.filter((x) => x.id !== p.item.id);
          return inRange(merged) ? [...next, merged] : next;
        });
      }
    };
    const onDeleted = (p: SocketPayload) => {
      if ("id" in p) setItems((prev) => prev.filter((x) => x.id !== p.id));
    };

    socket.on("calendar:created", onCreated);
    socket.on("calendar:updated", onUpdated);
    socket.on("calendar:deleted", onDeleted);
    return () => {
      socket.off("calendar:created", onCreated);
      socket.off("calendar:updated", onUpdated);
      socket.off("calendar:deleted", onDeleted);
    };
  }, []);

  const createItem = useCallback(async (draft: EventDraft) => {
    const res = await apiClient.post<{ item: CalendarItem }>(
      "/api/calendar/events",
      draft
    );
    const item = res.data.item;
    setItems((prev) =>
      prev.some((x) => x.id === item.id) ? prev : [...prev, item]
    );
    return item;
  }, []);

  const updateItem = useCallback(
    async (id: string, patch: Partial<EventDraft>) => {
      const res = await apiClient.patch<{ item: CalendarItem }>(
        `/api/calendar/events/${id}`,
        patch
      );
      const item = res.data.item;
      setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
      return item;
    },
    []
  );

  const deleteItem = useCallback(async (id: string) => {
    await apiClient.delete(`/api/calendar/events/${id}`);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    [items]
  );

  return {
    items: sorted,
    loading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
  };
}
