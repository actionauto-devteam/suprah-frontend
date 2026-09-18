'use client';

import { useEffect } from 'react';

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
const SUPRASPACE_SUBDOMAIN = 'space.suprah-app.com';
const UPDATE_AVAILABLE_EVENT = 'supraspace:pwa-update-available';
const APPLY_UPDATE_EVENT = 'supraspace:pwa-apply-update';
const CLEAR_PRIVATE_DATA_MESSAGE = 'SUPRASPACE_CLEAR_PRIVATE_DATA';

export function SupraSpaceServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development' && !ENABLE_SW_DEV) return;

        const scope = window.location.hostname === SUPRASPACE_SUBDOMAIN ? '/' : '/supraspace/';

        let cancelled = false;
        let reloadAfterControllerChange = false;
        let registration: ServiceWorkerRegistration | null = null;
        let installingWorker: ServiceWorker | null = null;
        let removeUpdateCheck = () => {};

        const announceWaitingWorker = () => {
            if (registration?.waiting && navigator.serviceWorker.controller) {
                window.dispatchEvent(new Event(UPDATE_AVAILABLE_EVENT));
            }
        };
        const onControllerChange = () => {
            if (reloadAfterControllerChange) window.location.reload();
        };
        const onApplyUpdate = () => {
            if (!registration?.waiting) return;
            reloadAfterControllerChange = true;
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        };
        const onClearPrivateData = () => {
            const target = navigator.serviceWorker.controller || registration?.active;
            target?.postMessage({ type: CLEAR_PRIVATE_DATA_MESSAGE });
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        window.addEventListener(APPLY_UPDATE_EVENT, onApplyUpdate);
        window.addEventListener('suprah:clear-private-cache', onClearPrivateData);
        navigator.serviceWorker
            .register('/sw.js', { scope, updateViaCache: 'none' })
            .then((nextRegistration) => {
                registration = nextRegistration;
                if (cancelled) return;
                announceWaitingWorker();
                registration.addEventListener('updatefound', () => {
                    installingWorker = registration?.installing || null;
                    installingWorker?.addEventListener('statechange', () => {
                        if (installingWorker?.state === 'installed') announceWaitingWorker();
                    });
                });
                const checkForUpdate = () => {
                    if (document.visibilityState === 'visible') void registration?.update().catch(() => {});
                };
                window.addEventListener('focus', checkForUpdate);
                document.addEventListener('visibilitychange', checkForUpdate);
                removeUpdateCheck = () => {
                    window.removeEventListener('focus', checkForUpdate);
                    document.removeEventListener('visibilitychange', checkForUpdate);
                };
            })
            .catch((error) => {
                if (!cancelled) console.warn('[SW] SupraSpace scope registration failed:', error);
            });

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            window.removeEventListener(APPLY_UPDATE_EVENT, onApplyUpdate);
            window.removeEventListener('suprah:clear-private-cache', onClearPrivateData);
            removeUpdateCheck();
        };
    }, []);

    return null;
}
