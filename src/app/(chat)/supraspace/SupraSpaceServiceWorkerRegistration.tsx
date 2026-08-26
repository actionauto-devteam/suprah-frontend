'use client';

import { useEffect } from 'react';

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
const SUPRASPACE_SUBDOMAIN = 'space.suprah-app.com';

// Registers /sw.js under a scope narrower than the root registration's
// (see ServiceWorkerRegistration.tsx). A script served from / is allowed to
// control any scope up to and including /, so this needs no separate SW
// file. Per spec, navigator.serviceWorker.getRegistration() resolves to the
// most-specific matching scope for the current document, so once this
// registration is active, useCrmWebPush's pushManager.subscribe() on
// SupraSpace pages produces a subscription independent of the main app's.
export function SupraSpaceServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development' && !ENABLE_SW_DEV) return;

        // On the subdomain, the middleware rewrite is invisible to the
        // browser — window.location.pathname stays "/", there's no
        // "/supraspace" path to scope under. Scope to root there instead.
        const scope = window.location.hostname === SUPRASPACE_SUBDOMAIN ? '/' : '/supraspace/';

        let cancelled = false;
        navigator.serviceWorker
            .register('/sw.js', { scope, updateViaCache: 'none' })
            .then((registration) => {
                if (!cancelled) console.log('[SW] SupraSpace scope registered:', registration.scope);
            })
            .catch((error) => {
                if (!cancelled) console.warn('[SW] SupraSpace scope registration failed:', error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
