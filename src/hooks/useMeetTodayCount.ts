"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";

const TZ = "America/Denver"; // company wall clock (MDT), same as scheduling

/** "YYYY-MM-DD" of an instant in company time — stable day-bucket key. */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/**
 * Count of the signed-in user's meetings still scheduled for TODAY (MDT).
 * Uses GET /api/crm/meet/meetings, which is already visibility-scoped on the
 * backend (host / invited / inviteAll / joined) — so this is "my meetings
 * today", not the whole org's. Polls every 60s; safe to mount once in the
 * sidebar. A meeting leaves the count when it goes live or ends.
 */
export function useMeetTodayCount(pollMs = 60_000) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await apiClient.get("/api/crm/meet/meetings");
        const meetings: any[] = res.data?.data?.meetings ?? [];
        const today = dayKey(new Date());
        const n = meetings.filter(
          (m) =>
            m.status === "scheduled" &&
            m.scheduledAt &&
            dayKey(new Date(m.scheduledAt)) === today
        ).length;
        if (alive) setCount(n);
      } catch {
        /* keep the last known count — never disturb the sidebar */
      }
    };

    void load();
    const t = setInterval(() => void load(), pollMs);
    return () => { alive = false; clearInterval(t); };
  }, [pollMs]);

  return count;
}