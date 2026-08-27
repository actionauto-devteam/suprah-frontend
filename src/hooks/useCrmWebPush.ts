"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useCrmToken } from "@/hooks/useCrmToken";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const CRM_SUBSCRIBE_URL = "/api/crm/timeproof/push/subscribe";
const LAST_VERIFIED_KEY = "crm_push_last_verified";
const RESUBSCRIBE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

// The auto-sync below runs silently in the background (no toast, no user
// action) every time a component using this hook mounts — a single failed
// attempt (mobile network drop, app backgrounded mid-request, etc.) used to
// just get swallowed and wait for the next mount to try again, which could
// be minutes or hours away. Retrying a few times with backoff right here
// means a transient failure resolves itself within seconds instead of
// depending on the user happening to reopen/navigate the app again.
async function postWithRetry(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  attempts = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await apiClient.post(url, body, { headers });
      return true;
    } catch {
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
      }
    }
  }
  return false;
}

function getDeviceHint() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (/iPad|iPhone|iPod/i.test(ua)) return standalone ? "ios-pwa-mobile" : "ios-mobile";
  if (/Android/i.test(ua)) return standalone ? "android-pwa-mobile" : "android-mobile";
  if (/Mobile/i.test(ua)) return standalone ? "pwa-mobile" : "mobile";
  return standalone ? "desktop-pwa" : "desktop";
}

const SUPRASPACE_SUBDOMAIN = "space.suprah-app.com";

// Which app registered this subscription — lets the dedicated SupraSpace
// app's notifications stay independent of the main Suprah AI app's
// "Messages" mute toggle (see pushToConversationMembers, backend).
function getAppSource(): "main" | "supraspace" {
  if (typeof window === "undefined") return "main";
  return window.location.hostname === SUPRASPACE_SUBDOMAIN ? "supraspace" : "main";
}

export function useCrmWebPush() {
  const crmToken = useCrmToken();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getServiceWorkerRegistration = useCallback(async () => {
    const hasSupport =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!hasSupport) throw new Error("Web Push not supported");

    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) await navigator.serviceWorker.register("/sw.js");

    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW timeout")), 12000)
      ),
    ]) as Promise<ServiceWorkerRegistration>;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsSupported(false);
      setIsLoading(false);
      return null;
    }

    try {
      setIsSupported(true);
      const registration = await getServiceWorkerRegistration();
      let subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // Auto-sync existing subscription to CRM backend on every mount — see
      // postWithRetry above for why this retries instead of firing once.
      if (subscription) {
        const token = crmToken || localStorage.getItem("crm_token");
        if (token) {
          // getSubscription() returning an object only means the browser
          // still *thinks* it has one — iOS can silently orphan the actual
          // push registration (PWA reinstalled, storage evicted) while this
          // stays truthy forever, which would otherwise make isSubscribed
          // (and CrmPushPrompt's "already subscribed, don't ask again" gate)
          // permanently wrong with no way to self-heal. Periodically forcing
          // a fresh subscribe cycle re-mints a live endpoint on a real device
          // and is a no-op cost on one that was already fine (see
          // crmPush.service.ts for the matching backend-side cleanup).
          const lastVerified = Number(localStorage.getItem(LAST_VERIFIED_KEY) || 0);
          if (Date.now() - lastVerified > RESUBSCRIBE_INTERVAL_MS && VAPID_PUBLIC_KEY) {
            try {
              await subscription.unsubscribe();
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
              });
              setIsSubscribed(!!subscription);
            } catch {
              // Refresh failed — fall back to re-syncing whatever we still have.
            }
          }

          const saved = await postWithRetry(
            CRM_SUBSCRIBE_URL,
            { subscription, deviceHint: getDeviceHint(), appSource: getAppSource() },
            { Authorization: `Bearer ${token}` },
          );
          if (saved) localStorage.setItem(LAST_VERIFIED_KEY, String(Date.now()));
        }
      }

      return subscription;
    } catch {
      // Ignore — push may not be available in this context
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [crmToken, getServiceWorkerRegistration]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push key is missing. Please contact support.");
      return;
    }

    try {
      setIsLoading(true);

      if (Notification.permission === "denied") {
        toast.error("Notifications are blocked. Please allow them in browser settings.");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission not granted.");
          return;
        }
      }

      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const token = crmToken || localStorage.getItem("crm_token");
      if (!token) {
        toast.error("CRM session is still loading. Please try again.");
        return;
      }
      const saved = await postWithRetry(
        CRM_SUBSCRIBE_URL,
        { subscription, deviceHint: getDeviceHint(), appSource: getAppSource() },
        { Authorization: `Bearer ${token}` },
      );
      if (!saved) {
        toast.error("Failed to enable notifications. Please try again.");
        return;
      }

      setIsSubscribed(true);
      toast.success("Admin alerts enabled!");
    } catch (error) {
      console.error("[CrmWebPush] Subscribe failed:", error);
      toast.error("Failed to enable notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setIsLoading(true);
      const subscription = await checkSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        const token = crmToken || localStorage.getItem("crm_token");
        await apiClient.delete(CRM_SUBSCRIBE_URL, {
          data: { endpoint: subscription.endpoint },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setIsSubscribed(false);
        toast.info("Admin alerts disabled.");
      }
    } catch (error) {
      console.error("[CrmWebPush] Unsubscribe failed:", error);
      toast.error("Failed to disable notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    refreshSubscription: checkSubscription,
  };
}
