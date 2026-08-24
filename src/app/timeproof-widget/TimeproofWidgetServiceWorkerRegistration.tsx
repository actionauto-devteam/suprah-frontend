'use client';

import { useEffect } from 'react';

const ENABLE_SW_DEV = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
const WIDGET_SCOPE = '/timeproof-widget/';

// Mirrors SupraSpaceServiceWorkerRegistration.tsx — registers /sw.js under a scope narrower
// than the root registration's, so this route qualifies as its own installable PWA (distinct
// "Add to Home Screen" identity/icon) instead of just being a page inside the main app's scope.
export function TimeproofWidgetServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development' && !ENABLE_SW_DEV) return;

        let cancelled = false;
        navigator.serviceWorker
            .register('/sw.js', { scope: WIDGET_SCOPE, updateViaCache: 'none' })
            .then((registration) => {
                if (!cancelled) console.log('[SW] TimeProof widget scope registered:', registration.scope);
            })
            .catch((error) => {
                if (!cancelled) console.warn('[SW] TimeProof widget scope registration failed:', error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
