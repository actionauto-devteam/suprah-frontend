'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { watchForServiceWorkerUpdate, applyServiceWorkerUpdate } from '@/lib/sw-update';

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
                if (!cancelled) {
                    console.log('[SW] SupraSpace scope registered:', registration.scope);
                    watchForServiceWorkerUpdate(registration, () => {
                        if (cancelled) return;
                        // Used to be a manual "Refresh" toast action — on iOS
                        // the toast sits high enough (Dynamic Island / notch
                        // area) that the button was sometimes unreachable, so
                        // an update could get stuck waiting on a tap nobody
                        // could make. Auto-applies instead; the only guard is
                        // not yanking someone out from under active typing
                        // (a focused text input/textarea/contenteditable —
                        // the message composer) — it waits for that focus to
                        // clear (blur, or message sent) before reloading.
                        const isTypingTarget = (el: Element | null) =>
                            !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || (el as HTMLElement).isContentEditable);
                        const tryApply = () => {
                            if (cancelled) return;
                            if (isTypingTarget(document.activeElement)) {
                                document.addEventListener('focusout', tryApply, { once: true });
                                return;
                            }
                            toast.info('Updating SupraSpace…', { duration: 2000 });
                            applyServiceWorkerUpdate(registration);
                        };
                        setTimeout(tryApply, 1500);
                    });
                }
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
