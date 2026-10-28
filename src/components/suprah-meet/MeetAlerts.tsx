"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { meetSounds } from "@/lib/meet-sounds";
import { useOptionalCrmNotificationContext } from "@/context/CrmNotificationContext";

interface AlertMeeting { _id: string; code: string; title: string; scheduledAt: string | null; }

/**
 * Polls /api/crm/meet/alerts every 60s and toasts:
 *  - invited meetings that are live now
 * Mount once in the CRM layout so alerts appear anywhere in the app.
 */
export function MeetAlerts() {
  const router = useRouter();
  const crmNotifications = useOptionalCrmNotificationContext();
  const crmNoticeList = crmNotifications?.notifications;
  const crmNotificationsLoading = crmNotifications?.isLoading;
  const notified = React.useRef<Set<string>>(new Set());
  const hydratedNoticeIds = React.useRef(false);

  const fire = React.useCallback((m: AlertMeeting, kind: "soon" | "live") => {
    const key = `${m._id}:${kind}`;
    if (notified.current.has(key)) return;
    notified.current.add(key);
    try { sessionStorage.setItem("suprah-meet-alerted", JSON.stringify([...notified.current])); } catch {}
    meetSounds.alert();
    const when = kind === "live" ? "has an open room" : `starts at ${
      m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString("en-US", {
        timeZone: "America/Denver", hour: "numeric", minute: "2-digit",
      }) + " MDT" : "soon"}`;
    toast(`Suprah Meet: ${m.title}`, {
      description: `Your meeting ${when} · ${m.code}`,
      duration: 15_000,
      action: { label: "Join", onClick: () => router.push(`/crm/suprah-meet/room/${m.code}`) },
    });
  }, [router]);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem("suprah-meet-alerted");
      if (saved) notified.current = new Set(JSON.parse(saved));
    } catch { /* ignore */ }

    const check = async () => {
      try {
        const res = await apiClient.get("/api/crm/meet/alerts");
        const data = res.data?.data ?? {};
        const fire = (m: AlertMeeting, kind: "soon" | "live") => {
          const key = `${m._id}:${kind}`;
          if (notified.current.has(key)) return;
          notified.current.add(key);
          try { sessionStorage.setItem("suprah-meet-alerted", JSON.stringify([...notified.current])); } catch {}
          meetSounds.alert();
          const when = kind === "live" ? "has an open room" : `starts at ${
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

  // Socket-delivered meeting reminders should be visible immediately while a
  // person is actively using Suprah. Seed existing rows first so opening the
  // app does not replay old alerts; polling still reconciles missed events.
  React.useEffect(() => {
    if (crmNotificationsLoading !== false) return;
    const notices = (crmNoticeList ?? []).filter((notice) =>
      notice.type === "suprah_meet_reminder" || notice.type === "suprah_meet_live");
    if (!hydratedNoticeIds.current) {
      notices.forEach((notice) => notified.current.add(
        `${String(notice.metadata?.meetingId ?? notice._id)}:${notice.type === "suprah_meet_live" ? "live" : "soon"}`,
      ));
      hydratedNoticeIds.current = true;
      return;
    }

    notices.forEach((notice) => {
      const code = String(notice.metadata?.meetingCode ?? "").trim();
      if (!code) return;
      fire({
        _id: String(notice.metadata?.meetingId ?? notice._id),
        code,
        title: String(notice.metadata?.meetingTitle ?? notice.title ?? "Suprah Meet"),
        scheduledAt: typeof notice.metadata?.scheduledAt === "string" ? notice.metadata.scheduledAt : null,
      }, notice.type === "suprah_meet_live" ? "live" : "soon");
    });
  }, [crmNotificationsLoading, crmNoticeList, fire]);

  return null;
}
