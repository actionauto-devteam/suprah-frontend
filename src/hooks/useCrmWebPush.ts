"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useCrmToken } from "@/hooks/useCrmToken";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const CRM_SUBSCRIBE_URL = "/api/crm/timeproof/push/subscribe";

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
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      // Auto-sync existing subscription to CRM backend (once per session)
      if (subscription) {
        const token = crmToken || localStorage.getItem("crm_token");
        if (token) {
          apiClient
            .post(CRM_SUBSCRIBE_URL, {
              subscription,
              deviceHint: getDeviceHint(),
            }, { headers: { Authorization: `Bearer ${token}` } })
            .catch(() => {});
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
      await apiClient.post(CRM_SUBSCRIBE_URL, {
        subscription,
        deviceHint: getDeviceHint(),
      }, { headers: { Authorization: `Bearer ${token}` } });

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
