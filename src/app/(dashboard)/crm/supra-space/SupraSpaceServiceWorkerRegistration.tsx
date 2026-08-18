'use client';

import { useEffect } from 'react';

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
const SUPRA_SPACE_SCOPE = '/crm/supra-space/';

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

        let cancelled = false;
        navigator.serviceWorker
            .register('/sw.js', { scope: SUPRA_SPACE_SCOPE, updateViaCache: 'none' })
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
