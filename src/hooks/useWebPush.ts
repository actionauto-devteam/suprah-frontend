"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// Serwist is configured (next.config.ts) to skip generating a real /sw.js in
// dev unless this is set — matches ServiceWorkerRegistration.tsx's gating.
// Without this check, registering against the dev stub SW here means
// navigator.serviceWorker.ready never resolves, and every page load logs a
// "Service Worker timeout" warning that isn't an actual error.
const SW_ENABLED = process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";

export function useWebPush() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const getServiceWorkerRegistration = useCallback(async () => {
        const hasSupport =
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window;

        if (!hasSupport) {
            throw new Error("Web Push is not supported in this browser.");
        }
        if (!SW_ENABLED) {
            throw new Error("Service Worker is disabled in this dev environment (NEXT_PUBLIC_ENABLE_SW_DEV=true to enable).");
        }

        const existing = await navigator.serviceWorker.getRegistration();
        if (!existing) {
            await navigator.serviceWorker.register("/sw.js");
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Service Worker timeout")), 12000)
        );

        return Promise.race([navigator.serviceWorker.ready, timeoutPromise]) as Promise<ServiceWorkerRegistration>;
    }, []);

    // Helper to convert VAPID key
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

    const getSubscription = useCallback(async () => {
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

            // AUTO-SYNC LOGIC: If we have a subscription locally, ensure it's synced to the backend for this session
            if (subscription) {
                const userId = (typeof window !== "undefined") ? localStorage.getItem('userId') : null; // Quick check from local storage if available
                const syncKey = userId ? `push_sync_${userId}_${subscription.endpoint}` : `push_sync_anon_${subscription.endpoint}`;

                const lastSync = sessionStorage.getItem(syncKey);
                if (!lastSync) {
                    apiClient.post("/api/push/subscribe", {
                        subscription,
                        deviceHint: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
                    }).then(() => {
                        sessionStorage.setItem(syncKey, Date.now().toString());
                        console.log("[WebPush] Auto-synced existing subscription to backend for user:", userId);
                    }).catch(err => {
                        console.warn("[WebPush] Auto-sync failed (user might not be logged in yet):", err);
                    });
                }
            }

            return subscription;
        } catch (error) {
            // Expected in dev when the Service Worker is intentionally disabled
            // (see SW_ENABLED above) — not a real error, so don't alarm the console.
            if (SW_ENABLED) console.warn("[WebPush] Initialization error or timeout:", error);
        } finally {
            setIsLoading(false);
        }
        return null;
    }, [getServiceWorkerRegistration]);

    useEffect(() => {
        getSubscription();
    }, [getSubscription]);

    const subscribe = async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error("VAPID Public Key missing from environment variables.");
            toast.error("Push key is missing. Please contact support.");
            return;
        }

        try {
            setIsLoading(true);

            if (Notification.permission === "denied") {
                toast.error("Notifications are blocked in this browser. Please allow them in site settings.");
                return;
            }

            if (Notification.permission === "default") {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    toast.error("Notification permission was not granted.");
                    return;
                }
            }

            const registration = await getServiceWorkerRegistration();

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Send to backend
            await apiClient.post("/api/push/subscribe", {
                subscription,
                deviceHint: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
            });

            setIsSubscribed(true);
            toast.success("Notifications enabled!");
        } catch (error) {
            console.error("Failed to subscribe to Web Push:", error);
            toast.error("Failed to enable notifications. Please check your browser settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribe = async () => {
        try {
            setIsLoading(true);
            const subscription = await getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                // Remove from backend
                await apiClient.delete("/api/push/subscribe", {
                    data: { endpoint: subscription.endpoint },
                });

                setIsSubscribed(false);
                toast.info("Notifications disabled.");
            }
        } catch (error) {
            console.error("Failed to unsubscribe from Web Push:", error);
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
        refreshSubscription: getSubscription,
    };
}
