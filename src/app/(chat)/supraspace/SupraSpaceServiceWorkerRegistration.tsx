'use client';

import { useEffect } from 'react';

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
const SUPRASPACE_SUBDOMAIN = 'space.suprah-app.com';

export function SupraSpaceServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development' && !ENABLE_SW_DEV) return;

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
