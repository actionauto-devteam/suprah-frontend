import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, setCacheNameDetails } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

setCacheNameDetails({
  prefix: "actionauto-v2026-05-29",
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
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
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || self.location.origin
).replace(/\/$/, "");
const DEFAULT_NOTIFICATION_ICON = "/icon-192x192.png";

self.addEventListener("push", (event: any) => {
  if (event.data) {
    try {
      const data = event.data.json();

      // 1. HANDLE SILENT SYNC (DISMISSAL)
      // If the backend says this is a sync action to dismiss, close the notification
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
        image: data.image || undefined, // Rich hero image for marketing
        badge: DEFAULT_NOTIFICATION_ICON,
        tag: data.tag, // Matches the preferenceKey (inventory_update, etc.) for grouping
        data: {
          url: data.data?.url || "/",
          driverRequestId: data.data?.driverRequestId,
        },
        actions: data.actions || [],
        vibrate: [100, 50, 100],
      };

      event.waitUntil(
        (self as any).registration.showNotification(data.title, options),
      );
    } catch (err) {
      console.error("[SW] Push event error:", err);
    }
  }
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const notificationData = event.notification?.data || {};

  // Check if an action was clicked (e.g., Approve/Reject)
  if (event.action) {
    const actionInProgress = handleBackgroundAction(
      event.action,
      notificationData,
    );
    event.waitUntil(actionInProgress);
    return;
  }

  const urlToOpen = new URL(notificationData.url || "/", self.location.origin)
    .href;

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(urlToOpen);
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

  // Follow-up notification for user feedback
  await (self as any).registration.showNotification("Processing Request", {
    body: `Your request to ${action} this driver is being processed...`,
    icon: DEFAULT_NOTIFICATION_ICON,
  });

  try {
    // Read token from IndexedDB
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
      method: "PATCH", // backend uses PATCH for these
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
