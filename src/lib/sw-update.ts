// sw.ts deliberately sets skipWaiting: false — a new deploy's service worker
// installs in the background but doesn't take over an already-open tab/PWA
// window until every tab on the OLD worker closes. That's on purpose (avoids
// yanking someone out of mid-edit work with a surprise reload), but on
// mobile a PWA window often never gets "closed" in a way that triggers this
// — the OS just backgrounds it — so an update can sit waiting indefinitely.
// That's what looks like "changes only take effect after reinstalling."
// This watches for that waiting worker and lets callers offer the user a
// one-tap "reload to update" instead of leaving them stuck.
export function watchForServiceWorkerUpdate(
    registration: ServiceWorkerRegistration,
    onUpdateReady: () => void,
) {
    // A worker can already be sitting in "waiting" from before this tab even
    // opened (deploy landed while the tab/app was closed).
    if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdateReady();
    }

    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
            // "installed" + an existing controller means this is a genuine
            // UPDATE, not the very first activation on a fresh device.
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                onUpdateReady();
            }
        });
    });
}

export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
    if (!registration.waiting) return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
    });
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
