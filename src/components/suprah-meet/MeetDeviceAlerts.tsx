"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useCrmWebPush } from "@/hooks/useCrmWebPush";

export function MeetDeviceAlerts() {
  const push = useCrmWebPush();
  const refreshSubscription = push.refreshSubscription;
  const [needsInstall, setNeedsInstall] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission>("default");
  const [testing, setTesting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [testFailed, setTestFailed] = React.useState(false);

  React.useEffect(() => {
    const check = () => {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const installed = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setNeedsInstall(ios && !installed);
      setPermission("Notification" in window ? Notification.permission : "default");
    };
    const resume = () => { if (document.visibilityState === "visible") { check(); void refreshSubscription(); } };
    check();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => { document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); };
  }, [refreshSubscription]);

  const sendTest = async () => {
    setTesting(true); setFeedback(null); setTestFailed(false);
    try {
      const subscription = await refreshSubscription();
      if (!subscription) throw new Error("Enable device notifications here before sending a test.");
      const result = await apiClient.post("/api/crm/meet/device-notifications/test", { endpoint: subscription.endpoint });
      if (result.data?.data?.accepted !== true) throw new Error("This version of Suprah could not confirm the device push test. Refresh the app and try again.");
      setFeedback("Test sent to this device's push service. Look in your PC or phone notification area. If it is hidden, check browser/OS notification settings and Do Not Disturb.");
    } catch (error: unknown) {
      const failure = error as { response?: { data?: { message?: string } }; message?: string };
      setTestFailed(true);
      setFeedback(failure.response?.data?.message || failure.message || "Could not send the device notification. Try enabling alerts again.");
    } finally { setTesting(false); }
  };

  return <section className="rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur">
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500"><BellRing className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">PC and phone notifications</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Meeting invites, reminders, and room-open alerts appear in your device notification area, even when Suprah is closed. Enable them once on each PC and phone.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {needsInstall ? "On iPhone/iPad: add Suprah to your Home Screen, open that installed app, then enable notifications here."
            : permission === "denied" ? "Notifications are blocked for this app. Allow notifications in your browser and device settings, then return here."
            : push.isLoading ? "Checking this device..."
            : push.isSubscribed ? "This device is registered. Send a test to check that the system notification appears."
            : push.isSupported ? "Device notifications are off here."
            : "Web Push is unavailable in this browser or installation. Use a supported browser or installed Suprah app."}
        </p>
        {!needsInstall && push.isSupported && !push.isSubscribed && !push.isLoading && permission !== "denied" &&
          <Button size="sm" variant="outline" className="mt-3 w-full border-emerald-500/30"
            onClick={() => void push.subscribe().then(() => setPermission(Notification.permission))}>Enable device notifications</Button>}
        {!needsInstall && push.isSubscribed && permission === "granted" &&
          <Button size="sm" variant="outline" className="mt-3 w-full border-emerald-500/30" disabled={testing || push.isLoading}
            onClick={() => void sendTest()}>{testing ? "Sending test..." : "Send test notification"}</Button>}
        {feedback && <p role="status" className={`mt-2 text-xs leading-relaxed ${testFailed ? "text-destructive" : "text-muted-foreground"}`}>{feedback}</p>}
      </div>
    </div>
  </section>;
}
