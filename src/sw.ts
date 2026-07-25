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
  prefix: "actionauto-v2026-07-06",
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
  skipWaiting: true,
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

// --- CUSTOM WEB PUSH LISTENERS ---
// (unchanged from your original — carried over verbatim)

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || self.location.origin
).replace(/\/$/, "");
const DEFAULT_NOTIFICATION_ICON = "/icon-192x192.png";

self.addEventListener("push", (event: any) => {
  if (event.data) {
    try {
      const data = event.data.json();

      // 1. HANDLE SILENT SYNC (DISMISSAL)
      if (data.isSyncAction && data.action === "dismiss") {
        event.waitUntil(
          (self as any).registration
            .getNotifications({ tag: data.tag })
            .then((notifications: any[]) => {
              notifications.forEach((notification) => notification.close());
            }),
        );
        return;
      }

      // 2. STANDARD NOTIFICATION DISPLAY
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

      event.waitUntil(
        Promise.all([
          (self as any).registration.showNotification(data.title, options),
          notifyClients,
        ]),
      );
    } catch (err) {
      console.error("[SW] Push event error:", err);
    }
  }
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
  const requestId = data?.driverRequestId;
  if (!requestId) return;

  await (self as any).registration.showNotification("Processing Request", {
    body: `Your request to ${action} this driver is being processed...`,
    icon: DEFAULT_NOTIFICATION_ICON,
  });

  try {
    const token = await new Promise<string | null>((resolve) => {
      const request = indexedDB.open("action-auto-auth", 1);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("tokens")) return resolve(null);
        const tx = db.transaction("tokens", "readonly");
        const store = tx.objectStore("tokens");
        const getReq = store.get("accessToken");
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });

    if (!token) throw new Error("No auth token found in SW");

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
      body: "Could not process request in the background. Please open the app.",
      icon: DEFAULT_NOTIFICATION_ICON,
    });
  }
}
