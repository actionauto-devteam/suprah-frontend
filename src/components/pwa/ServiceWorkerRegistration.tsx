"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { playShiftAlertSound } from "@/lib/notification-sound";

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// A tab left open across a deploy keeps running the service worker (and JS
// bundle) that was active when it loaded — `skipWaiting: false` means the new
// one installs but sits in "waiting" until every tab is closed, so a real,
// deployed fix can look "still broken" indefinitely to whoever never closes
// their tab. This prompts them to activate it on their own terms instead of
// leaving them silently stuck on stale code.
function promptUpdate(registration: ServiceWorkerRegistration) {
    let reloaded = false;
    toast("A new version is available.", {
        id: "sw-update-available",
        duration: Infinity,
        action: {
            label: "Refresh",
            onClick: () => {
                if (!registration.waiting) return;
                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    if (reloaded) return;
                    reloaded = true;
                    window.location.reload();
                });
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
            },
        },
    });
}

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        if (process.env.NODE_ENV === "development" && !ENABLE_SW_DEV) {
            // A service worker registered during an earlier session (e.g. before
            // this flag existed, or while ENABLE_SW_DEV was briefly true) stays
            // active across dev-server restarts. Its baked-in precache manifest
            // then references hashed build filenames that no longer exist once
            // the dev server rebuilds, producing a stream of "bad-precaching-response
            // 404" errors. Since dev intentionally has no working SW, clean up
            // any leftover registration + caches instead of leaving it to fail.
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
        let pollId: ReturnType<typeof setInterval> | undefined;

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    updateViaCache: "none",
                });
                if (cancelled) return;
                console.log("[SW] Registered:", registration.scope);

                // A worker can already be sitting in "waiting" from before this
                // tab was even opened (e.g. it installed while the tab was
                // backgrounded). Only prompt when there's an active controller —
                // a first-ever visit has nothing to "update" from yet.
                if (registration.waiting && navigator.serviceWorker.controller) {
                    promptUpdate(registration);
                }

                registration.addEventListener("updatefound", () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) return;
                    installingWorker.addEventListener("statechange", () => {
                        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                            promptUpdate(registration);
                        }
                    });
                });

                // Long-lived tabs never re-check for a new worker on their own —
                // poll periodically so a pinned/always-open tab still eventually
                // surfaces the prompt instead of staying stuck on stale code.
                pollId = setInterval(() => {
                    registration.update().catch(() => {});
                }, UPDATE_CHECK_INTERVAL_MS);
            } catch (error) {
                if (!cancelled) {
                    console.warn("[SW] Registration failed:", error);
                }
            }
        };

        // Shift Alerts pushes ask the SW to have any open client play the
        // dedicated warning sound — see sw.ts's push handler and
        // playShiftAlertSound() in lib/notification-sound.ts. Only reachable
        // while a tab/PWA window is open; closed/locked falls back to the
        // OS's own default notification sound (Web Push has no sound field).
        const handleSwMessage = (event: MessageEvent) => {
            if (event.data?.type === "PLAY_SHIFT_ALERT_SOUND") {
                playShiftAlertSound(event.data.soundFile);
            }
        };

        navigator.serviceWorker.addEventListener("message", handleSwMessage);
        registerServiceWorker();

        return () => {
            cancelled = true;
            if (pollId) clearInterval(pollId);
            navigator.serviceWorker.removeEventListener("message", handleSwMessage);
        };
    }, []);

    return null;
}
