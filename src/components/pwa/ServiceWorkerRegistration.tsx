"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { playShiftAlertSound } from "@/lib/notification-sound";

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";
const UPDATE_TOAST_ID = "sw-update-available";

export function ServiceWorkerRegistration() {
    const waitingWorkerRef = useRef<ServiceWorker | null>(null);

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
        let refreshing = false;

        const handleControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        };

        // sw.ts now registers with `skipWaiting: false`, so a freshly-installed
        // update sits in `registration.waiting` instead of taking over
        // instantly — this surfaces it as a dismissible toast instead of
        // yanking the page out from under whatever the user is doing.
        const applyUpdate = () => {
            waitingWorkerRef.current?.postMessage({ type: "SKIP_WAITING" });
        };

        const announceUpdate = (worker: ServiceWorker) => {
            waitingWorkerRef.current = worker;
            toast("A new version is available.", {
                id: UPDATE_TOAST_ID,
                duration: Infinity,
                icon: <RefreshCw className="h-4 w-4" />,
                action: { label: "Refresh", onClick: applyUpdate },
                cancel: { label: "Later", onClick: () => {} },
            });
        };

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    updateViaCache: "none",
                });
                void registration.update();

                // An update may have finished installing in a previous tab/session
                // and still be waiting.
                if (registration.waiting && navigator.serviceWorker.controller) {
                    announceUpdate(registration.waiting);
                }

                registration.addEventListener("updatefound", () => {
                    const nextWorker = registration.installing;
                    if (!nextWorker) return;

                    nextWorker.addEventListener("statechange", () => {
                        if (
                            nextWorker.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            announceUpdate(nextWorker);
                        }
                    });
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

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        navigator.serviceWorker.addEventListener("message", handleSwMessage);
        registerServiceWorker();

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange,
            );
            navigator.serviceWorker.removeEventListener("message", handleSwMessage);
        };
    }, []);

    return null;
}
