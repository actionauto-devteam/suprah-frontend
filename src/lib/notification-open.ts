/**
 * Opens the page's Notifications drawer from anywhere on the page, e.g. the
 * customer Home "View all" (2026-11-13). The notification bell listens for it.
 */
export const OPEN_NOTIFICATIONS_EVENT = "suprah:open-notifications";

export function openNotificationDrawer(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT));
}
