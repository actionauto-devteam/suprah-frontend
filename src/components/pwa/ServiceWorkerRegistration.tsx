"use client";

import { useEffect } from "react";

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "true";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        if (process.env.NODE_ENV === "development" && !ENABLE_SW_DEV) return;

        let cancelled = false;
        let refreshing = false;

        const handleControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        };

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    updateViaCache: "none",
                });
                void registration.update();

                registration.addEventListener("updatefound", () => {
                    const nextWorker = registration.installing;
                    if (!nextWorker) return;

                    nextWorker.addEventListener("statechange", () => {
                        if (
                            nextWorker.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            handleControllerChange();
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

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        registerServiceWorker();

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange,
            );
        };
    }, []);

    return null;
}
