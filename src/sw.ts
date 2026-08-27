import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist, setCacheNameDetails } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope & typeof globalThis;

setCacheNameDetails({
  prefix: "actionauto-v2026-08-19",
});

// ---------------------------------------------------------------------------
// FIX: @serwist/next's built-in `defaultCache` has a broken "pages" route.
// Its matcher checks `request.headers.get("Content-Type")`, but browsers
// never set a Content-Type header on outgoing navigation requests (they send
// `Accept: text/html` instead). That means the route can never match, so
// every full-page navigation (e.g. /crm/supra-leo) falls through to
// defaultCache's generic catch-all NetworkFirst route, which has no
// networkTimeoutSeconds and no catchHandler. If that fetch fails or gets
// aborted and there's no cache entry yet, Serwist has nothing to return and
// throws an uncaught "no-response" error — which is exactly what you saw.
//
// Fix: add a route ahead of defaultCache that correctly matches real
// navigations via `request.mode === "navigate"`, with a network timeout so
// it can fall back to cache instead of hanging or throwing.
// ---------------------------------------------------------------------------

const navigationFix: RuntimeCaching[] = [
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.mode === "navigate" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 10,
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Was `true` (new SW takes over the instant it finishes installing), which
  // forced every open tab to hard-reload with zero warning on every deploy —
  // including mid-edit in Project Management. `false` leaves the new worker
  // in "waiting" until every open tab referencing the old one is closed, so
  // a deploy never yanks the page out from under whatever the user is doing.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  // Our fix is placed BEFORE defaultCache so it wins the match for real
  // navigations; defaultCache's (broken) pages route becomes unreachable
  // dead code, harmlessly, and everything else in defaultCache (fonts,
  // images, RSC, JS/CSS chunks, API routes, etc.) is untouched.
  runtimeCaching: [...navigationFix, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Lets a waiting worker be told to activate on demand — see sw-update.ts's
// applyServiceWorkerUpdate(), the other half of this: skipWaiting is false
// above so a deploy never yanks a page out from under the user, but that
// means someone has to actually ask this worker to take over once they're
// ready (an "Update available" toast's Refresh button, currently).
self.addEventListener("message", (event: any) => {
  if (event.data?.type === "SKIP_WAITING") {
    (self as any).skipWaiting();
  }
});

// --- CUSTOM WEB PUSH LISTENERS ---
// (unchanged from your original — carried over verbatim)

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || self.location.origin
).replace(/\/$/, "");
const DEFAULT_NOTIFICATION_ICON = "/icon-192x192.png";
const SUMMARY_NOTIFICATION_TAG = "notification-summary";

/**
 * True when at least one tab has the app open AND in the foreground. This is
 * the signal for "the user is actively looking at the system right now" —
 * per-push spam there is fine (the user asked for that). It's false both
 * when no tab is open at all AND when a tab exists but is backgrounded/
 * minimized, which is exactly the "just turned my PC/browser on" case: the
 * push service flushes its whole offline backlog in one burst, and each one
 * used to fire its own showNotification() call, so closing one just revealed
 * the next queued toast underneath it.
 */
async function isAppActive(): Promise<boolean> {
  const clientList = await (self as any).clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clientList.some((c: any) => c.focused || c.visibilityState === "visible");
}

/**
 * Folds a push into a single running tray notification instead of stacking a
 * new one, while the app is closed/backgrounded. Reads the previous count off
 * the still-showing notification's own `data` (no extra storage needed) — and
 * because it reuses one `tag`, there is only ever ONE of these in the tray at
 * a time; `renotify: true` still alerts/vibrates on every bump. It self-resets
 * next burst because clicking (or dismissing) closes it, so the next push
 * finds nothing under this tag and starts back at 1.
 */
async function showBurstSummary(data: any): Promise<void> {
  const existing = await (self as any).registration.getNotifications({
    tag: SUMMARY_NOTIFICATION_TAG,
  });
  const count = (existing[0]?.data?.count || 0) + 1;
  const latest = data.title && data.body ? `${data.title}: ${data.body}` : (data.title || data.body || "New activity");

  await (self as any).registration.showNotification(
    `You have ${count} new notification${count === 1 ? "" : "s"}`,
    {
      body: count === 1 ? latest : `Latest: ${latest}`,
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_ICON,
      tag: SUMMARY_NOTIFICATION_TAG,
      renotify: true,
      vibrate: [100, 50, 100],
      data: { url: "/notifications", count },
    },
  );
}

/**
 * Reads a token this SW itself has no other way to obtain — AuthProvider
 * mirrors the main-site accessToken into IndexedDB on every change (see
 * providers/AuthProvider.tsx), and useCrmToken.ts does the same for the CRM
 * SSO token under a separate key, specifically so background SW code (this
 * function, plus handleBackgroundAction below) can authenticate a fetch
 * without any page/tab open.
 */
function getStoredToken(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("action-auto-auth", 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("tokens")) return resolve(null);
        const tx = db.transaction("tokens", "readonly");
        const store = tx.objectStore("tokens");
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Writes into the same IndexedDB store getStoredToken reads from — reuses it
// as a generic key-value store rather than opening a second database, purely
// so renewPushSubscription (below) has somewhere to remember when it last
// ran without needing `localStorage` (not available in a service worker).
function setStoredValue(key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("action-auto-auth", 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("tokens")) return resolve();
        const tx = db.transaction("tokens", "readwrite");
        const store = tx.objectStore("tokens");
        const putReq = store.put(value, key);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Re-subscribes and re-POSTs to the backend, shared by pushsubscriptionchange
// (fired when the browser itself rotates/invalidates the subscription — see
// that handler below) and the periodic self-heal check inside the push event
// handler. The periodic path exists because the OBVIOUS place to self-heal —
// useCrmWebPush.ts's mount-time check — only ever runs if the person opens
// the app, but the whole reason they'd open it is because push notified
// them... which is exactly what's broken when this needs to run. A push
// event, in contrast, wakes this service worker on every single delivery
// ATTEMPT regardless of whether display ultimately succeeds, so checking
// staleness here doesn't depend on the broken channel to trigger its own fix.
const PUSH_RESUBSCRIBE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
const SW_LAST_VERIFIED_KEY = "swPushLastVerified";

async function renewPushSubscription(existingSubscription?: any, applicationServerKeyHint?: any): Promise<void> {
  try {
    const applicationServerKey = existingSubscription?.options?.applicationServerKey ?? applicationServerKeyHint;
    const subscription =
      existingSubscription ??
      (await (self as any).registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }));

    const body = JSON.stringify({ subscription, deviceHint: "unknown" });
    const [accessToken, crmAccessToken] = await Promise.all([
      getStoredToken("accessToken"),
      getStoredToken("crmAccessToken"),
    ]);

    await Promise.allSettled([
      accessToken
        ? fetch(`${API_BASE_URL}/api/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body,
        })
        : Promise.resolve(),
      crmAccessToken
        ? fetch(`${API_BASE_URL}/api/crm/timeproof/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${crmAccessToken}` },
          body,
        })
        : Promise.resolve(),
    ]);
    await setStoredValue(SW_LAST_VERIFIED_KEY, String(Date.now()));
  } catch (err) {
    console.error("[SW] Failed to renew push subscription:", err);
  }
}

async function maybeSelfHealPushSubscription(): Promise<void> {
  try {
    const lastVerified = Number((await getStoredToken(SW_LAST_VERIFIED_KEY)) || 0);
    if (Date.now() - lastVerified < PUSH_RESUBSCRIBE_INTERVAL_MS) return;
    const subscription = await (self as any).registration.pushManager.getSubscription();
    if (!subscription) return; // nothing to renew — a dead/missing subscription here is the foreground prompt's job, not this
    await renewPushSubscription(subscription);
  } catch (err) {
    console.error("[SW] Self-heal check failed:", err);
  }
}

self.addEventListener("push", (event: any) => {
  // Runs independently of whatever happens below (display success/failure,
  // parse errors, burst-collapse, etc.) — a separate event.waitUntil() call
  // is valid and keeps this fully decoupled from the display branches. See
  // maybeSelfHealPushSubscription's own comment for why this specifically
  // needs to live here rather than only in the foreground hook.
  event.waitUntil(maybeSelfHealPushSubscription());

  // Every push received MUST result in a shown notification — browsers
  // track "silent" pushes per-origin and will eventually revoke push
  // permission for sites that receive pushes without displaying one. Both
  // branches below (malformed/missing payload) now fall through to a
  // generic notification instead of silently doing nothing, and the whole
  // handler is wrapped in event.waitUntil so the SW can't be killed
  // mid-flight — both matter most precisely when no tab is open to notice.
  event.waitUntil(
    (async () => {
      const fallback = { title: "New notification", body: "You have a new notification. Open the app to view it." };

      if (!event.data) {
        if (!(await isAppActive())) return void (await showBurstSummary(fallback));
        await (self as any).registration.showNotification(fallback.title, {
          body: fallback.body,
          icon: DEFAULT_NOTIFICATION_ICON,
          badge: DEFAULT_NOTIFICATION_ICON,
        });
        return;
      }

      let data: any;
      try {
        data = event.data.json();
      } catch (err) {
        console.error("[SW] Push payload parse error:", err);
        if (!(await isAppActive())) return void (await showBurstSummary(fallback));
        await (self as any).registration.showNotification(fallback.title, {
          body: fallback.body,
          icon: DEFAULT_NOTIFICATION_ICON,
          badge: DEFAULT_NOTIFICATION_ICON,
        });
        return;
      }

      // 1. HANDLE SILENT SYNC (DISMISSAL)
      if (data.isSyncAction && data.action === "dismiss") {
        const notifications = await (self as any).registration.getNotifications({ tag: data.tag });
        notifications.forEach((notification: any) => notification.close());
        return;
      }

      // 2. BURST COLLAPSE — app closed/backgrounded and this isn't a
      // safety-critical Shift Alert (those keep their dedicated sound and
      // always surface standalone). Everything else folds into one running
      // summary tray notification so reconnecting after being away shows
      // "You have N notifications" instead of a wall of individual toasts.
      if (!data.data?.playSound && !(await isAppActive())) {
        await showBurstSummary(data);
        return;
      }

      // 3. STANDARD NOTIFICATION DISPLAY
      const options = {
        body: data.body,
        icon: data.icon || DEFAULT_NOTIFICATION_ICON,
        image: data.image || undefined,
        badge: DEFAULT_NOTIFICATION_ICON,
        tag: data.tag,
        data: {
          url: data.data?.url || "/",
          conversationId: data.data?.conversationId,
          messageId: data.data?.messageId,
          notificationId: data.data?.notificationId,
          driverRequestId: data.data?.driverRequestId,
          alertId: data.data?.alertId,
        },
        actions: data.actions || [],
        vibrate: [100, 50, 100],
        // Without this, a second push sharing the same tag (e.g. another
        // message in the same conversation — see pushToConversationMembers'
        // tag: conv._id) silently replaces the prior notification on
        // Chrome/Android with no new alert, sound, or vibration — it just
        // looks like nothing arrived. Safari/iOS doesn't collapse same-tag
        // notifications the same way, which is why this only ever showed up
        // as "Android stops after the first one, iOS keeps working."
        renotify: !!data.tag,
      };

      // Shift Alerts carry a dedicated warning sound — the OS/browser only
      // plays its own default sound while the app is closed/locked (no
      // "sound" field exists in the Push/Notification spec), but if a client
      // is already open, tell it to play the real file via postMessage.
      const notifyClients = data.data?.playSound
        ? (self as any).clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList: any[]) => {
              clientList.forEach((client) =>
                client.postMessage({
                  type: "PLAY_SHIFT_ALERT_SOUND",
                  soundFile: data.data.soundFile,
                }),
              );
            })
        : Promise.resolve();

      try {
        await Promise.all([
          (self as any).registration.showNotification(data.title, options),
          notifyClients,
        ]);
      } catch (err) {
        console.error("[SW] showNotification failed, falling back:", err);
        await (self as any).registration.showNotification(data.title || "New notification", {
          body: data.body || "You have a new notification.",
          icon: DEFAULT_NOTIFICATION_ICON,
          badge: DEFAULT_NOTIFICATION_ICON,
        });
      }
    })(),
  );
});

// Fires when the browser rotates or invalidates the existing push
// subscription server-side (key rotation, expiry, capacity limits) — without
// this handler, push silently and permanently dies for that device: the
// backend keeps sending to a dead endpoint, local UI still shows
// "subscribed", and nothing visibly changes until the user manually
// disables/re-enables notifications. Re-subscribes with the same key and
// re-registers with whichever backend(s) this device was actually enrolled
// with (main-site User and/or CrmUser use separate subscribe endpoints/JWTs
// — see useWebPush.ts vs useCrmWebPush.ts).
self.addEventListener("pushsubscriptionchange", (event: any) => {
  const applicationServerKey =
    event.oldSubscription?.options?.applicationServerKey
    ?? event.newSubscription?.options?.applicationServerKey;
  event.waitUntil(renewPushSubscription(event.newSubscription, applicationServerKey));
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const notificationData = event.notification?.data || {};

  if (event.action) {
    const actionInProgress = handleBackgroundAction(
      event.action,
      notificationData,
    );
    event.waitUntil(actionInProgress);
    return;
  }

  const urlToOpen = new URL(notificationData.url || "/", self.location.origin)
  const targetHref = urlToOpen.href;
  const targetPathname = urlToOpen.pathname;

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (client.url === targetHref && "focus" in client) {
            return client.focus();
          }
          if (clientUrl.pathname === targetPathname && "focus" in client) {
            if ("navigate" in client) {
              return client.navigate(targetHref).then((navigatedClient: any) =>
                navigatedClient?.focus ? navigatedClient.focus() : client.focus(),
              );
            }
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(targetHref);
        }
      }),
  );
});

/**
 * Handles background actions (Approve/Reject) triggered from notifications.
 */
async function handleBackgroundAction(action: string, data: any) {
  console.log(`[SW] Handling action: ${action}`, data);

  try {
    const token = await getStoredToken("accessToken");
    if (!token) throw new Error("No auth token found in SW");

    // Driver Dispatch Alert response actions
    if ((action === "acknowledge" || action === "on-my-way") && data?.alertId) {
      const response = action === "on-my-way" ? "on_my_way" : "acknowledged";
      const result = await fetch(
        `${API_BASE_URL}/api/driver-tracking/alerts/${data.alertId}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ response }),
        },
      );

      if (!result.ok) throw new Error(`HTTP ${result.status}`);

      await (self as any).registration.showNotification("Dispatch Response Sent", {
        body: response === "on_my_way" ? "Your status was sent as On My Way." : "The dispatch alert was acknowledged.",
        icon: DEFAULT_NOTIFICATION_ICON,
        tag: `driver-alert-response:${data.alertId}`,
      });
      return;
    }

    // Existing driver-request approval/rejection actions
    const requestId = data?.driverRequestId;
    if (!requestId) return;

    await (self as any).registration.showNotification("Processing Request", {
      body: `Your request to ${action} this driver is being processed...`,
      icon: DEFAULT_NOTIFICATION_ICON,
    });

    const endpoint =
      action === "approve"
        ? `${API_BASE_URL}/api/driver-requests/${requestId}/approve`
        : `${API_BASE_URL}/api/driver-requests/${requestId}/reject`;

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await (self as any).registration.showNotification("Success", {
      body: `Driver request has been successfully ${action}ed.`,
      icon: DEFAULT_NOTIFICATION_ICON,
    });
  } catch (err) {
    console.error("[SW] Background action failed:", err);
    await (self as any).registration.showNotification("Action Failed", {
      body: "Could not process the request in the background. Please open the app.",
      icon: DEFAULT_NOTIFICATION_ICON,
    });
  }
}
