"use client";

import { useEffect } from "react";
import { playPingSound, playShiftAlertSound } from "@/lib/notification-sound";

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        if (process.env.NODE_ENV === "development" && !ENABLE_SW_DEV) {
            // A service worker registered during an earlier session (e.g. before
            // this flag existed, or while ENABLE_SW_DEV was briefly true) stays
            // active across dev-server restarts. Its baked-in precache manifest
            // then references hashed build filenames that no longer exist once
            // the dev server rebuilds. Development intentionally has no working
            // SW, so remove stale registrations and caches instead.
            navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.unregister());
            }).catch(() => {});
            if ("caches" in window) {
                caches.keys().then((keys) => {
                    keys.forEach((key) => caches.delete(key));
                }).catch(() => {});
            }
            return;
        }

        let cancelled = false;

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    updateViaCache: "none",
                });
                if (!cancelled) {
                    console.log("[SW] Registered:", registration.scope);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("[SW] Registration failed:", error);
                }
            }
        };

        // Custom files can only be played by an open page/PWA client. Closed or
        // locked devices still receive the OS/browser notification sound. The
        // worker now distinguishes an attention ping from an urgent warning.
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === "PLAY_ATTENTION_ALERT_SOUND") {
                playPingSound(event.data.soundFile);
                return;
            }
            if (event.data?.type === "PLAY_SHIFT_ALERT_SOUND") {
                playShiftAlertSound(event.data.soundFile);
            }
        };

        navigator.serviceWorker.addEventListener("message", handleSwMessage);
        registerServiceWorker();

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener("message", handleSwMessage);
        };
    }, []);

    return null;
}