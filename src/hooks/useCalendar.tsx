"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarItem, EventDraft } from "@/types/calendar.types";

// ── INTEGRATION ───────────────────────────────────────────────────────────
// Swap these two for your existing client utilities:
//  - `api`: the fetch wrapper you use elsewhere (adds Clerk token, base URL)
//  - `getSocket`: your shared Socket.io client singleton (the one SupraSpace
//    and the Project Management notifications already use)
// ──────────────────────────────────────────────────────────────────────────
// TODO(integration): import { api } from "@/lib/api";
// TODO(integration): import { getSocket } from "@/lib/socket";

const API_BASE = "/api/calendar";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json() as Promise<T>;
}

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
      const qs = `?from=${from.toISOString()}&to=${to.toISOString()}`;
      const data = await api<{ items: CalendarItem[] }>(`/feed${qs}`);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch, rangeStart.getTime(), rangeEnd.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Real-time sync — the same three events the Appointment calendar emits. */
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
          prev.some((x) => x.id === p.item.id) ? prev : [...prev, p.item]
        );
      }
    };
    const onUpdated = (p: SocketPayload) => {
      if ("item" in p) {
        setItems((prev) => {
          const next = prev.filter((x) => x.id !== p.item.id);
          return inRange(p.item) ? [...next, p.item] : next;
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
    const { item } = await api<{ item: CalendarItem }>(`/events`, {
      method: "POST",
      body: JSON.stringify(draft),
    });
    // Socket echo also arrives; the created-handler dedupes by id.
    setItems((prev) =>
      prev.some((x) => x.id === item.id) ? prev : [...prev, item]
    );
    return item;
  }, []);

  const updateItem = useCallback(async (id: string, patch: Partial<EventDraft>) => {
    const { item } = await api<{ item: CalendarItem }>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
    return item;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await api(`/events/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    [items]
  );

  return { items: sorted, loading, error, refetch, createItem, updateItem, deleteItem };
}