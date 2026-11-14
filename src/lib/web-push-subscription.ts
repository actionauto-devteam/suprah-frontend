/** Preserve a device's explicit opt-out while repairing browser-rotated subscriptions. */
const DISABLED_KEY = 'suprah_device_push_disabled';

export async function dismissDeviceNotifications(payload: { tag?: string }): Promise<void> {
  if (!payload?.tag || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const notifications = await registration?.getNotifications({ tag: payload.tag });
    notifications?.forEach(notification => notification.close());
  } catch { /* Dismissal is best effort; unread state comes from the server. */ }
}

export function isDevicePushDisabled(): boolean {
  try { return localStorage.getItem(DISABLED_KEY) === 'true'; } catch { return false; }
}

export function setDevicePushDisabled(disabled: boolean): void {
  try {
    if (disabled) localStorage.setItem(DISABLED_KEY, 'true');
    else localStorage.removeItem(DISABLED_KEY);
  } catch { /* Storage may be unavailable in a private browsing context. */ }
}

export function pushApplicationServerKey(key: string): Uint8Array<ArrayBuffer> {
  const padded = key + '='.repeat((4 - key.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

// Several dashboard components mount push hooks at once. Share subscription
// creation so they cannot unsubscribe/replace one another's healthy endpoint.
let recovery: Promise<PushSubscription | null> | null = null;
export async function recoverDevicePush(
  registration: ServiceWorkerRegistration, key: string | undefined,
): Promise<PushSubscription | null> {
  if (isDevicePushDisabled() || Notification.permission !== 'granted') return null;
  if (recovery) return recovery;
  recovery = (async () => {
    let subscription = await registration.pushManager.getSubscription();
    if (subscription?.expirationTime && subscription.expirationTime <= Date.now()) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription && key) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: pushApplicationServerKey(key),
      });
    }
    if (subscription && isDevicePushDisabled()) {
      await subscription.unsubscribe();
      return null;
    }
    return subscription;
  })();
  try { return await recovery; } finally { recovery = null; }
}
