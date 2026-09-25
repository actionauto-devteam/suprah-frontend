"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { meetSounds } from "@/lib/meet-sounds";

interface AlertMeeting { _id: string; code: string; title: string; scheduledAt: string | null; }

/**
 * Polls /api/crm/meet/alerts every 60s and toasts:
 *  - invited meetings starting within 10 minutes
 *  - invited meetings that are live now
 * Mount once in the CRM layout so alerts appear anywhere in the app.
 */
export function MeetAlerts() {
  const router = useRouter();
  const notified = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem("suprah-meet-alerted");
      if (saved) notified.current = new Set(JSON.parse(saved));
    } catch { /* ignore */ }

    const check = async () => {
      try {
        const res = await apiClient.get("/api/crm/meet/alerts", { _skipAuthRefresh: false } as any);
        const data = res.data?.data ?? {};
        const fire = (m: AlertMeeting, kind: "soon" | "live") => {
          const key = `${m._id}:${kind}`;
          if (notified.current.has(key)) return;
          notified.current.add(key);
          try { sessionStorage.setItem("suprah-meet-alerted", JSON.stringify([...notified.current])); } catch {}
          meetSounds.alert();
          const when = kind === "live" ? "is live now" : `starts at ${
            m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString("en-US", {
              timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
            }) + " MDT" : "soon"}`;
          toast(`📅 ${m.title}`, {
            description: `Your meeting ${when} · ${m.code}`,
            duration: 15_000,
            action: { label: "Join", onClick: () => router.push(`/crm/suprah-meet/room/${m.code}`) },
          });
        };
        (data.startingSoon ?? []).forEach((m: AlertMeeting) => fire(m, "soon"));
        (data.live ?? []).forEach((m: AlertMeeting) => fire(m, "live"));
      } catch { /* silent — never disturb the app */ }
    };

    void check();
    const t = setInterval(() => void check(), 60_000);
    return () => clearInterval(t);
  }, [router]);

  return null;
}